// Background whitening for plain-background photos (no ML).
// Flood-fills from the image border over pixels close to the estimated background colour,
// then feathers the mask edge and blends the masked area to pure white.

export type RGBA = { width: number; height: number; data: Uint8Array | Uint8ClampedArray };

export type WhitenResult = {
  image: RGBA;
  /** Estimated background colour [r, g, b]. */
  bg: [number, number, number];
  /** Fraction of pixels that were treated as background (0..1). */
  coverage: number;
};

/** Sensitivity levels: max RGB distance from the background colour that still counts as background. */
export const TOLERANCE = { low: 28, medium: 48, high: 72 } as const;
export type Sensitivity = keyof typeof TOLERANCE;

function median(values: number[]): number {
  const s = values.slice().sort((a, b) => a - b);
  return s[s.length >> 1];
}

export function whitenBackground(src: RGBA, tolerance: number): WhitenResult {
  const { width: w, height: h } = src;
  const d = src.data;
  const n = w * h;

  // 1. Estimate background colour from the top, left and right borders (bottom usually has shoulders).
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(d[i]);
    gs.push(d[i + 1]);
    bs.push(d[i + 2]);
  };
  for (let x = 0; x < w; x++) push(x, 0);
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const bg: [number, number, number] = [median(rs), median(gs), median(bs)];
  const tol2 = tolerance * tolerance;

  const isBg = (p: number) => {
    const i = p * 4;
    const dr = d[i] - bg[0];
    const dg = d[i + 1] - bg[1];
    const db = d[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db <= tol2;
  };

  // 2. Flood fill (4-connected) from every border pixel that matches the background.
  const mask = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const seed = (p: number) => {
    if (!mask[p] && isBg(p)) {
      mask[p] = 1;
      stack[sp++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (sp > 0) {
    const p = stack[--sp];
    const x = p % w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w);
    if (p < n - w) seed(p + w);
  }

  // 3. Grow the background by 1px so the original background tint does not survive on edges.
  const grown = new Uint8Array(mask);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (mask[p]) continue;
      if (
        (x > 0 && mask[p - 1]) ||
        (x < w - 1 && mask[p + 1]) ||
        (y > 0 && mask[p - w]) ||
        (y < h - 1 && mask[p + w])
      ) {
        grown[p] = 1;
      }
    }
  }

  // 4. Feather with a 3x3 box blur to get a soft alpha, then blend to white.
  const out = new Uint8ClampedArray(d.length);
  let covered = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += grown[yy * w + xx];
          cnt++;
        }
      }
      const a = sum / cnt;
      const p = y * w + x;
      const i = p * 4;
      if (grown[p]) covered++;
      out[i] = d[i] * (1 - a) + 255 * a;
      out[i + 1] = d[i + 1] * (1 - a) + 255 * a;
      out[i + 2] = d[i + 2] * (1 - a) + 255 * a;
      out[i + 3] = 255;
    }
  }

  return { image: { width: w, height: h, data: out }, bg, coverage: covered / n };
}
