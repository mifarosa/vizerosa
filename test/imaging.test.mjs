import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { whitenBackground, TOLERANCE } from '../src/whiten.ts';
import { composeSheet, SHEETS } from '../src/sheet.ts';

/** Grey-ish background with a skin-coloured "head" disc and a darker "hair" ring in the middle. */
function synth(w = 413, h = 531, bg = [200, 205, 215]) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = (x - w / 2) / (w * 0.28);
      const dy = (y - h * 0.45) / (h * 0.3);
      const r2 = dx * dx + dy * dy;
      let c = bg;
      if (r2 < 1) c = r2 < 0.6 ? [224, 172, 140] : [50, 35, 30];
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

test('whitens the background and keeps the subject', () => {
  const img = synth();
  const res = whitenBackground(img, TOLERANCE.medium);
  const px = (x, y) => Array.from(res.image.data.slice((y * 413 + x) * 4, (y * 413 + x) * 4 + 3));
  assert.deepEqual(px(5, 5), [255, 255, 255]);
  assert.deepEqual(px(400, 520), [255, 255, 255]);
  assert.deepEqual(px(206, 238), [224, 172, 140]); // face untouched
  assert.ok(res.coverage > 0.4 && res.coverage < 0.9, `coverage ${res.coverage}`);
  assert.ok(Math.abs(res.bg[0] - 200) <= 1);
});

test('does not leak into enclosed regions with the same colour as the background', () => {
  const img = synth();
  // Punch a bg-coloured hole inside the face; it is not connected to the border.
  for (let y = 230; y < 240; y++) for (let x = 200; x < 210; x++) {
    const i = (y * 413 + x) * 4; img.data[i] = 200; img.data[i + 1] = 205; img.data[i + 2] = 215;
  }
  const res = whitenBackground(img, TOLERANCE.medium);
  const i = (235 * 413 + 205) * 4;
  assert.deepEqual(Array.from(res.image.data.slice(i, i + 3)), [200, 205, 215]);
});

test('sheet tiles the photo, 10x15 holds 6', () => {
  const photo = synth();
  const { image, cols, rows } = composeSheet(photo, SHEETS[0]);
  assert.equal(image.width, 1181);
  assert.equal(image.height, 1772);
  assert.equal(cols * rows, 6);
  assert.equal(image.data.length, image.width * image.height * 4);
});

test('sheet 13x18 is bigger and survives a JPEG round-trip', () => {
  const { image, cols, rows } = composeSheet(synth(), SHEETS[1]);
  assert.ok(cols * rows >= 9, `${cols}x${rows}`);
  const enc = jpeg.encode({ width: image.width, height: image.height, data: image.data }, 90);
  const dec = jpeg.decode(enc.data, { useTArray: true });
  assert.equal(dec.width, image.width);
});
