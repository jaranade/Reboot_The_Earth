# FireSight — Wildfire Risk Intelligence for Farmers

A real-time wildfire risk assessment tool that fuses satellite fire data, government weather alerts, live environmental sensor readings, and a large language model to give farmers specific, actionable recommendations before a fire threatens their land.

Built for the San Diego UN Hackathon 2025 — Reboot The Earth.

---

## What It Does

A farmer opens FireSight, draws a circle around their farm on a satellite map, fills in a short survey (crops, livestock, irrigation, structures), and submits. Within seconds they receive:

- A **7-day fire weather forecast** colour-coded by risk level
- The **drought classification** for their exact location, derived from real soil moisture sensor data
- **Active satellite fire detections** within 55 km, with distance, bearing, and estimated hours to farm perimeter
- **Live government weather alerts** (Red Flag Warnings, Heat Advisories) from NOAA for their coordinates
- **3 ranked recommendations** from an AI risk assessor, each with plain-English reasoning, specific dates, and a "what happens if ignored" consequence — no jargon

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (React)                     │
│  Leaflet map → FarmerSurvey form → DetailPane results  │
└──────────────────────┬──────────────────────────────────┘
                       │ POST /api/recommendations
                       ▼
┌─────────────────────────────────────────────────────────┐
│               BACKEND (FastAPI / Python)                │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ weather.py  │  │environmental │  │  fire_index   │ │
│  │ Open-Meteo  │  │    .py       │  │     .py       │ │
│  │  forecast   │  │ soil moisture│  │ FWI + VPD +   │ │
│  │ + wind dir  │  │ NOAA alerts  │  │ risk trend +  │ │
│  └──────┬──────┘  │ NASA FIRMS   │  │ fire approach │ │
│         │         │ Open-Elev    │  │   alert       │ │
│         │         └──────┬───────┘  └───────┬───────┘ │
│         └────────────────┼──────────────────┘         │
│                          ▼                              │
│              ┌───────────────────┐                     │
│              │   llm_service.py  │                     │
│              │  Llama 3 8B via   │                     │
│              │  HuggingFace      │                     │
│              └───────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Purpose | Licence |
|-----------|---------|---------|
| [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | UI framework | MIT |
| [Vite](https://vitejs.dev) | Build tool and dev server | MIT |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling | MIT |
| [react-leaflet](https://react-leaflet.js.org) + [Leaflet](https://leafletjs.com) | Interactive satellite map | BSD-2 |
| [Recharts](https://recharts.org) | 7-day FWI bar chart | MIT |
| [lucide-react](https://lucide.dev) | Icon set | ISC |
| [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap) | Forward and reverse geocoding | ODbL |

### Backend

| Technology | Purpose | Licence |
|-----------|---------|---------|
| [FastAPI](https://fastapi.tiangolo.com) | REST API framework | MIT |
| [Pydantic v2](https://docs.pydantic.dev) | Request/response schema validation | MIT |
| [httpx](https://www.python-httpx.org) | Async HTTP client for API calls | BSD-3 |
| [python-dotenv](https://github.com/theskumar/python-dotenv) | Environment variable management | BSD-3 |
| [uvicorn](https://www.uvicorn.org) | ASGI server | BSD-3 |

### AI / LLM

| Technology | Purpose | Licence |
|-----------|---------|---------|
| [Meta Llama 3 8B Instruct](https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct) | Generates farm-specific recommendations | Meta Llama 3 Community Licence (free) |
| [HuggingFace Inference Router](https://huggingface.co/docs/api-inference) | Hosts and serves the open-source model | — |
| [OpenAI-compatible API](https://platform.openai.com/docs) | Standard chat completions interface | — |

---

## Data Sources

All data sources used by FireSight are **free, open, and publicly accessible**. No paid APIs.

| Source | Data Provided | Auth Required |
|--------|--------------|---------------|
| [Open-Meteo](https://open-meteo.com) | 7-day weather forecast (temperature, humidity, wind speed and direction, precipitation) + hourly soil moisture | None |
| [NASA FIRMS VIIRS](https://firms.modaps.eosdis.nasa.gov) | Near-real-time satellite fire detections (~3h delay) within 55 km of the farm. FRP (Fire Radiative Power) in megawatts per detection | Free key (instant) |
| [NOAA Weather Alerts](https://www.weather.gov/documentation/services-web-api) (api.weather.gov) | Active government alerts for the farm's coordinates: Red Flag Warnings, Fire Weather Watches, Heat Advisories | None |
| [Open-Elevation](https://open-elevation.com) | Terrain elevation in metres for the farm location | None |
| [Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap) | Converts map coordinates → address and address → coordinates | None |

### Derived / Computed Data (no external API)

| Signal | How It Is Computed |
|--------|-------------------|
| **Fire Weather Index (FWI)** | Custom formula: `(temp − 15) × 0.4 + (60 − humidity) × 0.3 + wind × 0.3 − rain × 2`. Scaled 0–100 |
| **Vapor Pressure Deficit (VPD)** | `SVP × (1 − RH/100)` where `SVP = 0.6108 × exp(17.27 × T / (T + 237.3))`. The single best predictor of vegetation ignition risk. >2.0 kPa = high, >3.5 kPa = extreme |
| **Drought level** | Classified from Open-Meteo soil moisture: <0.05 m³/m³ = D4 Exceptional, <0.10 = D3 Extreme, <0.15 = D2 Severe, <0.25 = D1 Moderate, <0.35 = D0 Abnormally Dry |
| **NDVI proxy (vegetation moisture)** | Derived from same Open-Meteo soil moisture reading |
| **Risk trend** | Compares average FWI of first 3 days vs last 3 days in the 7-day window |
| **Fire approach alert** | Haversine distance from farm to each detected fire + wind direction check to determine if fire is upwind. Classified as WATCH (>30 km), WARNING (15–30 km), SEVERE (<15 km) |

---

## How the AI Recommendations Work

Every recommendation is generated by Llama 3 8B with a system prompt that enforces:

1. **No generic advice** — every action must reference a specific date, measurement, distance, or alert from the live data
2. **Plain-English explanations** — technical terms (VPD, FWI, FRP, drought categories) are always explained inline for farmers with no meteorology background
3. **Crop-specific context** — the model receives a knowledge block about the specific crop's fire vulnerabilities (e.g. almond hull split debris, smoke taint risk for grapes, hay spread rates)
4. **Consequence framing** — each recommendation includes what specifically happens to the crop, livestock, or structures if the action is ignored
5. **Time-to-act deadlines** — every recommendation includes "within X hours / before [date]" derived from peak risk days in the forecast

The model is given: farm survey data, drought level, NDVI status, VPD peak, elevation, wind direction, active government alerts, satellite fire detections with distance and bearing, and the full 7-day FWI timeline.

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [HuggingFace](https://huggingface.co) access token
- A free [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/) API key

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1
# Mac / Linux
source .venv/bin/activate

pip install -r requirements.txt

# Create .env file
echo "HF_TOKEN=your-huggingface-token" > .env
echo "FIRMS_API_KEY=your-firms-key" >> .env

uvicorn app.main:app --reload
```

API available at `http://127.0.0.1:8000` — Swagger UI at `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`

The frontend proxies `/api/*` to the backend automatically (configured in `vite.config.ts`).

---

## API Reference

### `POST /recommendations`

Accepts a farm profile and returns a full risk assessment.

**Request body:**
```json
{
  "location_name": "Chappellet Winery, St Helena CA",
  "latitude": 38.4804,
  "longitude": -122.3334,
  "crop_type": "grapes",
  "livestock": false,
  "acres": 85,
  "farm_context": "Optional: full survey text from the form"
}
```

**Response fields:**

| Field | Description |
|-------|-------------|
| `drought_level` | D0–D4 classification from soil moisture |
| `ndvi_status` | Vegetation moisture status |
| `elevation_m` | Metres above sea level |
| `risk_trend` | Whether risk is worsening, improving, or stable over 7 days |
| `fire_approach_alert` | `null` or `{ level, distance_km, direction, estimated_hours_to_farm, message }` |
| `weather_alerts` | Active NOAA alerts for the location |
| `nearby_fires` | NASA FIRMS detections with lat/lon, FRP, and detection date |
| `risk_timeline` | 7-day array with FWI, VPD, risk level, and weather per day |
| `recommendations` | 3 ranked actions with `reason`, `consequences`, `urgency`, and `time_to_act` |

### `GET /recommendations/demo`

Returns a pre-populated response for a Riverside County almond farm. Useful for frontend testing without filling the survey.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, route handlers, orchestration
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── weather.py        # Open-Meteo forecast + wind direction
│   │   ├── environmental.py  # Soil moisture, NASA FIRMS, NOAA alerts, elevation
│   │   ├── fire_index.py     # FWI, VPD, risk trend, fire approach alert
│   │   └── llm_service.py    # Prompt builder, Llama 3 API call, JSON parser
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main layout, geocoding, API call
│   │   ├── components/
│   │   │   ├── DetailPane.tsx         # Results view (alerts, chart, recommendations)
│   │   │   ├── FarmerSurvey.tsx       # Input form
│   │   │   ├── MapPane.tsx            # Leaflet map with farm circle + fire markers
│   │   │   ├── EnvConditionsBar.tsx   # Top bar (wind, humidity, temperature)
│   │   │   └── TopBar.tsx             # App header
│   │   ├── utils/formatSurvey.ts      # Converts survey answers to LLM-readable text
│   │   └── mockData.ts                # Example farm profiles for demo
│   └── vite.config.ts
├── INSIGHTS.md    # Explanation of how the AI insights work and how to validate them
└── README.md
```
