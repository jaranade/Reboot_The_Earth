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
    vpd_kpa: float
    fire_weather_index: float
    risk_level: str


class RecommendationItem(BaseModel):
    rank: int
    action: str
    reason: str
    urgency: str
    time_to_act: str = "as soon as possible"


class NearbyFire(BaseModel):
    latitude: float
    longitude: float
    detection_date: str
    confidence: str
    frp: float


class WeatherAlert(BaseModel):
    event: str
    severity: str
    headline: str
    expires: str


class FireApproachAlert(BaseModel):
    level: str
    distance_km: float
    direction: str
    estimated_hours_to_farm: float
    wind_pushing_toward_farm: bool
    message: str


class RecommendationResponse(BaseModel):
    farm_profile: FarmProfile
    drought_level: str
    ndvi_status: str
    elevation_m: Optional[float]
    risk_trend: str
    fire_approach_alert: Optional[FireApproachAlert]
    weather_alerts: List[WeatherAlert]
    nearby_fires: List[NearbyFire]
    risk_timeline: List[DailyRisk]
    recommendations: List[RecommendationItem]
