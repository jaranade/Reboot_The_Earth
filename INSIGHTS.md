# How FarmTAP's AI Insights Help Farmers

## The Problem with Generic Fire Alerts

Traditional fire alerts tell farmers that a Red Flag Warning is active. That's useful, but it doesn't answer the question a farmer actually needs answered:

> *"What should I do right now, on my specific farm, with my specific crops, before the worst day of this week?"*

A wheat farmer in harvest season and a cattle rancher face completely different risks under the same weather conditions. FarmTAP closes that gap.

---

## What Makes the Insights Useful

### 1. Multi-Source Data Fusion

FarmTAP doesn't rely on a single data feed. Every recommendation is built from six real-time sources pulled in parallel:

| Source | What it provides |
|--------|-----------------|
| **Open-Meteo** | 7-day forecast: temperature, humidity, wind speed & direction |
| **Open-Meteo (soil moisture)** | Real sensor-based drought classification and NDVI proxy |
| **NASA FIRMS VIIRS** | Satellite-detected active fires within 55 km, updated every ~3 hours |
| **NOAA Weather Alerts** | Live government warnings: Red Flag Warnings, Heat Advisories, Fire Weather Watches |
| **Open-Elevation** | Terrain elevation — fire spreads faster uphill |
| **Computed: VPD** | Vapor Pressure Deficit from temp + humidity — the single best vegetation ignition predictor |

No single alert service combines all of these. FarmTAP does it automatically for any location.

---

### 2. The Fire Weather Index Is Computed Per Farm

Each day in the 7-day timeline gets a Fire Weather Index (FWI) score calculated from that farm's actual forecast data — not a regional average. The score drives the colour-coded chart and tells the LLM exactly which days are peak-risk days.

The model is then told: *"Act BEFORE these dates."* This shifts the advice from reactive to predictive.

---

### 3. VPD Tells You When Vegetation Is About to Ignite

Relative humidity alone is a weak predictor of fire behaviour. Vapor Pressure Deficit (VPD) accounts for both temperature and humidity together and measures how aggressively the atmosphere is pulling moisture from plants.

| VPD (kPa) | Interpretation |
|-----------|---------------|
| < 1.0 | Low stress — vegetation retains moisture |
| 1.0 – 2.0 | Moderate drying stress |
| 2.0 – 3.5 | High stress — fine fuels becoming receptive to ignition |
| > 3.5 | Extreme — vegetation ignites from a single spark |

When VPD peaks above 2.0 kPa during a High-risk FWI day, the LLM is explicitly told about it and asked to cite it in its reasoning.

---

### 4. Recommendations Are Crop-Specific

The LLM is given a knowledge block about the specific crop before generating recommendations. Examples:

- **Almonds**: Hull split season (Jul–Sep) leaves highly flammable debris. Drip irrigation lines melt and cut off water supply.
- **Grapes**: Smoke taint from nearby fires damages wine quality even without direct fire contact — early harvest decisions matter.
- **Hay**: Among the fastest-spreading fire fuels. Baled hay near structures is an extreme structural hazard.
- **Cattle**: Livestock evacuation is time-critical and requires trailer coordination with 48-hour lead time.

Generic fire advice ignores all of this. FarmTAP's recommendations are framed around what the specific crop *loses* in a fire scenario.

---

### 5. The Fire Approach Alert

When NASA FIRMS detects an active fire within 55 km:

1. FarmTAP computes the exact distance (km) and compass direction from the farm
2. It checks whether today's wind is blowing from the fire toward the farm
3. It estimates hours-to-farm-perimeter based on current risk level and typical chaparral spread rates

This produces three alert levels:

| Level | Distance | Action |
|-------|----------|--------|
| 🟡 WATCH | > 30 km | Monitor conditions |
| 🟠 WARNING | 15–30 km | Prepare now |
| 🔴 SEVERE | < 15 km | Immediate action / prepare to evacuate |

The rank-1 recommendation automatically responds to whichever alert level is active.

---

### 6. Government Alerts Anchor the Recommendations

When NOAA issues a Red Flag Warning or Heat Advisory, the LLM is instructed that its highest-priority recommendation must directly address that alert. This creates traceability — every recommendation can be traced back to a specific data signal, not just a model's judgment.

---

## Why This Matters for Farmers

A farmer checking FarmTAP at 6am on a High-risk day sees:

- **Which specific days** are most dangerous (not just "elevated risk this week")
- **Whether there is already a fire moving toward them** and from which direction
- **Whether government agencies have issued warnings** for their exact location
- **What to do first**, framed around their crop type, not a generic checklist
- **When to act** — every recommendation includes a `time_to_act` deadline

This is the difference between a weather alert and a farm-specific action plan.

---

## Validating the Data

All data sources used by FarmTAP are public, citable, and independently verifiable:

- **Fire detections**: Cross-reference at [NASA FIRMS Fire Map](https://firms.modaps.eosdis.nasa.gov/map/) — search by date and coordinates
- **Drought classification**: [US Drought Monitor](https://droughtmonitor.unl.edu/) — enter location to see current D0–D4 status
- **Weather alerts**: [weather.gov](https://www.weather.gov) — enter zip code to see active alerts
- **Weather forecast**: [open-meteo.com](https://open-meteo.com) — open source, verifiable API
