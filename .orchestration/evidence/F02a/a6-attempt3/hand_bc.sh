#!/bin/bash
# Third path: hand closed forms for WM37-WM40 with GNU bc at scale 80 (decimal long arithmetic,
# no code shared with the JS model). Prints exact values; half-even rounding is done in bc by
# inspecting the fractional part (all tie candidates here are finite decimals, so scale 80 is exact
# for the nominal values; deflated values are quotients and are printed to 30 places).
set -u
bc -q <<'EOF'
scale=80
define he(x) {            /* half-even to integer, x >= 0 */
  auto i, f, s
  s = scale; scale = 0; i = x / 1; scale = s
  f = x - i
  if (f > 0.5) return (i + 1)
  if (f < 0.5) return (i)
  scale = 0; if (i % 2 == 0) { scale = s; return (i) }
  scale = s; return (i + 1)
}
define p(b, n) { auto r, k; r = 1; for (k = 0; k < n; k++) r = r * b; return (r) }
print "== WM37: A=55 R=65 H=5 i=2%; src-1 2,400,000 q=0 s=10; src-2 600,000 q=3% s=12; src-3 1,200,000 q=1% s=5; spending 6,000,000\n"
for (t = 10; t <= 14; t++) {
  d = 6000000 * p(1.02, t)
  p1 = 2400000 * p(1.02, 10)
  p2 = 0; if (t >= 12) p2 = 600000 * p(1.02, 12) * p(1.03, t - 12)
  p3 = 1200000 * p(1.02, 5) * p(1.01, t - 5)
  inc = p1 + p2 + p3
  g = d - inc
  print "t=", t, " D=", he(d), " P1=", he(p1), " P2=", he(p2), " P3=", he(p3), " net=", he(inc), " G=", he(g), " Gtoday=", he(g / p(1.02, t)), "\n"
  print "    exact G=", g, "\n"
  /* faulty: growth by (1+q)^s before start */
  f1 = 2400000
  f2 = 0; if (t >= 12) f2 = 600000 * p(1.03, t)
  f3 = 1200000 * p(1.01, t)
  print "    fault(1+q)^s: G=", he(d - f1 - f2 - f3), " overstated by ", he(d - f1 - f2 - f3) - he(g), "\n"
}
print "== WM38: A=60 R=62 H=6 i=0; partner 55->57; joint src-1 1,200,000 from age 65; joint src-2 600,000 until age 64; spending 4,800,000\n"
for (t = 2; t <= 7; t++) {
  s1 = 0; if (t >= 65 - 60) s1 = 1200000
  s2 = 0; if (t < 64 - 60) s2 = 600000
  f1 = 0; if (t >= 65 - 55) f1 = 1200000
  f2 = 0; if (t < 64 - 55) f2 = 600000
  print "t=", t, " contract G=", 4800000 - s1 - s2, " partner-reading G=", 4800000 - f1 - f2, " partner_age=", 55 + t, "\n"
}
print "== WM39: A=R=70 H=3 i=1%; two net sources 1,000,050 q=1% already receiving; spending 3,000,000\n"
for (t = 0; t <= 2; t++) {
  d = 3000000 * p(1.01, t); r = 1000050 * p(1.01, t)
  print "t=", t, " row exact=", r, " row=", he(r), " group=", he(2 * r), " sum-of-rows=", 2 * he(r), " G=", he(d - 2 * r), " Gtoday=", he((d - 2 * r) / p(1.01, t)), "\n"
}
print "== WM40: A=R=70 H=3 i=1.5%; net 1,000,077 q=0 already receiving; spending 2,000,001\n"
for (t = 0; t <= 2; t++) {
  d = 2000001 * p(1.015, t); g = d - 1000077
  print "t=", t, " G exact=", g, " G=", he(g), " Gtoday(exact)=", he(g / p(1.015, t)), " Gtoday(from rounded)=", he(he(g) / p(1.015, t)), "\n"
  scale = 30; print "    exact/defl=", g / p(1.015, t), "  rounded/defl=", he(g) / p(1.015, t), "\n"; scale = 80
}
EOF
