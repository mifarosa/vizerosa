# Vizerosa

Schengen vize fotoğrafı hazırlayıcı: 35×45 mm, 300 dpi, kılavuzlu kırpma (Expo / React Native).

Expo (React Native + TypeScript) app that crops a photo to the Schengen visa format:
35×45 mm, exported at 300 dpi (413×531 px) as JPEG.

## Run
    npm install
    npx expo start        # scan the QR with Expo Go, or press w for web

## How it works
- Pick from gallery or take a photo (front camera).
- Drag / pinch (or use the slider) to place the face inside the 35:45 frame.
  Green guides show crown, chin and head oval (head must be 32–36 mm of 45 mm).
- "Create" crops + resizes with expo-image-manipulator, then share/save (download on web).

## Background whitening
No ML: estimates the background colour from the image border, flood-fills similar pixels
and blends them to white (3 sensitivity levels). Works for plain, light backgrounds;
busy backgrounds are not supported. If it eats into the face, lower the sensitivity.

## Print sheets
Tiles the finished photo on a white 10×15 cm (6 photos) or 13×18 cm sheet at 300 dpi,
with thin grey cut guides. Print at actual size (no scaling).

## Tests
    npm test              # whitening + sheet layout, plain Node
    npm run typecheck

## Not included yet
- Automatic face detection / head-size check, real background segmentation (ML).
