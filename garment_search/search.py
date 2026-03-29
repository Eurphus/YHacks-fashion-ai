"""
Garment Search — Main Entry Point

Usage:
    cd garment_search
    python search.py

Requires:
    ANTHROPIC_API_KEY environment variable set, or a .env file with it.
"""

import os
import sys

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import sqlite3

from parser  import parse_intent
from color   import name_to_rgb
from ranker  import rank_candidates
from session import Session

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "webscraper", "garments.db")

# Broaden category searches so "shirt" also matches "t-shirt" etc.
CATEGORY_GROUPS = {
    "shirt":   ["shirt", "t-shirt"],
    "t-shirt": ["t-shirt", "shirt"],
    "pants":   ["pants", "jeans"],
    "jeans":   ["jeans", "pants"],
}


def get_candidates(intent: dict) -> list[dict]:
    """Fetch matching rows from the DB based on category."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    category = intent.get("category")
    if category:
        categories = CATEGORY_GROUPS.get(category, [category])
        placeholders = ",".join("?" * len(categories))
        rows = conn.execute(
            f"SELECT * FROM garments WHERE category IN ({placeholders})",
            categories,
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM garments").fetchall()

    conn.close()
    return [dict(r) for r in rows]


def display_result(result: dict):
    print("\n" + "─" * 50)
    print(f"  Name     : {result['name']}")
    print(f"  Category : {result['category']}")
    print(f"  Color    : {result['color_label']}  (rgb {result['color_rgb']})")
    print(f"  Image    : {result['image_path']}")
    print("─" * 50)


def run():
    if not os.environ.get("LAVA_SECRET_KEY"):
        print("Error: LAVA_SECRET_KEY not set.")
        print("Run:  export LAVA_SECRET_KEY=your_key_here")
        sys.exit(1)

    session = Session()
    print("Garment Search  |  type 'reset' to start over, 'quit' to exit\n")

    while True:
        try:
            query = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            break

        if not query:
            continue
        if query.lower() == "quit":
            print("Bye.")
            break
        if query.lower() == "reset":
            session.reset()
            print("Session cleared.\n")
            continue

        # Parse intent (LLM call)
        new_intent = parse_intent(query, session.recent_history())
        session.merge_intent(new_intent)

        current_intent = session.intent
        print(f"  [intent] {current_intent}")

        # Resolve color name → RGB
        color_target = name_to_rgb(current_intent.get("color_name") or "")

        # Fetch candidates from DB and rank
        candidates = get_candidates(current_intent)
        if not candidates:
            print("  No matching items found in the database.\n")
            session.add_exchange(query, "No results found.")
            continue

        ranked = rank_candidates(candidates, current_intent, color_target, session.seen_ids)
        best = ranked[0]
        session.last_result = best
        session.mark_seen(best["id"])

        display_result(best)

        # Store exchange so the next refinement has context
        summary = f"Found: {best['name']} ({best['color_label']} {best['category']})"
        session.add_exchange(query, summary)
        print()


if __name__ == "__main__":
    run()
