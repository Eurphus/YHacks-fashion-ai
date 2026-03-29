import os
import httpx

IMAGES_DIR = os.path.join(os.path.dirname(__file__), "..", "images")


def _ensure_images_dir():
    os.makedirs(IMAGES_DIR, exist_ok=True)


def download_image(image_url: str, row_id: int) -> str:
    """
    Download the image at image_url and save it to images/<row_id>.jpg.
    Returns the local file path, or empty string if download failed.
    """
    _ensure_images_dir()

    if not image_url:
        return ""

    filename = f"{row_id:05d}.jpg"
    filepath = os.path.join(IMAGES_DIR, filename)

    try:
        response = httpx.get(image_url, timeout=15, follow_redirects=True)
        response.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(response.content)
        return filepath
    except Exception as e:
        print(f"  [image] Failed to download {image_url}: {e}")
        return ""
