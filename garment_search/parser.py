"""
Parses natural language queries into structured search intent using Lava (GPT-4o-mini proxy).
Maintains conversation history so follow-up refinements work correctly.
"""

import json
import os
import requests

LAVA_SECRET_KEY = os.environ.get("LAVA_SECRET_KEY")
LAVA_URL = "https://api.lava.so/v1/forward?u=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions"

SYSTEM_PROMPT = """You are a fashion search assistant. Given a user query, extract structured search intent as JSON.

Return ONLY valid JSON with these fields (use null if not mentioned):
{
  "category": one of [t-shirt, shirt, jeans, shorts, hoodie, jacket, pants, sweater, dress, skirt] or null,
  "color_name": color as a simple word e.g. "black", "navy", "light blue" or null,
  "fit": one of ["loose", "slim", "regular"] or null,
  "other": any other style notes as a string or null
}

Important rules:
- If the user offers multiple color options (e.g. "grey or white or blue"), pick the FIRST one mentioned.
- Always reflect the LATEST color/fit the user requests — do not keep old values if the user is changing them.
- "not loose", "not baggy", "fitted", "regular" all map to fit: "regular".
- "baggier", "looser", "more relaxed" all map to fit: "loose".

Examples:
  "give me a black shirt" -> {"category": "shirt", "color_name": "black", "fit": null, "other": null}
  "make it baggier" -> {"category": null, "color_name": null, "fit": "loose", "other": null}
  "something in grey or white" -> {"category": null, "color_name": "gray", "fit": null, "other": null}
  "anything not loose, grey or blue is fine" -> {"category": null, "color_name": "gray", "fit": "regular", "other": null}

Return ONLY the JSON object, no explanation or markdown."""


def parse_intent(query: str, history: list) -> dict:
    """
    Send query + recent conversation history to Lava (GPT-4o-mini).
    Returns a dict with keys: category, color_name, fit, other.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history[-6:]
    messages.append({"role": "user", "content": query})

    response = requests.post(
        LAVA_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {LAVA_SECRET_KEY}",
        },
        json={
            "model": "gpt-4o-mini",
            "messages": messages,
        },
        timeout=15,
    )
    response.raise_for_status()

    text = response.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"category": None, "color_name": None, "fit": None, "other": None}
