import math
from typing import List

from app.schemas import DailyRisk


def calculate_simple_fwi(
    temperature_c: float,
    humidity_percent: float,
    wind_kmh: float,
    precipitation_mm: float
) -> float:
    temp_component = max(0, temperature_c - 15) * 0.4
    humidity_component = max(0, 60 - humidity_percent) * 0.3
    wind_component = wind_kmh * 0.3
    rain_penalty = precipitation_mm * 2.0
    score = temp_component + humidity_component + wind_component - rain_penalty
    return round(max(0, min(score, 100)), 2)


def compute_vpd(temperature_c: float, humidity_percent: float) -> float:
    """Vapor Pressure Deficit in kPa. >2.0 = high fire risk, >3.5 = extreme."""
    svp = 0.6108 * math.exp(17.27 * temperature_c / (temperature_c + 237.3))
    return round(svp * (1 - humidity_percent / 100), 2)


def classify_risk(score: float) -> str:
    if score >= 35:
        return "Extreme"
    if score >= 25:
        return "High"
    if score >= 15:
        return "Moderate"
    return "Low"


def build_risk_timeline(weather_data: dict) -> List[DailyRisk]:
    daily = weather_data["daily"]
    timeline = []
    for i, date in enumerate(daily["time"]):
        temp = daily["temperature_2m_max"][i]
        humidity = daily["relative_humidity_2m_min"][i]
        wind = daily["wind_speed_10m_max"][i]
        rain = daily["precipitation_sum"][i]
        fwi = calculate_simple_fwi(temp, humidity, wind, rain)
        timeline.append(DailyRisk(
            date=date,
            temperature_max_c=temp,
            humidity_min_percent=humidity,
            wind_max_kmh=wind,
            precipitation_mm=rain,
            vpd_kpa=compute_vpd(temp, humidity),
            fire_weather_index=fwi,
            risk_level=classify_risk(fwi),
        ))
    return timeline


def compute_risk_trend(timeline: List[DailyRisk]) -> str:
    """Compare first-half vs second-half average FWI to describe the risk trajectory."""
    if len(timeline) < 4:
        return "Insufficient data for trend analysis."
    mid = len(timeline) // 2
    first_avg = sum(d.fire_weather_index for d in timeline[:mid]) / mid
    second_avg = sum(d.fire_weather_index for d in timeline[mid:]) / (len(timeline) - mid)
    delta = second_avg - first_avg
    if delta > 3:
        return f"Worsening — fire risk trending upward (avg FWI rising {delta:.1f} over the week)."
    if delta < -3:
        return f"Improving — fire risk trending downward (avg FWI dropping {abs(delta):.1f} over the week)."
    return f"Stable — fire risk consistent across the 7-day forecast (avg FWI change: {delta:+.1f})."


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _bearing_label(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    dlon = math.radians(lon2 - lon1)
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    x = math.sin(dlon) * math.cos(lat2r)
    y = math.cos(lat1r) * math.sin(lat2r) - math.sin(lat1r) * math.cos(lat2r) * math.cos(dlon)
    bearing = (math.degrees(math.atan2(x, y)) + 360) % 360
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[round(bearing / 45) % 8]


def _wind_blowing_toward_farm(wind_direction_deg: float, fire_bearing_deg: float) -> bool:
    """True when wind is pushing fire in the farm's direction."""
    # wind_direction is where wind comes FROM; fire needs to be upwind
    opposite = (wind_direction_deg + 180) % 360
    diff = abs(opposite - fire_bearing_deg)
    return min(diff, 360 - diff) < 60


def compute_fire_approach_alert(
    farm_lat: float,
    farm_lon: float,
    nearby_fires: list[dict],
    risk_timeline: list[DailyRisk],
    wind_direction_deg: float | None = None,
) -> dict | None:
    if not nearby_fires:
        return None

    # Find closest fire
    closest, min_dist = None, float("inf")
    for fire in nearby_fires:
        dist = _haversine_km(farm_lat, farm_lon, fire["latitude"], fire["longitude"])
        if dist < min_dist:
            min_dist, closest = dist, fire

    if closest is None:
        return None

    direction = _bearing_label(farm_lat, farm_lon, closest["latitude"], closest["longitude"])
    today_risk = risk_timeline[0].risk_level if risk_timeline else "Moderate"

    spread_rate = {"Extreme": 8.0, "High": 5.0, "Moderate": 3.0, "Low": 1.5}.get(today_risk, 3.0)
    hours_est = round(min_dist / spread_rate, 1)

    wind_note = ""
    if wind_direction_deg is not None:
        fire_bear = (math.degrees(math.atan2(
            math.sin(math.radians(closest["longitude"] - farm_lon)) * math.cos(math.radians(closest["latitude"])),
            math.cos(math.radians(farm_lat)) * math.sin(math.radians(closest["latitude"])) -
            math.sin(math.radians(farm_lat)) * math.cos(math.radians(closest["latitude"])) *
            math.cos(math.radians(closest["longitude"] - farm_lon))
        )) + 360) % 360
        if _wind_blowing_toward_farm(wind_direction_deg, fire_bear):
            wind_note = " Wind is currently pushing this fire toward your farm."

    if min_dist <= 15:
        level = "SEVERE"
        message = (
            f"SEVERE: Active fire {min_dist:.1f} km {direction} of your farm.{wind_note} "
            f"At current spread rates fire could reach farm perimeter within ~{hours_est} hours. EVACUATE if advised."
        )
    elif min_dist <= 30:
        level = "WARNING"
        message = (
            f"WARNING: Active fire {min_dist:.1f} km {direction} of your farm.{wind_note} "
            f"Under elevated wind conditions fire could reach farm within ~{hours_est} hours. Prepare now."
        )
    else:
        level = "WATCH"
        message = (
            f"WATCH: Active fire detected {min_dist:.1f} km {direction}.{wind_note} "
            f"Monitor conditions — if winds increase, threat could escalate rapidly."
        )

    return {
        "level": level,
        "distance_km": round(min_dist, 1),
        "direction": direction,
        "estimated_hours_to_farm": hours_est,
        "wind_pushing_toward_farm": wind_note != "",
        "message": message,
    }
