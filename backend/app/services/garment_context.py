from __future__ import annotations

import json
import logging
import sqlite3
import sys
import uuid
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
GARMENT_SEARCH_DIR = REPO_ROOT / "garment_search"
GARMENT_DB_PATH = REPO_ROOT / "webscraper" / "garments.db"
SESSIONS_DIR = Path(settings.sessions_dir)

if str(GARMENT_SEARCH_DIR) not in sys.path:
    sys.path.insert(0, str(GARMENT_SEARCH_DIR))

try:
    from color import name_to_rgb  # type: ignore  # noqa: E402
    from parser import parse_intent  # type: ignore  # noqa: E402
    from ranker import rank_candidates  # type: ignore  # noqa: E402
    from session import Session  # type: ignore  # noqa: E402
except Exception as exc:  # pragma: no cover - defensive boot-time guard
    logger.warning("Garment search modules unavailable, using fallback mode: %s", exc)

    class Session:  # type: ignore[no-redef]
        def __init__(self):
            self.history = []
            self.intent = {}
            self.last_result = None
            self.seen_ids = set()

        def add_exchange(self, user_text: str, assistant_text: str):
            self.history.append({"role": "user", "content": user_text})
            self.history.append({"role": "assistant", "content": assistant_text})

        def merge_intent(self, new_intent: dict):
            for key, value in new_intent.items():
                if value is not None:
                    self.intent[key] = value

        def mark_seen(self, item_id: int):
            self.seen_ids.add(item_id)

        def recent_history(self, n_turns: int = 3) -> list:
            return self.history[-(n_turns * 2) :]

    def name_to_rgb(color_name: str):  # type: ignore[no-redef]
        return None

    def parse_intent(query: str, history: list):  # type: ignore[no-redef]
        return {"category": None, "color_name": None, "fit": None, "other": query}

    def rank_candidates(items: list, intent: dict, color_rgb_target, seen_ids: set):  # type: ignore[no-redef]
        return items

CATEGORY_GROUPS = {
    "shirt": ["shirt", "t-shirt"],
    "t-shirt": ["t-shirt", "shirt"],
    "pants": ["pants", "jeans"],
    "jeans": ["jeans", "pants"],
}


def _session_path(session_id: str) -> Path:
    return SESSIONS_DIR / f"{session_id}.json"


def _restore_session(payload: dict[str, Any]) -> Session:
    session = Session()
    session.history = list(payload.get("history", []))
    session.intent = dict(payload.get("intent", {}))
    session.last_result = payload.get("last_result")
    session.seen_ids = set(payload.get("seen_ids", []))
    return session


def load_or_create_session(session_id: str | None) -> tuple[str, Session]:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    resolved_id = session_id or str(uuid.uuid4())
    path = _session_path(resolved_id)
    if not path.exists():
        return resolved_id, Session()

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return resolved_id, _restore_session(payload)
    except Exception as exc:
        logger.warning("Failed to load garment session %s: %s", resolved_id, exc)
        return resolved_id, Session()


def save_session(session_id: str, session: Session) -> Path:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    path = _session_path(session_id)
    payload = {
        "history": session.history,
        "intent": session.intent,
        "last_result": session.last_result,
        "seen_ids": sorted(session.seen_ids),
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def _fetch_candidates(intent: dict[str, Any]) -> list[dict[str, Any]]:
    if not GARMENT_DB_PATH.exists():
        logger.warning("Garment DB not found at %s", GARMENT_DB_PATH)
        return []

    conn = sqlite3.connect(GARMENT_DB_PATH)
    conn.row_factory = sqlite3.Row

    category = intent.get("category")
    try:
        if category:
            categories = CATEGORY_GROUPS.get(category, [category])
            placeholders = ",".join("?" * len(categories))
            rows = conn.execute(
                f"SELECT * FROM garments WHERE category IN ({placeholders})",
                categories,
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM garments").fetchall()
    finally:
        conn.close()

    return [dict(row) for row in rows]


def _safe_parse_intent(prompt: str, session: Session) -> dict[str, Any]:
    try:
        parsed = parse_intent(prompt, session.recent_history())
        if isinstance(parsed, dict):
            return parsed
    except Exception as exc:
        logger.warning("Intent parsing failed, falling back to raw prompt: %s", exc)

    return {"category": None, "color_name": None, "fit": None, "other": prompt}


def _build_effective_prompt(prompt: str, selected: list[dict[str, Any]]) -> str:
    if not selected:
        return prompt

    garment_bits = []
    for item in selected:
        description = " ".join(
            part
            for part in [
                item.get("color_label"),
                item.get("category"),
                item.get("name"),
            ]
            if part
        )
        if description:
            garment_bits.append(description)

    if not garment_bits:
        return prompt

    return (
        f"{prompt}\n\n"
        "Use these retrieved garment references when styling the clothing on the person: "
        + "; ".join(garment_bits[:3])
        + "."
    )


def build_generation_context(
    prompt: str,
    session_id: str | None,
    reference_photo_path: Path,
    job_dir: Path,
) -> dict[str, Any]:
    resolved_session_id, session = load_or_create_session(session_id)

    new_intent = _safe_parse_intent(prompt, session)
    session.merge_intent(new_intent)
    current_intent = dict(session.intent)

    color_target = name_to_rgb(current_intent.get("color_name") or "")
    candidates = _fetch_candidates(current_intent)
    ranked = rank_candidates(candidates, current_intent, color_target, session.seen_ids) if candidates else []
    selected = ranked[:3]

    if selected:
        session.last_result = selected[0]
        session.mark_seen(selected[0]["id"])
        selected_summary = ", ".join(
            f"{item.get('name')} ({item.get('color_label')} {item.get('category')})"
            for item in selected
        )
    else:
        selected_summary = "No matching garments found in local catalog."

    session.add_exchange(prompt, selected_summary)
    session_path = save_session(resolved_session_id, session)

    garment_refs = []
    for item in selected:
        image_path = item.get("image_path")
        resolved_image = (
            str((REPO_ROOT / "webscraper" / image_path).resolve())
            if image_path
            else None
        )
        garment_refs.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "category": item.get("category"),
                "color_label": item.get("color_label"),
                "image_path": resolved_image,
                "source_url": item.get("source_url"),
            }
        )

    effective_prompt = _build_effective_prompt(prompt, selected)
    request_payload = {
        "session_id": resolved_session_id,
        "user_prompt": prompt,
        "effective_prompt": effective_prompt,
        "reference_photo_path": str(reference_photo_path.resolve()),
        "intent": current_intent,
        "selected_garments": garment_refs,
        "history_path": str(session_path.resolve()),
    }

    request_path = job_dir / "ai_request.json"
    request_path.write_text(json.dumps(request_payload, indent=2), encoding="utf-8")

    return request_payload
