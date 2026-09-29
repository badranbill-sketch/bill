#!/usr/bin/env bash
# Cut real pieces of the guide out of the PDF (400 dpi) into public/guide/, for the "simple by design" scene.
# Never crop the scoring box under the five questions (p. 13, "0 à 2 … 5 Bravo!"): the film shows no scores.
# Regions are in "page units" of the page rendered at 110 dpi (935 × 1210), as measured on the guide.
#   tools/guide_assets.sh [path/to/guide.pdf]
set -euo pipefail
cd "$(dirname "$0")/.."
PDF="${1:-assets/source/Guide_prosperite_financiere_Bill_Badran.pdf}"
OUT=public/guide
mkdir -p "$OUT"
DPI=400

crop() { # name page x0 y0 x1 y1  (page units at 110 dpi)
  local name=$1 page=$2
  local s; s=$(python3 -c "print($DPI/110)")
  local x y w h
  x=$(python3 -c "print(round($3*$s))"); y=$(python3 -c "print(round($4*$s))")
  w=$(python3 -c "print(round(($5-$3)*$s))"); h=$(python3 -c "print(round(($6-$4)*$s))")
  pdftoppm -r $DPI -f "$page" -l "$page" -x "$x" -y "$y" -W "$w" -H "$h" -png -singlefile "$PDF" "$OUT/$name"
  echo "  $OUT/$name.png  (p. $page, ${w}×${h})"
}

crop story     3  40 211 895 358   # Nathalie's story card
crop question  4  40 704 895 840   # "La question à vous poser" note
crop spending 10  40 160 895 515   # retirement spending in three stages
crop checklist 12 40 340 895 655   # "Appelez avant de…" checklist
crop questions 13 40 293 895 782   # "Votre bilan éclair en 5 questions": the five questions only, not the "Comptez vos oui" scoring below
