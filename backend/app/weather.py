import httpx


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": ",".join([
            "temperature_2m_max",
            "relative_humidity_2m_min",
            "wind_speed_10m_max",
            "precipitation_sum",
        ]),
        "forecast_days": 7,
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        return response.json()