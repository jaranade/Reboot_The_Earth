from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import FarmProfile, RecommendationResponse
from app.weather import fetch_weather
from app.fire_index import build_risk_timeline


app = FastAPI(
    title="Farm Fire Risk Advisor API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


HERO_PROFILE = FarmProfile(
    location_name="Riverside County, CA",
    latitude=33.9533,
    longitude=-117.3962,
    crop_type="almonds",
    livestock=False,
    acres=40
)


@app.get("/")
def root():
    return {"message": "Farm Fire Risk Advisor API is running"}


@app.get("/recommendations", response_model=RecommendationResponse)
async def get_recommendations():
    weather_data = await fetch_weather(
        HERO_PROFILE.latitude,
        HERO_PROFILE.longitude
    )

    risk_timeline = build_risk_timeline(weather_data)

    return RecommendationResponse(
        farm_profile=HERO_PROFILE,
        drought_level="D2 - Severe Drought",
        ndvi_status="Low vegetation moisture",
        risk_timeline=risk_timeline,
        recommendations=[
            {
                "rank": 1,
                "action": "Irrigate perimeter zones before the highest-risk wind day.",
                "reason": "Low humidity and high wind increase fire spread risk near dry vegetation.",
                "urgency": "high"
            },
            {
                "rank": 2,
                "action": "Clear dry grass and debris around equipment storage areas.",
                "reason": "Almond farms often have ignition risk near machinery and storage zones.",
                "urgency": "high"
            },
            {
                "rank": 3,
                "action": "Avoid running spark-producing equipment during afternoon peak wind hours.",
                "reason": "Fire risk is higher when temperature and wind are elevated.",
                "urgency": "medium"
            }
        ]
    )