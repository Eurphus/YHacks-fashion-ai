import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "garments.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the garments table if it doesn't exist yet."""
    conn = get_connection()
    with open(SCHEMA_PATH, "r") as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()


def insert_garment(data: dict) -> int:
    """
    Insert one garment row. Returns the new row's id.

    Expected keys in data:
        source_url, image_path, image_url, name, brand,
        category, subcategory, color_label, gender
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO garments
            (source_url, image_path, image_url, name, brand,
             category, subcategory, color_label, gender)
        VALUES
            (:source_url, :image_path, :image_url, :name, :brand,
             :category, :subcategory, :color_label, :gender)
        """,
        data,
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def already_scraped(source_url: str) -> bool:
    """Return True if this product URL is already in the database."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM garments WHERE source_url = ?", (source_url,)
    ).fetchone()
    conn.close()
    return row is not None
