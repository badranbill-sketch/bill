"""Prepare the sketchbook illustrations for the film.

    python3 tools/illustrate.py            # every image listed in assets/illustrations/spec.json
    python3 tools/illustrate.py lake-chairs

For each raw drawing (assets/illustrations/raw/<name>.png, generated on warm paper) this writes three files to
public/illustrations/, used by src/components/InkDrawing.tsx:

  <name>.ink.png    the pen lines alone, on pure white
  <name>.wash.png   the watercolour alone (the lines removed), on pure white
  <name>.time.png   the drawing order: red = when each bit of ink appears, green = when the wash blooms (0 = first)
  <name>.full.png   the finished drawing as transparent ink (for places where it is simply shown, not drawn)

and records each picture's size in src/data/illustrations.json.

White means "no ink": the generated paper is removed and the drawing sits on the film's own paper, with its grain.
ink x wash gives back the original drawing. The component turns white into transparency ("colour to alpha") as it
draws, so a drawing composites correctly inside any camera move, fade or rotation.

The drawing order follows the lines: the ink spreads outwards from the seed points along the strokes and only slowly
jumps across blank paper, so the drawing appears to be drawn rather than wiped on.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets/illustrations/raw"
OUT = ROOT / "public/illustrations"
SPEC = json.loads((ROOT / "assets/illustrations/spec.json").read_text())


def paper_normalise(rgb):
    """Divide by the paper colour so blank paper becomes exactly white. The paper is estimated locally (it is never
    perfectly even in a generated image) as a smoothed bright envelope of the picture."""
    lum = rgb.mean(axis=2)
    # Bright envelope: the 90th percentile in large tiles, then smoothed.
    h, w = lum.shape
    tile = 64
    ty, tx = -(-h // tile), -(-w // tile)
    pad = np.pad(lum, ((0, ty * tile - h), (0, tx * tile - w)), mode="edge")
    tiles = pad.reshape(ty, tile, tx, tile).transpose(0, 2, 1, 3).reshape(ty, tx, -1)
    env = np.percentile(tiles, 92, axis=2)
    env = ndimage.maximum_filter(env, size=3)
    env = ndimage.zoom(env, (h / ty, w / tx), order=1)[:h, :w]
    env = ndimage.gaussian_filter(env, 40)
    paper_rgb = np.array([np.median(rgb[..., c][lum > np.percentile(lum, 80)]) for c in range(3)])
    paper = env[..., None] * (paper_rgb / paper_rgb.mean())[None, None, :]
    out = rgb / np.maximum(paper, 1e-3)
    # White point: anything within a few percent of the paper becomes pure white, so no faint rectangle shows.
    return np.clip(out / SPEC["defaults"]["white_point"], 0, 1)


def feather(img, px):
    """Fade the outer px of the picture to white so its edges never show."""
    h, w = img.shape[:2]
    y = np.minimum(np.arange(h), np.arange(h)[::-1]) / px
    x = np.minimum(np.arange(w), np.arange(w)[::-1]) / px
    m = np.clip(np.minimum.outer(y, x), 0, 1)
    m = m * m * (3 - 2 * m)
    return 1 - (1 - img) * m[..., None]


def split(norm):
    """Separate pen lines from wash. Thin dark strokes vanish under a grey closing (a max then min filter), which
    leaves the soft washes; the lines are what the closing removed."""
    lum = norm.mean(axis=2)
    wash_l = ndimage.grey_closing(lum, size=(7, 7))
    wash_l = ndimage.gaussian_filter(wash_l, 1.2)
    wash_l = np.maximum(wash_l, lum)  # never darker than the original
    ratio = np.clip(lum / np.maximum(wash_l, 1e-3), 0, 1)
    # The wash keeps the picture's colour, the lines take the original colour of the dark strokes.
    wash = np.clip(norm / np.maximum(ratio[..., None], 1e-3), 0, 1)
    wash = np.maximum(wash, norm)
    ink = np.clip(norm / np.maximum(wash, 1e-3), 0, 1)
    return ink, wash


def draw_order(ink, seeds, paper_cost, scale=0.5):
    """Time map in [0, 1]. Geodesic distance from the seeds over a grid where ink is cheap to cross and paper is
    expensive, computed at half resolution then scaled up."""
    dark = 1 - ink.mean(axis=2)
    small = ndimage.zoom(dark, scale, order=1)
    h, w = small.shape
    inkiness = np.clip(small / 0.18, 0, 1)
    cost = 1 + (paper_cost - 1) * (1 - inkiness)
    idx = np.arange(h * w).reshape(h, w)
    rows, cols, vals = [], [], []
    for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
        # Each pixel a(y, x) is linked to b(y + dy, x + dx).
        a = idx[0 : h - dy, max(0, -dx) : w - max(0, dx)]
        b = idx[dy:h, max(0, dx) : w - max(0, -dx)]
        step = np.hypot(dy, dx)
        cw = (cost.ravel()[a.ravel()] + cost.ravel()[b.ravel()]) / 2 * step
        rows += [a.ravel(), b.ravel()]
        cols += [b.ravel(), a.ravel()]
        vals += [cw, cw]
    # A virtual source (node n) linked to each seed; the link weight is the seed's delay, in pixels of travel.
    n = h * w
    diag = np.hypot(h, w)
    for sx, sy, delay in seeds:
        s = idx[int(np.clip(sy * h, 0, h - 1)), int(np.clip(sx * w, 0, w - 1))]
        rows.append(np.array([n]))
        cols.append(np.array([s]))
        vals.append(np.array([delay * diag * 2 + 1e-6]))
    g = coo_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n + 1, n + 1)).tocsr()
    dist = dijkstra(g, indices=n, directed=True)[:n].reshape(h, w)
    dist[~np.isfinite(dist)] = np.nanmax(dist[np.isfinite(dist)])
    on_ink = inkiness > 0.5
    top = np.percentile(dist[on_ink], 99) if on_ink.any() else dist.max()
    t = np.clip(dist / max(top, 1e-6), 0, 1)
    t = ndimage.zoom(t, (ink.shape[0] / h, ink.shape[1] / w), order=1)[: ink.shape[0], : ink.shape[1]]
    t = ndimage.gaussian_filter(t, 1.0)
    # The wash follows the ink over the same region, softer and later.
    tw = ndimage.gaussian_filter(t, 24)
    tw = 0.3 + 0.7 * (tw - tw.min()) / max(tw.max() - tw.min(), 1e-6)
    return np.clip(t, 0, 1), np.clip(tw, 0, 1)


def erase(img, boxes):
    """Paint stray marks (a generator's pseudo-signature, say) out with the paper colour, feathered."""
    rgb = np.asarray(img).astype(np.float64)
    h, w = rgb.shape[:2]
    lum = rgb.mean(axis=2)
    paper = np.median(rgb[lum > np.percentile(lum, 80)], axis=0)
    mask = np.zeros((h, w))
    for l, t, r, b in boxes:
        mask[int(t * h) : int(b * h), int(l * w) : int(r * w)] = 1
    mask = ndimage.gaussian_filter(mask, 6)[..., None]
    return Image.fromarray(np.round(rgb * (1 - mask) + paper * mask).astype(np.uint8))


def color_to_alpha(c):
    """RGB on white -> RGBA: the least opaque ink that, laid over white, gives back exactly c."""
    a = np.max(1 - c, axis=2, keepdims=True)
    rgb = 1 - (1 - c) / np.maximum(a, 1e-4)
    return np.concatenate([np.where(a > 1e-4, rgb, 0), a], axis=2)


def to_png(arr, path, mode="RGB"):
    Image.fromarray(np.round(np.clip(arr, 0, 1) * 255).astype(np.uint8), mode=mode).save(path, optimize=True)


def process(name):
    spec = {**SPEC["defaults"], **SPEC["images"][name]}
    src = RAW / f"{name}.png"
    img = Image.open(src).convert("RGB")
    if spec.get("erase"):
        img = erase(img, spec["erase"])
    if spec.get("crop"):
        l, t, r, b = spec["crop"]
        W, H = img.size
        img = img.crop((int(l * W), int(t * H), int(r * W), int(b * H)))
    width = spec["width"]
    height = round(img.size[1] * width / img.size[0])
    img = img.resize((width, height), Image.LANCZOS)
    rgb = np.asarray(img).astype(np.float64) / 255
    norm = feather(paper_normalise(rgb), spec["feather"])
    ink, wash = split(norm)
    t, tw = draw_order(ink, spec["seeds"], spec["paper_cost"])
    OUT.mkdir(parents=True, exist_ok=True)
    to_png(ink, OUT / f"{name}.ink.png")
    to_png(wash, OUT / f"{name}.wash.png")
    time = np.stack([t, tw, np.zeros_like(t)], axis=2)
    to_png(time, OUT / f"{name}.time.png")
    to_png(color_to_alpha(ink * wash), OUT / f"{name}.full.png", mode="RGBA")
    print(f"{name}: {width}x{height}")
    return {"width": width, "height": height}


if __name__ == "__main__":
    names = sys.argv[1:] or list(SPEC["images"])
    sizes = {}
    manifest = ROOT / "src/data/illustrations.json"
    if manifest.exists():
        sizes = json.loads(manifest.read_text())
    for n in names:
        sizes[n] = process(n)
    manifest.write_text(json.dumps(dict(sorted(sizes.items())), indent=2) + "\n")
