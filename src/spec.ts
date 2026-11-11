// Schengen visa photo specification (ICAO-based, 35 x 45 mm).
export const PHOTO_MM = { width: 35, height: 45 };
export const DPI = 300;
// 35 mm / 25.4 * 300 ≈ 413 px, 45 mm / 25.4 * 300 ≈ 531 px
export const OUTPUT_PX = {
  width: Math.round((PHOTO_MM.width / 25.4) * DPI),
  height: Math.round((PHOTO_MM.height / 25.4) * DPI),
};
export const ASPECT = PHOTO_MM.width / PHOTO_MM.height;

// Head (chin to crown) must be 32-36 mm of the 45 mm height.
export const HEAD_MM = { min: 32, max: 36 };
// Guide positions as fractions of the photo height (top of frame = 0).
export const GUIDE = {
  crownY: 0.11, // top of head ~5 mm from top edge
  chinY: 0.11 + 34 / 45, // head height ~34 mm (middle of 32-36)
  headWidth: 0.55,
};
