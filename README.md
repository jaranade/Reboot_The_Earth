# Reboot_The_Earth
Farm Fire Risk Advisor API
Backend service for the Farm Fire Risk Advisor hackathon project.
This API ingests live environmental data, computes fire-risk indicators, and returns structured recommendations for farms based on weather conditions and farm profiles.

Features Implemented:
- FastAPI Backend
- Built using FastAPI
Interactive Swagger API documentation available at: /docs

Farm Profile Input Schema

Structured farm profile validation using Pydantic models.

Supported fields:

Location name
Latitude / Longitude
Crop type
Livestock presence
Acreage

Example request:

{
  "location_name": "Riverside County, CA",
  "latitude": 33.9533,
  "longitude": -117.3962,
  "crop_type": "almonds",
  "livestock": false,
  "acres": 40
}
Live Weather Data Integration

Integrated with the Open-Meteo API to fetch:

7-day weather forecast
Maximum daily temperature
Minimum humidity
Wind speed
Daily precipitation

No API key required.

Farm Profile Input Schema

Structured farm profile validation using Pydantic models.

Supported fields:

Location name
Latitude / Longitude
Crop type
Livestock presence
Acreage

Example request:

{
  "location_name": "Riverside County, CA",
  "latitude": 33.9533,
  "longitude": -117.3962,
  "crop_type": "almonds",
  "livestock": false,
  "acres": 40
}
Live Weather Data Integration

Integrated with the Open-Meteo API to fetch:

7-day weather forecast
Maximum daily temperature
Minimum humidity
Wind speed
Daily precipitation

No API key required.

Fire Weather Risk Computation

Implemented a simplified Fire Weather Index calculation using:

Temperature
Humidity
Wind speed
Precipitation

Outputs:

Numerical fire weather index
Risk classification:
Low
Moderate
High
Extreme
Dynamic Recommendation Endpoint
POST /recommendations

Accepts a farm profile and returns:

Risk timeline
Fire weather metrics
Operational safety recommendations

Example response includes:

7-day risk forecast
Fire risk classification
Ranked recommendation checklist
Demo Endpoint
GET /recommendations/demo

Returns a hardcoded Riverside County almond farm example for quick frontend integration and testing.

Project Structure
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── schemas.py
│   ├── weather.py
│   └── fire_index.py
│
├── requirements.txt
└── test_weather.py
Running the Backend
Create virtual environment
python -m venv .venv
Activate environment
Windows
.venv\Scripts\Activate.ps1
Mac/Linux
source .venv/bin/activate
Install dependencies
pip install -r requirements.txt
Start FastAPI server
uvicorn app.main:app --reload

| Method | Endpoint                | Description                                |
| ------ | ----------------------- | ------------------------------------------ |
| GET    | `/`                     | Health check                               |
| GET    | `/recommendations/demo` | Demo recommendation response               |
| POST   | `/recommendations`      | Generate recommendations from farm profile |


