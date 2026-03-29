"""
Scores and ranks DB candidates against a parsed intent.
"""

from color import parse_rgb, rgb_distance

# Keywords that indicate loose fit
LOOSE_KEYWORDS = ["loose", "oversized", "baggy", "relaxed", "wide", "comfort", "boxy"]
SLIM_KEYWORDS  = ["slim", "skinny", "fitted", "tapered", "tight", "stretch", "narrow"]

WEIGHT_COLOR      = 300   # max points for perfect color match
WEIGHT_FIT_BOOST  = 100   # bonus for matching fit keyword
WEIGHT_FIT_PENALY = 150   # penalty for contradicting fit keyword
WEIGHT_SEEN       = 200   # penalty for already shown items


def score_item(item: dict, intent: dict, color_rgb_target, seen_ids: set) -> float:
    score = 0.0
    name_lower = (item["name"] or "").lower()

    # ── Color score ───────────────────────────────────────────────────────────
    if color_rgb_target and item["color_rgb"]:
        item_rgb = parse_rgb(item["color_rgb"])
        if item_rgb:
            dist = rgb_distance(color_rgb_target, item_rgb)
            score += max(0, WEIGHT_COLOR - dist)

    # ── Fit score ─────────────────────────────────────────────────────────────
    fit = intent.get("fit")
    if fit == "loose":
        if any(kw in name_lower for kw in LOOSE_KEYWORDS):
            score += WEIGHT_FIT_BOOST
        if any(kw in name_lower for kw in SLIM_KEYWORDS):
            score -= WEIGHT_FIT_PENALY

    elif fit in ("slim", "regular"):
        # For slim/regular, penalize obviously loose items
        if any(kw in name_lower for kw in LOOSE_KEYWORDS):
            score -= WEIGHT_FIT_PENALY
        if fit == "slim" and any(kw in name_lower for kw in SLIM_KEYWORDS):
            score += WEIGHT_FIT_BOOST

    # ── Already-seen penalty ──────────────────────────────────────────────────
    if item["id"] in seen_ids:
        score -= WEIGHT_SEEN

    return score


def rank_candidates(items: list, intent: dict, color_rgb_target, seen_ids: set) -> list:
    """Return items sorted best-match first."""
    scored = [
        (score_item(item, intent, color_rgb_target, seen_ids), item)
        for item in items
    ]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored]
