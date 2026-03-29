"""
Color utilities: name → RGB lookup, RGB distance calculation.
"""

import math
from typing import Optional, Tuple

# Common clothing colors mapped to representative RGB values
COLOR_MAP = {
    "black":       (20,  20,  20),
    "dark gray":   (64,  64,  64),
    "gray":        (128, 128, 128),
    "grey":        (128, 128, 128),
    "light gray":  (192, 192, 192),
    "light grey":  (192, 192, 192),
    "white":       (245, 245, 245),
    "navy":        (25,  35,  90),
    "dark blue":   (30,  50,  120),
    "blue":        (50,  100, 180),
    "light blue":  (130, 170, 210),
    "sky blue":    (135, 206, 235),
    "dark green":  (30,  80,  40),
    "green":       (60,  140, 70),
    "olive":       (100, 110, 50),
    "khaki":       (180, 170, 120),
    "beige":       (210, 195, 165),
    "cream":       (230, 220, 200),
    "brown":       (100, 65,  40),
    "tan":         (160, 120, 80),
    "camel":       (185, 140, 85),
    "dark red":    (120, 20,  20),
    "red":         (190, 40,  40),
    "burgundy":    (100, 25,  45),
    "maroon":      (100, 25,  45),
    "pink":        (220, 140, 160),
    "light pink":  (240, 190, 200),
    "orange":      (210, 110, 40),
    "yellow":      (220, 200, 60),
    "purple":      (100, 50,  130),
    "lavender":    (170, 150, 200),
    "teal":        (40,  120, 120),
}


def name_to_rgb(color_name: str) -> Optional[Tuple[int, int, int]]:
    """Convert a color name to its RGB tuple. Returns None if not found."""
    if not color_name:
        return None
    return COLOR_MAP.get(color_name.lower().strip())


def parse_rgb(rgb_str: str) -> Optional[Tuple[int, int, int]]:
    """Parse a 'r,g,b' string into a tuple. Returns None on failure."""
    try:
        parts = rgb_str.split(",")
        return tuple(map(int, parts))
    except Exception:
        return None


def rgb_distance(a: tuple, b: tuple) -> float:
    """Euclidean distance between two RGB tuples."""
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))
