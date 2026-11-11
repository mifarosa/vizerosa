import type { RGBA } from './whiten';

export type SheetSpec = { name: string; widthMm: number; heightMm: number };

export const SHEETS: SheetSpec[] = [
  { name: '10×15 cm', widthMm: 100, heightMm: 150 },
  { name: '13×18 cm', widthMm: 130, heightMm: 180 },
];

const mmToPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

/** Tiles `photo` on a white sheet, as many as fit, centred, with thin grey cut guides. */
export function composeSheet(
  photo: RGBA,
  sheet: SheetSpec,
  dpi = 300,
  marginPx = 30,
  gapPx = 16,
): { image: RGBA; cols: number; rows: number } {
  const W = mmToPx(sheet.widthMm, dpi);
  const H = mmToPx(sheet.heightMm, dpi);
  const tw = photo.width;
  const th = photo.height;

  const cols = Math.max(1, Math.floor((W - 2 * marginPx + gapPx) / (tw + gapPx)));
  const rows = Math.max(1, Math.floor((H - 2 * marginPx + gapPx) / (th + gapPx)));
  const gridW = cols * tw + (cols - 1) * gapPx;
  const gridH = rows * th + (rows - 1) * gapPx;
  const x0 = Math.floor((W - gridW) / 2);
  const y0 = Math.floor((H - gridH) / 2);

  const data = new Uint8Array(W * H * 4).fill(255);
  const src = photo.data;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ox = x0 + c * (tw + gapPx);
      const oy = y0 + r * (th + gapPx);
      for (let y = 0; y < th; y++) {
        const from = y * tw * 4;
        data.set(src.subarray(from, from + tw * 4), ((oy + y) * W + ox) * 4);
      }
      // 1px grey outline just outside the tile (cut guide).
      const grey = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        const i = (y * W + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 190;
      };
      for (let x = ox - 1; x <= ox + tw; x++) {
        grey(x, oy - 1);
        grey(x, oy + th);
      }
      for (let y = oy - 1; y <= oy + th; y++) {
        grey(ox - 1, y);
        grey(ox + tw, y);
      }
    }
  }
  return { image: { width: W, height: H, data }, cols, rows };
}
