import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI

from app.schemas import FarmProfile, DailyRisk, RecommendationItem

load_dotenv()

# picking our open-source model
MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct:featherless-ai"

def build_llm_prompt(
    farm_profile: FarmProfile,
    drought_level: str,
    ndvi_status: str,
    elevation_m: float | None,
    risk_trend: str,
    weather_alerts: list[dict],
    nearby_fires: list[dict],
    risk_timeline: list[DailyRisk],
) -> str:
    risk_data = [item.model_dump() for item in risk_timeline]

    elevation_note = f"{elevation_m:.0f} m above sea level" if elevation_m is not None else "Unknown"

    fire_summary = (
        f"{len(nearby_fires)} active satellite fire detection(s) within ~55 km in the last 24 hours."
        if nearby_fires else "No active fires detected within ~55 km."
    )

    if weather_alerts:
        alert_lines = "\n".join(
            f"- {a['event']} ({a['severity']}): {a['headline']}" for a in weather_alerts
        )
        alert_summary = f"ACTIVE GOVERNMENT WEATHER ALERTS:\n{alert_lines}"
    else:
        alert_summary = "No active government weather alerts for this location."

    peak_days = [d for d in risk_data if d["risk_level"] in ("High", "Extreme")]
    peak_note = (
        f"Peak risk days: {', '.join(d['date'] for d in peak_days)}. Farmer must act BEFORE these dates."
        if peak_days else "No high or extreme risk days forecast."
    )

    return f"""
You are a wildfire risk advisor for farmers. Use ALL data below to generate exactly 3 ranked, forward-looking action recommendations.

Farm profile:
{farm_profile.model_dump_json(indent=2)}

Elevation: {elevation_note}
Drought level: {drought_level}
Vegetation moisture: {ndvi_status}
7-day risk trend: {risk_trend}
Nearby fire activity: {fire_summary}

{alert_summary}

{peak_note}

7-day fire risk timeline:
{json.dumps(risk_data, indent=2)}

Return valid JSON only — no markdown, no text outside the array:
[
  {{
    "rank": 1,
    "action": "most urgent action the farmer should take NOW",
    "reason": "why, referencing specific dates, alerts, drought level, or fire detections",
    "urgency": "high"
  }},
  {{
    "rank": 2,
    "action": "second action",
    "reason": "why this matters based on the data",
    "urgency": "medium"
  }},
  {{
    "rank": 3,
    "action": "third action",
    "reason": "why this matters based on the data",
    "urgency": "low"
  }}
]

Rules:
- JSON only. No markdown. No text outside the array.
- If government alerts are present, the rank-1 action must respond to them directly.
- Reference specific crop type, livestock, peak dates, and any active alerts.
"""


async def generate_llm_recommendations(
    farm_profile: FarmProfile,
    drought_level: str,
    ndvi_status: str,
    elevation_m: float | None,
    risk_trend: str,
    weather_alerts: list[dict],
    nearby_fires: list[dict],
    risk_timeline: list[DailyRisk],
) -> list[RecommendationItem]:

    prompt = build_llm_prompt(
        farm_profile=farm_profile,
        drought_level=drought_level,
        ndvi_status=ndvi_status,
        elevation_m=elevation_m,
        risk_trend=risk_trend,
        weather_alerts=weather_alerts,
        nearby_fires=nearby_fires,
        risk_timeline=risk_timeline,
    )

    client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.environ["HF_TOKEN"],
    )

    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1500,
    )

    raw_text = completion.choices[0].message.content
    print("Raw LLM response:", raw_text)

    parsed_json = parse_llm_to_recommendations(raw_text)
    return [RecommendationItem(**item) for item in parsed_json]


def parse_llm_to_recommendations(text: str) -> list[dict]:
    """Try multiple strategies to extract 3 recommendation dicts from raw LLM text."""

    # Strategy 1: well-formed JSON array
    start = text.find("[")
    end = text.rfind("]") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    # Strategy 2: strip markdown fences then retry
    cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
    start = cleaned.find("[")
    end = cleaned.rfind("]") + 1
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start:end])
        except json.JSONDecodeError:
            pass

    # Strategy 3: partial JSON array — try closing it with common suffixes
    if start != -1:
        partial = cleaned[start:]
        for suffix in (']}', '}]', ']'):
            try:
                result = json.loads(partial + suffix)
                if isinstance(result, list) and len(result) > 0:
                    return result
            except json.JSONDecodeError:
                continue

    # Strategy 4: free-text numbered items  (e.g. "1. Action: ...\nReason: ...\nUrgency: ...")
    urgency_map = {"high": "high", "medium": "medium", "low": "low",
                   "critical": "high", "moderate": "medium", "low-medium": "low"}
    items = re.split(r'\n\s*\d+[\.\)]\s*', text.strip())
    results = []
    for i, block in enumerate(items[1:4], start=1):
        action_m = re.search(r'(?:action|step|recommendation)[:\-]?\s*(.+)', block, re.I)
        reason_m = re.search(r'(?:reason|why|rationale)[:\-]?\s*(.+)', block, re.I)
        urgency_m = re.search(r'(?:urgency|priority)[:\-]?\s*(\w[\w\-]*)', block, re.I)

        action = action_m.group(1).strip() if action_m else block.split('\n')[0].strip()
        reason = reason_m.group(1).strip() if reason_m else "See risk data."
        raw_urg = urgency_m.group(1).lower() if urgency_m else "medium"
        urgency = urgency_map.get(raw_urg, "medium")

        if action:
            results.append({"rank": i, "action": action, "reason": reason, "urgency": urgency})

    if len(results) >= 1:
        return results

    raise ValueError("Could not extract recommendations from LLM response.")

