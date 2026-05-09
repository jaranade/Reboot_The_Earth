# Reboot The Earth — Farm Fire Risk Advisor

A tool that gives farmers real-time wildfire risk assessments and ranked action recommendations based on live weather data, drought conditions, and vegetation status.

---

## How it works

1. Submit a farm profile (location, crop type, acreage, livestock)
2. The backend fetches a 7-day weather forecast from Open-Meteo (no API key needed)
3. A fire weather index is calculated for each day using temperature, humidity, wind, and precipitation
4. A language model (Llama 3 8B via Hugging Face) generates 3 prioritised recommendations tailored to your farm

---

## Running the backend

### Prerequisites

- Python 3.11+
- A Hugging Face access token (free at huggingface.co)

### Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# Mac / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Start the server

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`

Interactive docs (Swagger UI): `http://127.0.0.1:8000/docs`

---

## API endpoints

| Method | Endpoint                | Description                                |
| ------ | ----------------------- | ------------------------------------------ |
| GET    | `/`                     | Health check                               |
| GET    | `/recommendations/demo` | Demo response for Riverside County almond farm |
| POST   | `/recommendations`      | Generate recommendations from a farm profile |

### `POST /recommendations` — example request

```json
{
  "location_name": "Riverside County, CA",
  "latitude": 33.9533,
  "longitude": -117.3962,
  "crop_type": "almonds",
  "livestock": false,
  "acres": 40
}
```

**Response includes:**
- `drought_level` — current drought classification
- `ndvi_status` — vegetation moisture status
- `risk_timeline` — 7-day fire weather index with risk level per day
- `recommendations` — 3 ranked actions with urgency levels (high / medium / low)

---

## Environment variable

The Hugging Face token is set in `backend/app/llm_service.py`. To use your own token, replace the value there or create a `backend/.env` file:

```
HF_TOKEN=your-token-here
```

---

## Project structure

```
backend/
  app/
    main.py          # FastAPI app and route handlers
    weather.py       # Fetches 7-day forecast from Open-Meteo
    fire_index.py    # Calculates fire weather index per day
    llm_service.py   # Builds prompt and calls the LLM
    schemas.py       # Pydantic request/response models
  requirements.txt
```
