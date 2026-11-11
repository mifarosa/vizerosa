import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import jpeg from 'jpeg-js';
import type { RGBA } from './whiten';

export async function readJpeg(uri: string): Promise<RGBA> {
  const buf =
    Platform.OS === 'web'
      ? await (await fetch(uri)).arrayBuffer()
      : await new File(uri).arrayBuffer();
  const img = jpeg.decode(new Uint8Array(buf), { useTArray: true, formatAsRGBA: true });
  return { width: img.width, height: img.height, data: img.data };
}

/** Encodes to JPEG and returns a URI usable by <Image> and the share sheet. */
export async function writeJpeg(img: RGBA, name: string, quality = 95): Promise<string> {
  const out = jpeg.encode(
    { width: img.width, height: img.height, data: img.data as Uint8Array },
    quality,
  );
  const bytes = new Uint8Array(out.data);
  if (Platform.OS === 'web') {
    return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  }
  const file = new File(Paths.cache, `${Date.now()}-${name}`);
  file.create({ overwrite: true });
  file.write(bytes);
  return file.uri;
}
