from pydantic import BaseModel, Field
from typing import List, Optional


class FarmProfile(BaseModel):
    location_name: str = Field(example="Riverside County, CA")
    latitude: float = Field(example=33.9533)
    longitude: float = Field(example=-117.3962)
    crop_type: str = Field(example="almonds")
    livestock: bool = Field(example=False)
    acres: Optional[float] = Field(default=None, example=40)


class DailyRisk(BaseModel):
    date: str
    temperature_max_c: float
    humidity_min_percent: float
    wind_max_kmh: float
    precipitation_mm: float
    fire_weather_index: float
    risk_level: str


class RecommendationItem(BaseModel):
    rank: int
    action: str
    reason: str
    urgency: str


class RecommendationResponse(BaseModel):
    farm_profile: FarmProfile
    drought_level: str
    ndvi_status: str
    risk_timeline: List[DailyRisk]
    recommendations: List[RecommendationItem]