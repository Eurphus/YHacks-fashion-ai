"""
H&M-specific selectors and metadata extraction.

Category URLs to try:
  Mens t-shirts:  https://www2.hm.com/en_us/men/products/t-shirts.html
  Womens tops:    https://www2.hm.com/en_us/ladies/tops.html
  Mens jeans:     https://www2.hm.com/en_us/men/products/jeans.html
"""

from bs4 import BeautifulSoup

BRAND = "H&M"

# Map URL path segments → normalized category names
CATEGORY_MAP = {
    "t-shirts": "t-shirt",
    "shirts": "shirt",
    "jeans": "jeans",
    "trousers": "pants",
    "shorts": "shorts",
    "hoodies-sweatshirts": "hoodie",
    "jackets-coats": "jacket",
    "tops": "top",
    "dresses": "dress",
    "skirts": "skirt",
}


def guess_category_from_url(url: str) -> str:
    for segment, category in CATEGORY_MAP.items():
        if segment in url:
            return category
    return "unknown"


def guess_gender_from_url(url: str) -> str:
    if "/men/" in url or "/men_us/" in url:
        return "mens"
    if "/ladies/" in url or "/women/" in url:
        return "womens"
    if "/kids/" in url:
        return "kids"
    return "unisex"


def extract_product_links(html: str, base_url: str = "https://www2.hm.com") -> list[str]:
    """
    Parse a category listing page and return all product page URLs.
    """
    soup = BeautifulSoup(html, "html.parser")
    links = set()

    for a in soup.select("a[href]"):
        href = a["href"]
        # H&M product pages look like /en_us/productpage.XXXXXXXX.html
        if "productpage" in href:
            if href.startswith("http"):
                links.add(href)
            else:
                links.add(base_url + href)

    return list(links)


def extract_product_metadata(html: str, product_url: str) -> dict:
    """
    Parse a single product page and return a metadata dict.
    Missing fields default to empty string so the DB insert never fails.
    """
    soup = BeautifulSoup(html, "html.parser")

    # --- Product name ---
    name = ""
    name_tag = soup.select_one("h1.primary.product-item-headline") or \
               soup.select_one("h1[class*='product']") or \
               soup.select_one("h1")
    if name_tag:
        name = name_tag.get_text(strip=True)

    # --- Color label (H&M puts it in a <span> near the color swatch) ---
    color_label = ""
    color_tag = soup.select_one("[class*='colorName']") or \
                soup.select_one("[class*='color-name']") or \
                soup.select_one("[data-color]")
    if color_tag:
        color_label = color_tag.get_text(strip=True) or color_tag.get("data-color", "")

    # --- Smallest available image (saves disk space) ---
    image_url = ""
    best_width = float("inf")

    for img in soup.find_all("img"):
        candidates = []

        src = img.get("src", "")
        if src:
            candidates.append((src, 9999))

        srcset = img.get("srcset", "")
        for entry in srcset.split(","):
            entry = entry.strip()
            if not entry:
                continue
            parts = entry.split()
            url_candidate = parts[0]
            width = 9999
            if len(parts) == 2 and parts[1].endswith("w"):
                try:
                    width = int(parts[1][:-1])
                except ValueError:
                    pass
            candidates.append((url_candidate, width))

        for url_candidate, width in candidates:
            if not url_candidate or url_candidate.startswith("data:"):
                continue
            # Make absolute
            if url_candidate.startswith("//"):
                url_candidate = "https:" + url_candidate
            elif url_candidate.startswith("/"):
                url_candidate = "https://www2.hm.com" + url_candidate
            # Skip tiny icons (tracking pixels, logos) and 1x1 trackers
            if width < 50 or "logo" in url_candidate.lower():
                continue
            if width < best_width:
                best_width = width
                image_url = url_candidate

    # If srcset gave nothing, fall back to whatever src the first real img had
    if not image_url:
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if src and not src.startswith("data:"):
                image_url = src if src.startswith("http") else "https://www2.hm.com" + src
                break

    category = guess_category_from_url(product_url)
    gender = guess_gender_from_url(product_url)

    return {
        "source_url": product_url,
        "image_url": image_url,
        "name": name,
        "brand": BRAND,
        "category": category,
        "subcategory": "",
        "color_label": color_label,
        "gender": gender,
    }
