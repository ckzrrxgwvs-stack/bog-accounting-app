// Unbounded "spigot" generator for the decimal digits of pi (Gibbons, 2006).
// Yields one digit at a time forever — the never-ending pie. Uses BigInt so it
// stays exact no matter how far you scroll.

export function* piDigitGenerator(): Generator<number, never, unknown> {
  let q = 1n;
  let r = 0n;
  let t = 1n;
  let k = 1n;
  let n = 3n;
  let l = 3n;

  while (true) {
    if (4n * q + r - t < n * t) {
      yield Number(n);
      const nr = 10n * (r - n * t);
      n = (10n * (3n * q + r)) / t - 10n * n;
      q *= 10n;
      r = nr;
    } else {
      const nr = (2n * q + r) * l;
      const nn = (q * (7n * k) + 2n + r * l) / (t * l);
      q *= k;
      t *= l;
      l += 2n;
      k += 1n;
      n = nn;
      r = nr;
    }
  }
}

/**
 * Stateful streamer: keeps one generator alive and hands back digits in chunks,
 * so a UI can reveal "more" of pi indefinitely without recomputing from scratch.
 */
export class PiStream {
  private gen = piDigitGenerator();
  /** Total digits produced so far (the leading 3 counts as digit #1). */
  count = 0;

  /** Pull `n` more digits as a plain string (no decimal point). */
  next(n: number): string {
    let out = '';
    for (let i = 0; i < n; i++) {
      const { value } = this.gen.next();
      out += String(value);
      this.count += 1;
    }
    return out;
  }
}
