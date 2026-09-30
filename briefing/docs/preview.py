#!/usr/bin/env python3
"""Render every page of a PDF to PNG, plus a contact sheet, and report fonts.

    <venv>/bin/python docs/preview.py <file.pdf> [--out DIR] [--dpi 110] [--cols 4]
                                      [--zoom PAGE:X,Y,W,H] [--zoom-dpi 300]

Writes DIR/page-01.png … and DIR/contact-sheet.png.
Default DIR: <pdf folder>/previews/<pdf name without .pdf>/ (so docs-out/sample.pdf -> docs-out/previews/sample/).
--zoom renders one region at high resolution (inches from the page's top-left), e.g. --zoom 2:1,1,3,2,
to check line weights, tags and the drawings' washes up close. Repeatable.
Fonts: lists every font embedded in the PDF and warns when one is not Newsreader or Source Sans 3
(a fallback font means a glyph is missing from the bundled latin subsets).
Needs PyMuPDF (pip install pymupdf).
"""
import argparse
import os
import sys

import pymupdf  # PyMuPDF

HOUSE_FONTS = ("Newsreader", "SourceSans3", "Source Sans 3", "SourceSans")
CODE_FONTS = ("DejaVuSansMono", "LiberationMono")  # code samples in pre blocks only (writer's reference)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf")
    ap.add_argument("--out")
    ap.add_argument("--dpi", type=int, default=110)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--thumb", type=int, default=380, help="contact-sheet thumbnail width in px")
    ap.add_argument("--zoom", action="append", default=[], help="PAGE:X,Y,W,H in inches")
    ap.add_argument("--zoom-dpi", type=int, default=300)
    a = ap.parse_args()

    pdf = os.path.abspath(a.pdf)
    stem = os.path.splitext(os.path.basename(pdf))[0]
    out = os.path.abspath(a.out or os.path.join(os.path.dirname(pdf), "previews", stem))
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.startswith(("page-", "zoom-")) and f.endswith(".png"):
            os.remove(os.path.join(out, f))

    doc = pymupdf.open(pdf)
    n = doc.page_count
    thumbs = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=a.dpi, alpha=False)
        path = os.path.join(out, f"page-{i + 1:02d}.png")
        pix.save(path)
        scale = a.thumb / page.rect.width * 72 / 72
        thumbs.append(page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False))
    print(f"{n} page(s) at {a.dpi} dpi -> {out}/page-01.png … page-{n:02d}.png")

    # Contact sheet: thumbnails on a neutral grey board, page numbers underneath.
    cols = max(1, min(a.cols, n))
    rows = (n + cols - 1) // cols
    tw, th = thumbs[0].width, thumbs[0].height
    gap, label = 28, 26
    W = cols * tw + (cols + 1) * gap
    H = rows * (th + label) + (rows + 1) * gap
    sheet = pymupdf.open()
    sp = sheet.new_page(width=W, height=H)
    sp.draw_rect(sp.rect, color=None, fill=(0.86, 0.86, 0.85))
    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        x = gap + c * (tw + gap)
        y = gap + r * (th + label + gap)
        sp.draw_rect(pymupdf.Rect(x + 3, y + 3, x + tw + 3, y + th + 3), color=None, fill=(0.72, 0.72, 0.71))
        sp.insert_image(pymupdf.Rect(x, y, x + tw, y + th), pixmap=t)
        sp.insert_text((x, y + th + 18), f"{i + 1}", fontsize=13, color=(0.25, 0.28, 0.32))
    sheet_path = os.path.join(out, "contact-sheet.png")
    sp.get_pixmap(dpi=72, alpha=False).save(sheet_path)
    print(f"contact sheet -> {sheet_path}")

    for z in a.zoom:
        pg, box = z.split(":")
        x, y, w, h = (float(v) * 72 for v in box.split(","))
        page = doc[int(pg) - 1]
        clip = pymupdf.Rect(x, y, x + w, y + h)
        pix = page.get_pixmap(dpi=a.zoom_dpi, clip=clip, alpha=False)
        zp = os.path.join(out, f"zoom-p{int(pg):02d}-{box.replace(',', '_')}.png")
        pix.save(zp)
        print(f"zoom -> {zp}")

    # Fonts actually embedded.
    fonts = {}
    for i, page in enumerate(doc):
        for f in page.get_fonts(full=True):
            name = f[3].split("+")[-1]
            fonts.setdefault(name, set()).add(i + 1)
    print("fonts:")
    bad = []
    for name, pages in sorted(fonts.items()):
        ok = any(h.replace(" ", "") in name.replace(" ", "") for h in HOUSE_FONTS)
        code = any(c in name for c in CODE_FONTS)
        pl = ",".join(str(p) for p in sorted(pages))
        print(f"  {'ok  ' if ok else 'code' if code else 'WARN'} {name}  (pages {pl}){'  <- fine only in pre code samples' if code else ''}")
        if not ok and not code:
            bad.append(name)
    if bad:
        print("warning: fallback font(s) embedded; a glyph is probably missing from the bundled fonts: " + ", ".join(bad))
    size = doc[0].rect
    print(f"page size: {size.width / 72:.2f} x {size.height / 72:.2f} in")
    return 0


if __name__ == "__main__":
    sys.exit(main())
