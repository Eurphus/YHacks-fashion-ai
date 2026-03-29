"""
Backfill script — run once to fix existing DB rows:
  1. Infer category from product name
  2. Extract RGB for any rows missing it
  3. Derive a human-readable color label from the RGB value
"""

import math
from database.db import get_connection
from processing.color import dominant_colors

# ── Category keywords ─────────────────────────────────────────────────────────

CATEGORY_KEYWORDS = [
    ("t-shirt",  ["t-shirt", "tee", "graphic tee", "polo"]),
    ("jeans",    ["jeans", "denim"]),
    ("shorts",   ["shorts"]),
    ("hoodie",   ["hoodie", "sweatshirt", "hooded"]),
    ("jacket",   ["jacket", "coat", "blazer", "bomber", "windbreaker", "parka"]),
    ("shirt",    ["shirt", "flannel", "oxford", "chambray", "henley", "rugby"]),
    ("pants",    ["pants", "trousers", "chinos", "joggers", "sweatpants", "cargo"]),
    ("sweater",  ["sweater", "cardigan", "knit", "pullover", "jumper"]),
    ("dress",    ["dress"]),
    ("skirt",    ["skirt"]),
]

def infer_category(name: str) -> str:
    lower = name.lower()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(kw in lower for kw in keywords):
            return category
    return "unknown"

# ── Color name lookup ─────────────────────────────────────────────────────────

COLOR_NAMES = [
    ("black",        (20,  20,  20)),
    ("dark gray",    (64,  64,  64)),
    ("gray",         (128, 128, 128)),
    ("light gray",   (192, 192, 192)),
    ("white",        (245, 245, 245)),
    ("navy",         (25,  35,  90)),
    ("dark blue",    (30,  50,  120)),
    ("blue",         (50,  100, 180)),
    ("light blue",   (130, 170, 210)),
    ("sky blue",     (135, 206, 235)),
    ("dark green",   (30,  80,  40)),
    ("green",        (60,  140, 70)),
    ("olive",        (100, 110, 50)),
    ("khaki",        (180, 170, 120)),
    ("beige",        (210, 195, 165)),
    ("cream",        (230, 220, 200)),
    ("brown",        (100, 65,  40)),
    ("tan",          (160, 120, 80)),
    ("dark red",     (120, 20,  20)),
    ("red",          (190, 40,  40)),
    ("burgundy",     (100, 25,  45)),
    ("pink",         (220, 140, 160)),
    ("light pink",   (240, 190, 200)),
    ("orange",       (210, 110, 40)),
    ("yellow",       (220, 200, 60)),
    ("purple",       (100, 50,  130)),
    ("lavender",     (170, 150, 200)),
    ("teal",         (40,  120, 120)),
    ("camel",        (185, 140, 85)),
]

def nearest_color_name(rgb_str: str) -> str:
    """Return the closest human-readable color name for a 'r,g,b' string."""
    try:
        r, g, b = map(int, rgb_str.split(","))
    except Exception:
        return ""

    best_name, best_dist = "unknown", float("inf")
    for name, (cr, cg, cb) in COLOR_NAMES:
        dist = math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_name = name
    return best_name

# ── Main backfill ─────────────────────────────────────────────────────────────

def main():
    conn = get_connection()
    rows = conn.execute("SELECT id, name, image_path, color_rgb FROM garments").fetchall()
    print(f"Backfilling {len(rows)} rows...\n")

    for row in rows:
        row_id     = row["id"]
        name       = row["name"] or ""
        image_path = row["image_path"] or ""
        color_rgb  = row["color_rgb"] or ""

        updates = {}

        # 1. Fix category
        updates["category"] = infer_category(name)

        # 2. Extract RGB if missing
        if not color_rgb and image_path:
            colors = dominant_colors(image_path, n=3)
            if colors:
                color_rgb = "{},{},{}".format(*colors[0])
                updates["color_rgb"]     = color_rgb
                updates["color_palette"] = "|".join("{},{},{}".format(*c) for c in colors)

        # 3. Derive color label from RGB
        if color_rgb:
            updates["color_label"] = nearest_color_name(color_rgb)

        # Apply updates
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [row_id]
            conn.execute(f"UPDATE garments SET {set_clause} WHERE id = ?", values)

        print(f"  ID {row_id:03d} | {updates.get('category', '?'):<12} | "
              f"rgb={updates.get('color_rgb', color_rgb) or 'NULL':<15} | "
              f"label={updates.get('color_label', ''):<12} | {name}")

    conn.commit()
    conn.close()
    print("\nDone.")

if __name__ == "__main__":
    main()
