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

## Not included yet
- Background removal / whitening, automatic face detection, print sheet (4×6").
