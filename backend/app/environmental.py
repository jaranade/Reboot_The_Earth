import csv
import io
import os
from typing import List, Optional

import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"


async def fetch_environmental_conditions(latitude: float, longitude: float) -> dict:
    """
    Single Open-Meteo call for soil moisture.
    Returns both ndvi_status and drought_level derived from real sensor data.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "soil_moisture_0_to_1cm,soil_moisture_1_to_3cm",
        "forecast_days": 1,
        "timezone": "auto",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        hourly = data["hourly"]
        surface = [v for v in hourly.get("soil_moisture_0_to_1cm", []) if v is not None]
        shallow = [v for v in hourly.get("soil_moisture_1_to_3cm", []) if v is not None]
        combined = surface + shallow
        avg = sum(combined) / len(combined) if combined else None
        print(f"Soil moisture avg: {avg}")
    except Exception as e:
        print(f"Environmental conditions fetch error: {e}")
        avg = None

    return {
        "ndvi_status": _classify_ndvi(avg),
        "drought_level": _classify_drought(avg),
    }


def _classify_ndvi(soil_moisture: Optional[float]) -> str:
    if soil_moisture is None:
        return "Vegetation moisture data unavailable"
    if soil_moisture < 0.05:
        return "Critically low vegetation moisture"
    if soil_moisture < 0.15:
        return "Low vegetation moisture"
    if soil_moisture < 0.30:
        return "Moderate vegetation moisture"
    return "Adequate vegetation moisture"


def _classify_drought(soil_moisture: Optional[float]) -> str:
    if soil_moisture is None:
        return "Drought data unavailable"
    if soil_moisture < 0.05:
        return "D4 - Exceptional Drought"
    if soil_moisture < 0.10:
        return "D3 - Extreme Drought"
    if soil_moisture < 0.15:
        return "D2 - Severe Drought"
    if soil_moisture < 0.25:
        return "D1 - Moderate Drought"
    if soil_moisture < 0.35:
        return "D0 - Abnormally Dry"
    return "No Drought Conditions"


async def fetch_nearby_fires(latitude: float, longitude: float, days: int = 1) -> List[dict]:
    """
    NASA FIRMS VIIRS active fire detections within ~55 km of the farm.
    Requires FIRMS_API_KEY in environment.
    """
    api_key = os.environ.get("FIRMS_API_KEY")
    if not api_key:
        return []

    margin = 0.5  # ~55 km
    bbox = (
        f"{round(longitude - margin, 4)},"
        f"{round(latitude - margin, 4)},"
        f"{round(longitude + margin, 4)},"
        f"{round(latitude + margin, 4)}"
    )
    url = f"{FIRMS_URL}/{api_key}/VIIRS_SNPP_NRT/{bbox}/{days}"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            text = resp.text

        fires = []
        for row in csv.DictReader(io.StringIO(text)):
            try:
                fires.append({
                    "latitude": float(row["latitude"]),
                    "longitude": float(row["longitude"]),
                    "detection_date": row.get("acq_date", ""),
                    "confidence": row.get("confidence", ""),
                    "frp": float(row.get("frp", 0)),
                })
            except (KeyError, ValueError):
                continue
        return fires
    except Exception:
        return []


async def fetch_elevation(latitude: float, longitude: float) -> Optional[float]:
    """Open-Elevation API — free, no auth required."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                OPEN_ELEVATION_URL,
                params={"locations": f"{latitude},{longitude}"},
            )
            resp.raise_for_status()
            data = resp.json()
        return data["results"][0]["elevation"]
    except Exception:
        return None


async def fetch_weather_alerts(latitude: float, longitude: float) -> List[dict]:
    """
    NOAA Weather Alerts API — free, no auth required.
    Returns active alerts including Red Flag Warnings and Fire Weather Watches.
    """
    url = "https://api.weather.gov/alerts/active"
    params = {"point": f"{latitude},{longitude}"}
    headers = {"User-Agent": "FarmFireAdvisor/1.0 (hackathon project)"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        alerts = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            alerts.append({
                "event": props.get("event", ""),
                "severity": props.get("severity", ""),
                "headline": props.get("headline", ""),
                "expires": props.get("expires", ""),
            })
        print(f"NOAA alerts: {[a['event'] for a in alerts]}")
        return alerts
    except Exception as e:
        print(f"NOAA alerts fetch error: {e}")
        return []
