from app.schemas import DailyRisk


def calculate_simple_fwi(
    temperature_c: float,
    humidity_percent: float,
    wind_kmh: float,
    precipitation_mm: float
) -> float:
    """
    Hackathon-safe simple fire-weather score.
    Higher temp + wind increase score.
    Higher humidity + rain reduce score.
    """

    temp_component = max(0, temperature_c - 15) * 0.4
    humidity_component = max(0, 60 - humidity_percent) * 0.3
    wind_component = wind_kmh * 0.3
    rain_penalty = precipitation_mm * 2.0

    score = temp_component + humidity_component + wind_component - rain_penalty

    return round(max(0, min(score, 100)), 2)


def classify_risk(score: float) -> str:
    if score >= 35:
        return "Extreme"
    if score >= 25:
        return "High"
    if score >= 15:
        return "Moderate"
    return "Low"


def build_risk_timeline(weather_data: dict) -> list[DailyRisk]:
    daily = weather_data["daily"]

    timeline = []

    for i, date in enumerate(daily["time"]):
        temp = daily["temperature_2m_max"][i]
        humidity = daily["relative_humidity_2m_min"][i]
        wind = daily["wind_speed_10m_max"][i]
        rain = daily["precipitation_sum"][i]

        fwi = calculate_simple_fwi(temp, humidity, wind, rain)

        timeline.append(
            DailyRisk(
                date=date,
                temperature_max_c=temp,
                humidity_min_percent=humidity,
                wind_max_kmh=wind,
                precipitation_mm=rain,
                fire_weather_index=fwi,
                risk_level=classify_risk(fwi)
            )
        )

    return timeline