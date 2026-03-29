"""
Clothing Web Scraper — Main Entry Point

Usage:
    python main.py

Edit the SCRAPE_TARGETS list below to control which categories are scraped
and how many products to collect per category.

H&M category URL examples:
    Mens t-shirts:   https://www2.hm.com/en_us/men/products/t-shirts.html
    Womens tops:     https://www2.hm.com/en_us/ladies/tops.html
    Mens jeans:      https://www2.hm.com/en_us/men/products/jeans.html
    Womens dresses:  https://www2.hm.com/en_us/ladies/dresses.html
"""

import asyncio
import random

from scraper.browser import start_browser, stop_browser, fetch_page
from scraper.sites.hm import extract_product_links, extract_product_metadata
from processing.image import download_image
from processing.color import dominant_colors
from database.db import init_db, insert_garment, already_scraped, get_connection

# ── Configuration ─────────────────────────────────────────────────────────────

SCRAPE_TARGETS = [
    {"url": "https://www2.hm.com/en_us/men/products/t-shirts.html",            "max_products": 30},
    {"url": "https://www2.hm.com/en_us/men/products/jeans.html",               "max_products": 30},
    {"url": "https://www2.hm.com/en_us/men/products/shorts.html",              "max_products": 30},
    {"url": "https://www2.hm.com/en_us/men/products/hoodies-sweatshirts.html", "max_products": 30},
]

DELAY_BETWEEN_REQUESTS = (1.5, 3.5)  # seconds, randomized

# Set True to open a visible browser window and save raw HTML for inspection
DEBUG = True

# ── Pipeline ──────────────────────────────────────────────────────────────────

async def scrape_category(category_url: str, max_products: int):
    print(f"\n[category] {category_url}")

    page, html = await fetch_page(category_url)
    await page.close()

    if DEBUG:
        debug_path = "debug_listing.html"
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  [debug] Saved raw HTML → {debug_path}")
        print(f"  [debug] HTML length: {len(html)} chars")
        print(f"  [debug] First 300 chars: {html[:300]}")

    product_urls = extract_product_links(html)
    print(f"  Found {len(product_urls)} product links")

    scraped = 0
    for product_url in product_urls:
        if scraped >= max_products:
            break

        if already_scraped(product_url):
            print(f"  [skip] already in DB: {product_url}")
            continue

        print(f"  [{scraped + 1}/{max_products}] {product_url}")

        # Polite delay
        await asyncio.sleep(random.uniform(*DELAY_BETWEEN_REQUESTS))

        try:
            product_page, product_html = await fetch_page(product_url)
            await product_page.close()
        except Exception as e:
            print(f"    [error] failed to load page: {e}")
            continue

        metadata = extract_product_metadata(product_html, product_url)
        print(f"    name={metadata['name']!r} color={metadata['color_label']!r} image_url={metadata['image_url'][:80] if metadata['image_url'] else 'NONE'}")

        # Insert metadata first to get the row id (used for the image filename)
        row_id = insert_garment({**metadata, "image_path": ""})

        # Download the model image and update the path in the DB
        image_path = download_image(metadata["image_url"], row_id)

        if image_path:
            colors = dominant_colors(image_path, n=3)
            color_rgb     = "{},{},{}".format(*colors[0]) if colors else ""
            color_palette = "|".join("{},{},{}".format(*c) for c in colors)

            conn = get_connection()
            conn.execute(
                "UPDATE garments SET image_path = ?, color_rgb = ?, color_palette = ? WHERE id = ?",
                (image_path, color_rgb, color_palette, row_id),
            )
            conn.commit()
            conn.close()
            print(f"    [ok] saved image → {image_path}  color={color_rgb}")
        else:
            print(f"    [warn] no image saved (image_url was empty or download failed)")

        scraped += 1

    print(f"  Done. Scraped {scraped} products from this category.")


async def main():
    print("Initializing database...")
    init_db()

    print("Starting browser...")
    await start_browser()

    try:
        for target in SCRAPE_TARGETS:
            await scrape_category(target["url"], target["max_products"])
    finally:
        await stop_browser()

    print("\nAll done. Results saved to garments.db and images/")


if __name__ == "__main__":
    asyncio.run(main())
