from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import FarmProfile, RecommendationResponse
from app.weather import fetch_weather
from app.fire_index import build_risk_timeline


app = FastAPI(
    title="Farm Fire Risk Advisor API",
    version="0.2.0"
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
    weather_data = await fetch_weather(
        farm_profile.latitude,
        farm_profile.longitude
    )

    risk_timeline = build_risk_timeline(weather_data)

    return RecommendationResponse(
        farm_profile=farm_profile,
        drought_level="D2 - Severe Drought",
        ndvi_status="Low vegetation moisture",
        risk_timeline=risk_timeline,
        recommendations=[
            {
                "rank": 1,
                "action": f"Inspect and clear dry vegetation around {farm_profile.crop_type} growing areas.",
                "reason": "Dry vegetation near crop rows can increase ignition and fire spread risk.",
                "urgency": "high"
            },
            {
                "rank": 2,
                "action": "Avoid operating spark-producing machinery during the hottest and windiest hours.",
                "reason": "High wind and low humidity can make small ignitions spread quickly.",
                "urgency": "high"
            },
            {
                "rank": 3,
                "action": "Prepare irrigation, water access points, and emergency contact procedures.",
                "reason": "Prepared water access can reduce response time during elevated fire conditions.",
                "urgency": "medium"
            }
        ]
    )