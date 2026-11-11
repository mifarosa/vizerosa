import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ASPECT, GUIDE, HEAD_MM, PHOTO_MM } from './spec';
import { useCropGesture } from './useCropGesture';

export type CropRect = { originX: number; originY: number; width: number; height: number };

export type CropEditorHandle = { getCropRect: () => CropRect };

type Props = {
  uri: string;
  imgW: number;
  imgH: number;
  frameW: number;
  showGuide: boolean;
  controlRef: React.MutableRefObject<CropEditorHandle | null>;
};

export function CropEditor({ uri, imgW, imgH, frameW, showGuide, controlRef }: Props) {
  const frameH = Math.round(frameW / ASPECT);
  const g = useCropGesture({ frameW, frameH, imgW, imgH });
  controlRef.current = { getCropRect: g.getCropRect };

  const { scale, x, y } = g.transform;
  const trackW = frameW - 80;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.frame, { width: frameW, height: frameH }]} {...g.panHandlers}>
        <Image
          source={{ uri }}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: imgW * scale,
            height: imgH * scale,
          }}
        />
        {showGuide && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Crown line */}
            <View style={[styles.line, { top: GUIDE.crownY * frameH }]} />
            {/* Chin line */}
            <View style={[styles.line, { top: GUIDE.chinY * frameH }]} />
            {/* Head oval */}
            <View
              style={[
                styles.oval,
                {
                  width: GUIDE.headWidth * frameW,
                  height: (GUIDE.chinY - GUIDE.crownY) * frameH,
                  left: ((1 - GUIDE.headWidth) / 2) * frameW,
                  top: GUIDE.crownY * frameH,
                },
              ]}
            />
            {/* Vertical center line */}
            <View style={[styles.vline, { left: frameW / 2 }]} />
          </View>
        )}
      </View>

      <Text style={styles.hint}>
        Sürükle: konumlandır · İki parmakla: yakınlaştır
      </Text>
      <Text style={styles.hintSmall}>
        Çıktı {PHOTO_MM.width}×{PHOTO_MM.height} mm · Baş (çene–tepe) {HEAD_MM.min}–{HEAD_MM.max} mm olmalı
      </Text>

      <View style={styles.zoomRow}>
        <Pressable style={styles.zoomBtn} onPress={() => g.setZoom(Math.max(0, g.zoom - 0.1))}>
          <Text style={styles.zoomTxt}>−</Text>
        </Pressable>
        <View
          style={[styles.track, { width: trackW }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => g.setZoom(Math.min(1, Math.max(0, e.nativeEvent.locationX / trackW)))}
          onResponderMove={(e) => g.setZoom(Math.min(1, Math.max(0, e.nativeEvent.locationX / trackW)))}
        >
          <View pointerEvents="none" style={[styles.fill, { width: g.zoom * trackW }]} />
          <View pointerEvents="none" style={[styles.thumb, { left: g.zoom * trackW - 11 }]} />
        </View>
        <Pressable style={styles.zoomBtn} onPress={() => g.setZoom(Math.min(1, g.zoom + 0.1))}>
          <Text style={styles.zoomTxt}>+</Text>
        </Pressable>
      </View>
      <Pressable onPress={g.reset}>
        <Text style={styles.link}>Sıfırla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: '#e8e8e8', overflow: 'hidden', borderWidth: 1, borderColor: '#999' },
  line: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,160,80,0.9)' },
  vline: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,160,80,0.35)' },
  oval: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(0,160,80,0.9)',
    borderRadius: 999,
    borderStyle: 'dashed',
  },
  hint: { marginTop: 10, fontSize: 14, color: '#333' },
  hintSmall: { marginTop: 2, fontSize: 12, color: '#777', textAlign: 'center' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomTxt: { fontSize: 22, lineHeight: 24, color: '#222' },
  track: { height: 24, justifyContent: 'center' },
  fill: { position: 'absolute', height: 4, backgroundColor: '#0a7', borderRadius: 2 },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#0a7' },
  link: { marginTop: 10, color: '#0a7', fontSize: 14 },
});
