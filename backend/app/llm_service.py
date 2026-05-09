import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI

from app.schemas import FarmProfile, DailyRisk, RecommendationItem

load_dotenv()

MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct:featherless-ai"

SYSTEM_PROMPT = """You are a Certified Wildfire Risk Assessor with 20 years of experience advising farms in fire-prone regions.

Your job is to generate specific, actionable recommendations based on real environmental data.

Rules you must follow:
- NEVER give generic advice like "clear vegetation" or "develop an evacuation plan" without tying it to a specific date, measurement, or alert in the data.
- ALWAYS reference specific numbers: exact dates, FWI scores, distances to fires, VPD values, drought levels.
- ALWAYS prioritise around the peak risk dates — tell the farmer exactly when to act.
- If a government weather alert (Red Flag Warning, Heat Advisory) is active, rank-1 must directly respond to it.
- If fires are detected nearby, include distance and direction in the action.
- Recommendations must be specific to the crop type and livestock status.
- Return valid JSON only — no markdown, no explanation outside the array."""

CROP_CONTEXT = {
    "almonds": "Almond orchards: hull split season (Jul–Sep) leaves highly flammable debris. Drip irrigation lines melt under fire and cut off water supply. Windrow burning is a major ignition source. Nuts on the ground are a fuel bed.",
    "grapes": "Vineyards: dry vine canes and trellis wires conduct heat. Leaf litter burns rapidly between rows. Harvest equipment sparks are a real ignition risk during dry conditions. Smoke exposure damages wine quality even without direct fire.",
    "hay": "Hay fields: among the highest fire spread risk of any crop — dry hay burns at 5–8 km/h. Baled hay stored near structures is an extreme hazard. Harvesting equipment is a leading ignition source.",
    "wheat": "Wheat: extremely flammable when ripe and dry. Combines can ignite fires via sparks. Large open acreage allows unchecked fire spread.",
    "corn": "Corn: standing dry stalks burn readily and block visibility for evacuation. Large open fields allow fast fire spread.",
    "avocado": "Avocado orchards: dense canopy traps embers. Heavily irrigation-dependent — loss of water supply during fire is critical. Slope-planted orchards accelerate uphill fire spread.",
    "citrus": "Citrus: irrigation-dependent. Smoke and heat cause fruit drop and skin damage even without direct fire. Plastic irrigation lines are a fire hazard.",
    "cattle": "Cattle/livestock: evacuation of animals is time-critical and requires trailer access routes. Water troughs can act as emergency firebreaks. Pasture fires spread at 5+ km/h.",
    "sheep": "Sheep: highly vulnerable to smoke inhalation. Require secured pens during nearby fire events. Wool is flammable — avoid crowding near structures.",
}


def _get_crop_context(crop_type: str) -> str:
    key = crop_type.lower().strip()
    for k, v in CROP_CONTEXT.items():
        if k in key or key in k:
            return v
    return f"{crop_type.capitalize()}: ensure all irrigation infrastructure and stored equipment are protected from fire approach."


def _wind_label(degrees: float | None) -> str:
    if degrees is None:
        return "unknown direction"
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return f"from the {dirs[round(degrees / 45) % 8]} ({degrees:.0f}°)"


def build_llm_prompt(
    farm_profile: FarmProfile,
    drought_level: str,
    ndvi_status: str,
    elevation_m: float | None,
    risk_trend: str,
    weather_alerts: list[dict],
    nearby_fires: list[dict],
    fire_approach_alert: dict | None,
    wind_direction_deg: float | None,
    risk_timeline: list[DailyRisk],
) -> str:
    risk_data = [item.model_dump() for item in risk_timeline]

    peak_days = [d for d in risk_data if d["risk_level"] in ("High", "Extreme")]
    peak_note = (
        f"PEAK RISK DAYS: {', '.join(d['date'] for d in peak_days)} — farmer must act BEFORE these dates."
        if peak_days else "No high or extreme risk days in this forecast window."
    )

    max_vpd = max((d["vpd_kpa"] for d in risk_data), default=0)
    vpd_note = f"Peak VPD this week: {max_vpd} kPa"
    if max_vpd >= 3.5:
        vpd_note += " (EXTREME — vegetation at critical ignition risk)"
    elif max_vpd >= 2.0:
        vpd_note += " (HIGH — dry vegetation stress)"
    else:
        vpd_note += " (moderate)"

    elevation_note = f"{elevation_m:.0f} m" if elevation_m is not None else "unknown"
    wind_note = _wind_label(wind_direction_deg)

    if fire_approach_alert:
        fire_alert_section = f"""
⚠️ FIRE APPROACH ALERT — {fire_approach_alert['level']}
{fire_approach_alert['message']}
"""
    else:
        fire_alert_section = "No imminent fire approach detected."

    if weather_alerts:
        alert_lines = "\n".join(
            f"  - {a['event']} ({a['severity']}): {a['headline']}" for a in weather_alerts
        )
        alert_section = f"ACTIVE GOVERNMENT ALERTS:\n{alert_lines}"
    else:
        alert_section = "No active government weather alerts."

    if nearby_fires:
        fire_lines = "\n".join(
            f"  - Fire at ({f['latitude']:.4f}, {f['longitude']:.4f}), FRP: {f['frp']} MW, detected: {f['detection_date']}"
            for f in nearby_fires
        )
        fire_section = f"SATELLITE FIRE DETECTIONS (within ~55 km):\n{fire_lines}"
    else:
        fire_section = "No satellite fire detections within 55 km."

    crop_context = _get_crop_context(farm_profile.crop_type)
    livestock_note = "Livestock present — evacuation routes for animals must be included in any emergency planning." if farm_profile.livestock else "No livestock."

    return f"""
FARM PROFILE:
{farm_profile.model_dump_json(indent=2)}

CROP-SPECIFIC RISK CONTEXT:
{crop_context}
{livestock_note}

ENVIRONMENTAL CONDITIONS:
- Elevation: {elevation_note}
- Drought level: {drought_level}
- Vegetation moisture (NDVI proxy): {ndvi_status}
- {vpd_note}
- Wind today: {wind_note}
- 7-day risk trend: {risk_trend}

{fire_alert_section}

{alert_section}

{fire_section}

{peak_note}

7-DAY FIRE RISK TIMELINE:
{json.dumps(risk_data, indent=2)}

Generate exactly 3 ranked recommendations. Return valid JSON only:
[
  {{
    "rank": 1,
    "action": "specific action referencing actual data (dates, distances, measurements)",
    "reason": "cite the exact data point that makes this urgent (e.g. 'VPD of X kPa', 'fire 18 km SW', 'Heat Advisory until May 11')",
    "urgency": "high",
    "time_to_act": "within X hours / before [date]"
  }},
  {{
    "rank": 2,
    "action": "second action",
    "reason": "specific reason with data",
    "urgency": "medium",
    "time_to_act": "within X hours / before [date]"
  }},
  {{
    "rank": 3,
    "action": "third action",
    "reason": "specific reason with data",
    "urgency": "low",
    "time_to_act": "within X hours / before [date]"
  }}
]"""


async def generate_llm_recommendations(
    farm_profile: FarmProfile,
    drought_level: str,
    ndvi_status: str,
    elevation_m: float | None,
    risk_trend: str,
    weather_alerts: list[dict],
    nearby_fires: list[dict],
    fire_approach_alert: dict | None,
    wind_direction_deg: float | None,
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
        fire_approach_alert=fire_approach_alert,
        wind_direction_deg=wind_direction_deg,
        risk_timeline=risk_timeline,
    )

    client = OpenAI(
        base_url="https://router.huggingface.co/v1",
        api_key=os.environ["HF_TOKEN"],
    )

    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=1500,
    )

    raw_text = completion.choices[0].message.content
    print("Raw LLM response:", raw_text)

    try:
        parsed_json = parse_llm_to_recommendations(raw_text)
        return [RecommendationItem(**item) for item in parsed_json]
    except (ValueError, json.JSONDecodeError) as e:
        print(f"JSON parse error: {e}. Returning fallback recommendations.")
        return _fallback_recommendations(farm_profile)


def _fallback_recommendations(farm_profile: FarmProfile) -> list[RecommendationItem]:
    return [
        RecommendationItem(rank=1, action="Create defensible space by clearing dry vegetation within 30 feet of structures.", reason="Dry conditions and high wind increase fire spread risk near buildings.", urgency="high", time_to_act="within 24 hours"),
        RecommendationItem(rank=2, action="Check and restock emergency water supply and fire suppression equipment.", reason="Drought conditions reduce available water sources for firefighting.", urgency="medium", time_to_act="within 48 hours"),
        RecommendationItem(rank=3, action="Review evacuation routes and notify local fire authority of farm location.", reason="Early coordination with fire services reduces response time during an incident.", urgency="low", time_to_act="within 72 hours"),
    ]


def parse_llm_to_recommendations(text: str) -> list[dict]:
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

    # Strategy 3: partial JSON — try closing it
    if start != -1:
        partial = cleaned[start:]
        for suffix in (']}', '}]', ']'):
            try:
                result = json.loads(partial + suffix)
                if isinstance(result, list) and len(result) > 0:
                    return result
            except json.JSONDecodeError:
                continue

    # Strategy 4: free-text numbered items
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
            results.append({"rank": i, "action": action, "reason": reason, "urgency": urgency, "time_to_act": "as soon as possible"})

    if results:
        return results

    raise ValueError("Could not extract recommendations from LLM response.")
