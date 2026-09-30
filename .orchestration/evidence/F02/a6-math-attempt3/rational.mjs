// Independent exact-rational arithmetic on BigInt (A6 attempt 3).
// Written from workshop-math.md §1, §9, §12.5 only. Not derived from
// evidence/F02/math/*.py.

const absB = (x) => (x < 0n ? -x : x);
function gcd(a, b) {
  a = absB(a); b = absB(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

export class Q {
  constructor(n, d = 1n) {
    if (typeof n !== 'bigint' || typeof d !== 'bigint') throw new TypeError('Q needs BigInt');
    if (d === 0n) throw new RangeError('zero denominator');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    this.n = n / g; this.d = d / g;
  }
  static of(x) { return x instanceof Q ? x : new Q(BigInt(x), 1n); }
  add(o) { o = Q.of(o); return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Q.of(o); return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Q.of(o); return new Q(this.n * o.n, this.d * o.d); }
  div(o) { o = Q.of(o); return new Q(this.n * o.d, this.d * o.n); }
  cmp(o) { o = Q.of(o); const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
  isZero() { return this.n === 0n; }
  // Half-even rounding to an integer, applied once to the exact value.
  roundHalfEven() {
    if (this.n < 0n) throw new RangeError('negative value never occurs');
    const q = this.n / this.d, rem = this.n % this.d;
    const twice = 2n * rem;
    if (twice < this.d) return q;
    if (twice > this.d) return q + 1n;
    return (q % 2n === 0n) ? q : q + 1n;
  }
  // §12.5: shortest plain decimal when finite, else p/q lowest terms.
  toExact() {
    if (this.n < 0n) throw new RangeError('negative value never occurs');
    let d = this.d, twos = 0, fives = 0;
    while (d % 2n === 0n) { d /= 2n; twos++; }
    while (d % 5n === 0n) { d /= 5n; fives++; }
    if (d !== 1n) return `${this.n}/${this.d}`;
    const k = Math.max(twos, fives);
    // scale numerator so denominator becomes 10^k
    const scaled = this.n * (10n ** BigInt(k)) / this.d; // exact
    if (k === 0) return scaled.toString();
    let s = scaled.toString().padStart(k + 1, '0');
    let intPart = s.slice(0, s.length - k), frac = s.slice(s.length - k);
    frac = frac.replace(/0+$/, '');
    return frac.length ? `${intPart}.${frac}` : intPart;
  }
}

export const ZERO = new Q(0n);
export const ONE = new Q(1n);
// (1 + bp/10000) as an exact rational
export const factor = (bp) => new Q(10000n + BigInt(bp), 10000n);
