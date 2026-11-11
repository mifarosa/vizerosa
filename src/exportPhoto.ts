import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { CropRect } from './CropEditor';
import { OUTPUT_PX } from './spec';

/** Crops the chosen region and resizes it to the 35x45 mm @ 300 dpi target. */
export async function renderPhoto(uri: string, rect: CropRect) {
  const ctx = ImageManipulator.manipulate(uri).crop(rect).resize({ width: OUTPUT_PX.width, height: OUTPUT_PX.height });
  const ref = await ctx.renderAsync();
  return ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
}

/** Web: triggers a download. Native: opens the share sheet (includes "Save Image"). */
export async function deliver(uri: string) {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = uri;
    a.download = 'vizerosa-35x45.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Paylaşım bu cihazda kullanılamıyor.');
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Fotoğrafı kaydet / paylaş' });
}
