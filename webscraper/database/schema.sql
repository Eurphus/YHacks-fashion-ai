CREATE TABLE IF NOT EXISTS garments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url    TEXT,
    image_path    TEXT,
    image_url     TEXT,
    name          TEXT,
    brand         TEXT,
    category      TEXT,
    subcategory   TEXT,
    color_label   TEXT,
    color_rgb     TEXT,
    color_palette TEXT,
    gender        TEXT,
    scraped_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
