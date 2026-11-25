"""Original, procedurally generated demo artwork for AEROPIX.

These images are bundled with the project as clearly labelled demo content.
They are rendered locally with Pillow — no stock photos, remote URLs, or
third-party image services are involved.

Run via:  python -m app.seed   (generates any missing artwork automatically)
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

PALETTES = {
    "midnight": ((8, 13, 30), (24, 36, 74), (78, 92, 160)),
    "amber": ((46, 29, 30), (168, 94, 65), (238, 197, 150)),
    "sea": ((4, 20, 28), (13, 66, 78), (120, 166, 158)),
    "plaster": ((232, 221, 205), (211, 190, 168), (164, 132, 108)),
    "iris": ((15, 14, 44), (72, 53, 140), (132, 112, 220)),
    "nocturne": ((5, 10, 24), (20, 31, 64), (86, 74, 128)),
    "bloom": ((244, 236, 225), (221, 179, 165), (150, 166, 139)),
    "fog": ((220, 226, 224), (154, 174, 178), (92, 116, 124)),
}


@dataclass(frozen=True)
class DemoArt:
    filename: str
    title: str
    album: str
    favorite: bool
    days_ago: int
    width: int
    height: int
    style: str
    palette: str
    note: str


DEMO_ART: list[DemoArt] = [
    DemoArt("demo-01.jpg", "Amber Dunes", "Earth & Light", True, 1, 1200, 1500, "dunes", "amber", "Layered desert light at golden hour."),
    DemoArt("demo-02.jpg", "Blue Hour Ridge", "Horizons", False, 2, 1600, 1000, "ridge", "midnight", "Mountain silhouettes in the last light."),
    DemoArt("demo-03.jpg", "Tidal Line", "Horizons", True, 4, 1500, 1000, "tidal", "sea", "A quiet study of water and horizon."),
    DemoArt("demo-04.jpg", "Quiet Arch", "Quiet Architecture", False, 6, 1200, 1500, "arch", "plaster", "Warm plaster, long shadows, one arch."),
    DemoArt("demo-05.jpg", "Iris Field", "Earth & Light", False, 9, 1500, 1125, "blobs", "iris", "An abstract field of indigo and violet."),
    DemoArt("demo-06.jpg", "After Rain", "Quiet Architecture", True, 11, 1600, 1000, "city", "nocturne", "City lights dissolving into the river."),
    DemoArt("demo-07.jpg", "Paper Bloom", "Earth & Light", False, 12, 1200, 1500, "bloom", "bloom", "Cut-paper petals in muted rose and sage."),
    DemoArt("demo-08.jpg", "Morning Fog", "Horizons", False, 13, 1500, 1000, "fog", "fog", "Soft hills under a pale morning sky."),
]

ALBUM_NOTES = {
    "Horizons": "Wide skies, distant water and the edges of the day.",
    "Earth & Light": "Warm tones, sculptural shadows and slow afternoons.",
    "Quiet Architecture": "Buildings, thresholds and the geometry of calm.",
}


# --- low-level painting helpers -------------------------------------------
def _mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def _gradient(size: tuple[int, int], colors: tuple[tuple[int, int, int], ...]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    stops = len(colors) - 1
    for y in range(height):
        position = y / max(1, height - 1) * stops
        index = min(int(position), stops - 1)
        color = _mix(colors[index], colors[index + 1], position - index)
        draw.line((0, y, width, y), fill=color)
    return image


def _soft_blob(
    image: Image.Image,
    center: tuple[int, int],
    radius: tuple[int, int],
    color: tuple[int, int, int],
    alpha: int,
    blur: int,
) -> None:
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = center
    rx, ry = radius
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(*color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    image.alpha_composite(layer)


def _grain(image: Image.Image, amount: float = 0.055, seed: int = 7) -> Image.Image:
    rgb = image.convert("RGB")
    noise = Image.effect_noise(rgb.size, 26).convert("RGB")
    grained = Image.blend(rgb, noise, amount)
    return grained


def _vignette(image: Image.Image, strength: int = 52) -> Image.Image:
    mask = Image.radial_gradient("L").resize(image.size, Image.Resampling.BICUBIC)
    mask = ImageChops.invert(mask)
    shade = Image.new("RGBA", image.size, (5, 8, 18, 0))
    shade.putalpha(mask.point(lambda value: int(value * strength / 255)))
    return Image.alpha_composite(image.convert("RGBA"), shade).convert("RGB")


def _finish(image: Image.Image, path: Path, seed: int = 7) -> None:
    image = _vignette(_grain(image, seed=seed))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="JPEG", quality=90, optimize=True, progressive=True)


def _palette(name: str) -> tuple[tuple[int, int, int], ...]:
    return PALETTES[name]


# --- individual artworks --------------------------------------------------
def paint_dunes(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    dark, mid, light = _palette(palette)
    width, height = size
    image = _gradient(size, ((18, 26, 50), mid, (247, 219, 185))).convert("RGBA")
    # low sun with a soft halo
    _soft_blob(image, (int(width * 0.68), int(height * 0.42)), (150, 150), (255, 236, 198), 235, 9)
    _soft_blob(image, (int(width * 0.68), int(height * 0.42)), (380, 380), (255, 191, 128), 105, 130)

    draw = ImageDraw.Draw(image)
    dune_colors = [
        (120, 70, 58), (158, 96, 70), (204, 141, 98), (238, 192, 150), (248, 219, 186),
    ]
    for layer_index, color in enumerate(dune_colors):
        baseline = height * (0.52 + layer_index * 0.105)
        amplitude = height * (0.05 + layer_index * 0.012)
        phase = rng.random() * math.tau
        points = [(0, height)]
        for x in range(0, width + 24, 24):
            t = x / width
            y = baseline + math.sin(t * math.tau * (0.8 + layer_index * 0.18) + phase) * amplitude
            y += math.sin(t * math.tau * 2.2 + phase * 1.7) * amplitude * 0.18
            points.append((x, y))
        points.append((width, height))
        draw.polygon(points, fill=(*color, 235 if layer_index < 4 else 255))
    image = image.filter(ImageFilter.GaussianBlur(0.6))
    return image.convert("RGB")


def paint_ridge(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = size
    image = _gradient(size, ((9, 14, 36), (42, 57, 108), (194, 146, 126), (241, 201, 166))).convert("RGBA")
    _soft_blob(image, (int(width * 0.73), int(height * 0.62)), (92, 92), (255, 230, 201), 190, 34)
    draw = ImageDraw.Draw(image)
    layers = [
        (0.58, (78, 82, 118), 0.20),
        (0.68, (52, 56, 90), 0.25),
        (0.79, (30, 34, 62), 0.33),
        (0.92, (17, 20, 40), 0.45),
    ]
    for baseline_ratio, color, roughness in layers:
        baseline = height * baseline_ratio
        peaks = 7
        points = [(0, height)]
        x = 0
        while x < width:
            peak_x = x + rng.uniform(width / peaks * 0.4, width / peaks * 0.9)
            peak_y = baseline - rng.uniform(30, height * roughness)
            points.append((x, baseline - rng.uniform(0, 25)))
            points.append((min(peak_x, width), peak_y))
            x = peak_x + width / peaks * 0.4
        points.extend([(width, baseline), (width, height)])
        draw.polygon(points, fill=(*color, 255))
    # drifting mist
    for index in range(4):
        y = int(height * (0.62 + index * 0.064))
        mist = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(mist).rectangle(
            (0, y, width, y + rng.randint(20, 50)),
            fill=(234, 224, 214, rng.randint(22, 46)),
        )
        image.alpha_composite(mist.filter(ImageFilter.GaussianBlur(42)))
    return image.convert("RGB")


def paint_tidal(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = size
    image = _gradient(size, ((3, 15, 24), (11, 53, 66), (71, 121, 120), (188, 205, 184))).convert("RGBA")
    horizon = int(height * 0.52)
    _soft_blob(image, (int(width * 0.45), horizon - 30), (int(width * 0.5), 90), (235, 219, 185), 92, 80)
    horizon_glow = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(horizon_glow).rectangle(
        (0, horizon - 2, width, horizon + 3), fill=(236, 232, 208, 100)
    )
    image.alpha_composite(horizon_glow.filter(ImageFilter.GaussianBlur(2.5)))

    wave_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    wave_draw = ImageDraw.Draw(wave_layer)
    for index in range(12):
        y = horizon + 22 + index * 24 + rng.randint(-6, 8)
        amplitude = rng.uniform(4, 14)
        upper = [
            (x, y + math.sin(x / width * math.tau * 1.3 + index * 0.9) * amplitude)
            for x in range(0, width + 20, 16)
        ]
        lower = [(x, wy + rng.uniform(3, 9)) for x, wy in upper]
        wave_draw.polygon(
            upper + lower[::-1],
            fill=(228, 238, 224, rng.randint(12, 34)),
        )
    wave_layer = wave_layer.filter(ImageFilter.GaussianBlur(1.6))
    image.alpha_composite(wave_layer)
    for index in range(5):
        x = int(width * (0.15 + index * 0.16)) + rng.randint(-20, 20)
        _soft_blob(image, (x, int(height * 0.8)), (int(width * 0.09), 12), (223, 235, 222), 78, 16)

    # a soft band of reflected light below the horizon
    _soft_blob(
        image,
        (int(width * 0.46), int(height * 0.72)),
        (int(width * 0.1), int(height * 0.18)),
        (244, 225, 177),
        42,
        80,
    )
    return image.convert("RGB")


def paint_arch(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = size
    image = _gradient(size, ((239, 230, 216), (233, 221, 204), (220, 203, 182))).convert("RGBA")
    draw = ImageDraw.Draw(image)
    # sunlight wash
    light = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(light).polygon(
        [(0, 0), (int(width * 0.18), 0), (int(width * 0.6), height), (int(width * 0.3), height)],
        fill=(255, 248, 231, 80),
    )
    image.alpha_composite(light.filter(ImageFilter.GaussianBlur(90)))

    arch_left = int(width * 0.22)
    arch_right = int(width * 0.72)
    arch_top = int(height * 0.2)
    floor = int(height * 0.8)
    arch_color = (187, 156, 126)
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    offset = int(width * 0.06)
    shadow_draw.rounded_rectangle(
        (arch_left + offset, arch_top + offset, arch_right + offset, floor + offset),
        radius=(arch_right - arch_left) // 2,
        fill=(74, 56, 44, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    image.alpha_composite(shadow)

    draw.rounded_rectangle(
        (arch_left, arch_top, arch_right, floor),
        radius=(arch_right - arch_left) // 2,
        fill=(*arch_color, 255),
    )
    inner = int(width * 0.035)
    draw.rounded_rectangle(
        (arch_left + inner, arch_top + inner, arch_right - inner, floor),
        radius=(arch_right - arch_left - inner * 2) // 2,
        fill=(109, 87, 70),
    )
    # interior gradient light
    interior = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(interior).rounded_rectangle(
        (arch_left + inner, arch_top + inner, arch_right - inner, floor),
        radius=(arch_right - arch_left - inner * 2) // 2,
        fill=(42, 40, 42, 230),
    )
    interior = interior.filter(ImageFilter.GaussianBlur(2))
    image.alpha_composite(interior)
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        (int(width * 0.4), int(height * 0.46), int(width * 0.62), int(height * 0.66)),
        fill=(226, 184, 128, 150),
    )
    image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70)))

    draw.rectangle((0, floor, width, height), fill=(207, 188, 167, 255))
    draw.line((0, floor, width, floor), fill=(143, 121, 100, 120), width=2)
    # lone stem in a small vessel
    vessel_x = int(width * 0.83)
    draw.ellipse(
        (vessel_x - 48, floor - 60, vessel_x + 48, floor + 2),
        fill=(160, 118, 87),
    )
    draw.line((vessel_x, floor - 55, vessel_x - 40, floor - 260), fill=(84, 99, 74), width=4)
    for index in range(5):
        bx = vessel_x - 40 + rng.randint(-45, 45)
        by = floor - 190 - index * 20
        draw.ellipse((bx - 26, by - 10, bx + 26, by + 10), fill=(106, 118, 88, 210))
    return image.convert("RGB")


def paint_blobs(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = size
    image = _gradient(size, ((9, 9, 30), (27, 22, 69), (55, 45, 118))).convert("RGBA")
    blob_colors = [(91, 67, 190), (54, 106, 220), (166, 88, 210), (31, 31, 90)]
    for _ in range(9):
        color = rng.choice(blob_colors)
        _soft_blob(
            image,
            (rng.randint(0, width), rng.randint(0, height)),
            (rng.randint(width // 8, width // 3), rng.randint(height // 8, height // 2)),
            color,
            rng.randint(70, 150),
            rng.randint(70, 160),
        )
    draw = ImageDraw.Draw(image)
    for index in range(13):
        y = height * (0.18 + index * 0.055)
        points = []
        for x in range(0, width + 20, 20):
            points.append((x, y + math.sin(x / width * math.tau * 1.2 + index * 0.8) * 16))
        draw.line(points, fill=(196, 190, 244, rng.randint(26, 66)), width=1)
    _soft_blob(image, (int(width * 0.7), int(height * 0.25)), (90, 90), (255, 210, 188), 110, 70)
    return image.convert("RGB")


def paint_city(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = size
    image = _gradient(size, ((4, 8, 20), (10, 18, 42), (37, 36, 74))).convert("RGBA")
    moon = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(moon).ellipse(
        (width - 260, 80, width - 160, 180), fill=(226, 219, 198, 200)
    )
    image.alpha_composite(moon.filter(ImageFilter.GaussianBlur(4)))
    _soft_blob(image, (width - 210, 130), (160, 160), (194, 180, 220), 32, 70)
    horizon = int(height * 0.63)
    draw = ImageDraw.Draw(image)
    x = 0
    building_colors = [(8, 13, 27), (11, 17, 35), (16, 22, 44)]
    while x < width:
        building_width = rng.randint(50, 130)
        building_height = rng.randint(int(height * 0.1), int(height * 0.4))
        top = horizon - building_height
        color = rng.choice(building_colors)
        draw.rectangle((x, top, x + building_width, horizon), fill=(*color, 255))
        # windows
        for wx in range(x + 10, x + building_width - 8, 18):
            for wy in range(top + 14, horizon - 8, 22):
                if rng.random() < 0.5:
                    warm = rng.choice([(240, 194, 118), (233, 168, 120), (208, 200, 170)])
                    draw.rectangle((wx, wy, wx + 6, wy + 9), fill=(*warm, rng.randint(110, 230)))
        x += building_width + rng.randint(2, 10)
    # water reflection
    water_top = horizon
    water = image.crop((0, int(height * 0.35), width, horizon))
    water = water.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    water = water.resize((width, height - water_top))
    water = water.filter(ImageFilter.GaussianBlur(6))
    water_rgba = water.convert("RGBA")
    fade = Image.linear_gradient("L").resize((width, water_rgba.height)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    water_rgba.putalpha(fade.point(lambda value: int(value * 0.6)))
    image.alpha_composite(water_rgba, (0, water_top))
    for index in range(20):
        y = rng.randint(water_top, height)
        draw.line(
            (rng.randint(0, width // 2), y, rng.randint(width // 2, width), y),
            fill=(220, 188, 137, rng.randint(20, 70)),
            width=1,
        )
    return image.convert("RGB")


def paint_bloom(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    """A Matisse-inspired cut-paper composition, rendered as an art print."""
    width, height = size
    image = _gradient(size, ((247, 242, 232), (243, 235, 223), (233, 219, 203))).convert("RGBA")

    light = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(light).polygon(
        [(0, 0), (width, 0), (width, int(height * 0.35)), (0, int(height * 0.6))],
        fill=(255, 250, 235, 70),
    )
    image.alpha_composite(light.filter(ImageFilter.GaussianBlur(80)))

    shadows = Image.new("RGBA", size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadows)
    sdraw.ellipse(
        (int(width * 0.5) + 26, int(height * 0.08) + 28, int(width * 1.02) + 26, int(height * 0.64) + 28),
        fill=(84, 62, 50, 45),
    )
    sdraw.rounded_rectangle(
        (int(-width * 0.22), int(height * 0.44), int(width * 0.36), int(height * 0.9)),
        radius=int(width * 0.2),
        fill=(84, 62, 50, 38),
    )
    waves = [(0, int(height * 0.76))]
    for x in range(0, width + 20, 20):
        waves.append((x, int(height * 0.72 + math.sin(x / width * math.tau * 0.9) * 42)))
    waves.extend([(width, height), (0, height)])
    sdraw.polygon([(x + 14, y + 18) for x, y in waves], fill=(84, 62, 50, 40))
    image.alpha_composite(shadows.filter(ImageFilter.GaussianBlur(18)))

    draw = ImageDraw.Draw(image)
    draw.ellipse(
        (int(width * 0.5), int(height * 0.1), int(width * 1.04), int(height * 0.64)),
        fill=(150, 166, 139, 235),
    )
    draw.rounded_rectangle(
        (int(-width * 0.24), int(height * 0.46), int(width * 0.36), int(height * 0.9)),
        radius=int(width * 0.2),
        fill=(207, 158, 139, 240),
    )
    wave = [(0, height)] + waves[:-2] + [(width, height)]
    draw.polygon(wave, fill=(205, 174, 124, 238))
    draw.ellipse(
        (int(width * 0.62), int(height * 0.68), int(width * 0.76), int(height * 0.79)),
        fill=(246, 239, 226, 245),
    )
    draw.line(
        (int(width * 0.24), int(height * 0.34), int(width * 0.3), int(height * 0.83)),
        fill=(83, 95, 72, 215),
        width=3,
    )
    for index in range(4):
        y = int(height * (0.45 + index * 0.085))
        draw.ellipse(
            (int(width * 0.27), y, int(width * 0.36), y + 22),
            fill=(112, 128, 98, 200),
        )
    texture = Image.effect_noise((width, height), 8).convert("RGB")
    image = Image.blend(image.convert("RGB"), texture, 0.035).convert("RGBA")
    return image.convert("RGB")


def paint_fog(size: tuple[int, int], palette: str, seed: int) -> Image.Image:
    rng = random.Random(seed)
    width, height = size
    image = _gradient(size, ((215, 224, 223), (197, 209, 208), (158, 178, 181), (121, 142, 148))).convert("RGBA")
    _soft_blob(image, (int(width * 0.58), int(height * 0.24)), (80, 80), (253, 244, 215), 150, 55)
    draw = ImageDraw.Draw(image)
    ridges = [
        (0.52, (157, 170, 168), 14, 0.10),
        (0.62, (125, 143, 143), 20, 0.13),
        (0.73, (94, 113, 117), 28, 0.16),
        (0.86, (62, 83, 91), 38, 0.20),
    ]
    for baseline_ratio, color, blur, amplitude_ratio in ridges:
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        pdraw = ImageDraw.Draw(layer)
        baseline = height * baseline_ratio
        phase = rng.random() * math.tau
        points = [(0, height)]
        for x in range(0, width + 30, 30):
            y = baseline - abs(math.sin(x / width * math.pi * 2.1 + phase)) * height * amplitude_ratio
            y -= math.sin(x / width * math.tau * 4.5 + phase) * 10
            points.append((x, y))
        points.extend([(width, height)])
        pdraw.polygon(points, fill=(*color, 245))
        image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur / 5)))
    for index in range(4):
        fog_band = Image.new("RGBA", size, (0, 0, 0, 0))
        y = int(height * (0.57 + index * 0.1))
        ImageDraw.Draw(fog_band).rectangle(
            (0, y, width, y + 44), fill=(235, 238, 233, rng.randint(55, 105))
        )
        image.alpha_composite(fog_band.filter(ImageFilter.GaussianBlur(32)))
    return image.convert("RGB")


_PAINTERS = {
    "dunes": paint_dunes,
    "ridge": paint_ridge,
    "tidal": paint_tidal,
    "arch": paint_arch,
    "blobs": paint_blobs,
    "city": paint_city,
    "bloom": paint_bloom,
    "fog": paint_fog,
}


def generate_all(output_dir: str | Path, only_missing: bool = True) -> list[Path]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    created: list[Path] = []
    for index, spec in enumerate(DEMO_ART):
        path = output / spec.filename
        if only_missing and path.is_file():
            continue
        painter = _PAINTERS[spec.style]
        artwork = painter((spec.width, spec.height), spec.palette, seed=41 + index * 7)
        _finish(artwork, path, seed=41 + index * 7)
        created.append(path)
    return created


if __name__ == "__main__":
    written = generate_all(Path(__file__).resolve().parent.parent / "demo_assets")
    print(f"Generated {len(written)} demo artworks.")
