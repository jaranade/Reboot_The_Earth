import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import FarmProfile, NearbyFire, WeatherAlert, FireApproachAlert, RecommendationResponse
from app.weather import fetch_weather
from app.fire_index import build_risk_timeline, compute_risk_trend, compute_fire_approach_alert
from app.llm_service import generate_llm_recommendations
from app.environmental import (
    fetch_environmental_conditions,
    fetch_nearby_fires,
    fetch_elevation,
    fetch_weather_alerts,
)


app = FastAPI(
    title="Farm Fire Risk Advisor API",
    version="0.6.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Farm Fire Risk Advisor API is running"}


@app.get("/recommendations/demo", response_model=RecommendationResponse)
async def get_demo_recommendations():
    demo_profile = FarmProfile(
        location_name="Riverside County, CA",
        latitude=33.9533,
        longitude=-117.3962,
        crop_type="almonds",
        livestock=False,
        acres=40
    )
    return await generate_recommendations(demo_profile)


@app.post("/recommendations", response_model=RecommendationResponse)
async def create_recommendations(farm_profile: FarmProfile):
    return await generate_recommendations(farm_profile)


async def generate_recommendations(farm_profile: FarmProfile) -> RecommendationResponse:
    lat, lon = farm_profile.latitude, farm_profile.longitude

    weather_data, env_conditions, fires_raw, elevation_m, alerts_raw = await asyncio.gather(
        fetch_weather(lat, lon),
        fetch_environmental_conditions(lat, lon),
        fetch_nearby_fires(lat, lon),
        fetch_elevation(lat, lon),
        fetch_weather_alerts(lat, lon),
    )

    risk_timeline = build_risk_timeline(weather_data)
    risk_trend = compute_risk_trend(risk_timeline)
    drought_level = env_conditions["drought_level"]
    ndvi_status = env_conditions["ndvi_status"]
    nearby_fires = [NearbyFire(**f) for f in fires_raw]
    weather_alerts = [WeatherAlert(**a) for a in alerts_raw]

    # Wind direction for today (first day in forecast)
    wind_direction_deg = None
    daily = weather_data.get("daily", {})
    wind_dirs = daily.get("wind_direction_10m_dominant", [])
    if wind_dirs:
        wind_direction_deg = wind_dirs[0]

    alert_dict = compute_fire_approach_alert(lat, lon, fires_raw, risk_timeline, wind_direction_deg)
    fire_approach_alert = FireApproachAlert(**alert_dict) if alert_dict else None

    recommendations = await generate_llm_recommendations(
        farm_profile=farm_profile,
        drought_level=drought_level,
        ndvi_status=ndvi_status,
        elevation_m=elevation_m,
        risk_trend=risk_trend,
        weather_alerts=alerts_raw,
        nearby_fires=fires_raw,
        fire_approach_alert=alert_dict,
        wind_direction_deg=wind_direction_deg,
        risk_timeline=risk_timeline,
    )

    return RecommendationResponse(
        farm_profile=farm_profile,
        drought_level=drought_level,
        ndvi_status=ndvi_status,
        elevation_m=elevation_m,
        risk_trend=risk_trend,
        fire_approach_alert=fire_approach_alert,
        weather_alerts=weather_alerts,
        nearby_fires=nearby_fires,
        risk_timeline=risk_timeline,
        recommendations=recommendations,
    )
