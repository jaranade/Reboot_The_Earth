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
    risk_timeline: list[DailyRisk]
) -> str:
    risk_data = [item.model_dump() for item in risk_timeline]

    return f"""
You are a wildfire risk advisor for farmers.

Use the farm profile and environmental risk data to generate exactly 3 ranked action recommendations.

Farm profile:
{farm_profile.model_dump_json(indent=2)}

Drought level:
{drought_level}

NDVI status:
{ndvi_status}

7-day fire risk timeline:
{json.dumps(risk_data, indent=2)}

Return valid JSON only in this exact format:
[
  {{
    "rank": 1,
    "action": "specific action the farmer should take",
    "reason": "why this matters based on the data",
    "urgency": "high"
  }},
  {{
    "rank": 2,
    "action": "specific action the farmer should take",
    "reason": "why this matters based on the data",
    "urgency": "medium"
  }},
  {{
    "rank": 3,
    "action": "specific action the farmer should take",
    "reason": "why this matters based on the data",
    "urgency": "low"
  }}
]

Rules:
- Return JSON only.
- Do not include markdown.
- Do not include explanations outside JSON.
- Make recommendations specific to crop type, livestock status, weather, drought, and vegetation.
"""


async def generate_llm_recommendations(
    farm_profile: FarmProfile,
    drought_level: str,
    ndvi_status: str,
    risk_timeline: list[DailyRisk]
) -> list[RecommendationItem]:

    prompt = build_llm_prompt(
        farm_profile=farm_profile,
        drought_level=drought_level,
        ndvi_status=ndvi_status,
        risk_timeline=risk_timeline
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

