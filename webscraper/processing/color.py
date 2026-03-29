from PIL import Image
from sklearn.cluster import KMeans
import numpy as np


def _is_background(r, g, b) -> bool:
    """Near-white pixels — usually the studio background."""
    return r > 220 and g > 220 and b > 220


def _is_skin_tone(r, g, b) -> bool:
    """Rough skin tone filter so we don't pick up the model's arms/face."""
    return (
        r > 95 and g > 40 and b > 20
        and max(r, g, b) - min(r, g, b) > 15
        and r > g and r > b
        and abs(int(r) - int(g)) > 15
    )


def dominant_colors(image_path: str, n: int = 3) -> list[tuple[int, int, int]]:
    """
    Return the top n dominant colors of the garment in the image as RGB tuples,
    sorted by how much of the image they cover (most dominant first).

    Filters out near-white backgrounds and skin tones before clustering
    so the result reflects the actual clothing color.

    Returns an empty list if the image can't be read.
    """
    try:
        img = Image.open(image_path).convert("RGB").resize((100, 100))
    except Exception:
        return []

    pixels = np.array(img).reshape(-1, 3)

    # Filter out background and skin tones
    filtered = np.array([
        p for p in pixels
        if not _is_background(*p) and not _is_skin_tone(*p)
    ])

    # Fall back to all pixels if filtering removed too much
    if len(filtered) < n * 10:
        filtered = pixels

    k = min(n, len(filtered))
    kmeans = KMeans(n_clusters=k, n_init=10, random_state=42).fit(filtered)

    # Sort clusters by size so index 0 = most dominant color
    counts = np.bincount(kmeans.labels_)
    sorted_idx = np.argsort(-counts)

    return [tuple(map(int, kmeans.cluster_centers_[i])) for i in sorted_idx]
