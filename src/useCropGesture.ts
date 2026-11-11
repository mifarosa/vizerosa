import { useCallback, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder } from 'react-native';

export type Transform = { scale: number; x: number; y: number };

type Params = {
  frameW: number;
  frameH: number;
  imgW: number;
  imgH: number;
};

const MAX_ZOOM = 6; // relative to the "cover" scale

/**
 * Pan + pinch + zoom state for positioning an image inside a fixed frame.
 * `scale` is display px per image px; (x, y) is the image's top-left in frame coords.
 * The image always fully covers the frame.
 */
export function useCropGesture({ frameW, frameH, imgW, imgH }: Params) {
  const minScale = Math.max(frameW / imgW, frameH / imgH);
  const maxScale = minScale * MAX_ZOOM;

  const clamp = useCallback(
    (t: Transform): Transform => {
      const scale = Math.min(maxScale, Math.max(minScale, t.scale));
      const x = Math.min(0, Math.max(frameW - imgW * scale, t.x));
      const y = Math.min(0, Math.max(frameH - imgH * scale, t.y));
      return { scale, x, y };
    },
    [frameW, frameH, imgW, imgH, minScale, maxScale],
  );

  const center = useCallback(
    (): Transform =>
      clamp({
        scale: minScale,
        x: (frameW - imgW * minScale) / 2,
        y: (frameH - imgH * minScale) / 2,
      }),
    [clamp, minScale, frameW, frameH, imgW, imgH],
  );

  const [t, setT] = useState<Transform>(center);
  const tRef = useRef(t);
  tRef.current = t;
  const apply = useCallback(
    (next: Transform) => {
      const c = clamp(next);
      tRef.current = c;
      setT(c);
    },
    [clamp],
  );

  const clampRef = useRef(clamp);
  clampRef.current = clamp;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  // Gesture start snapshot
  const start = useRef<{ t: Transform; dist: number; cx: number; cy: number } | null>(null);

  const snapshot = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length >= 2) {
      const [a, b] = touches;
      start.current = {
        t: tRef.current,
        dist: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY),
        cx: (a.locationX + b.locationX) / 2,
        cy: (a.locationY + b.locationY) / 2,
      };
    } else if (touches.length === 1) {
      start.current = { t: tRef.current, dist: 0, cx: touches[0].pageX, cy: touches[0].pageY };
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: snapshot,
        onPanResponderStart: snapshot, // finger count changed
        onPanResponderMove: (e) => {
          const s = start.current;
          if (!s) return;
          const touches = e.nativeEvent.touches;
          if (touches.length >= 2 && s.dist > 0) {
            const [a, b] = touches;
            const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            const ratio = dist / s.dist;
            const scale = s.t.scale * ratio;
            // Keep the pinch center anchored on the same image point.
            const imgX = (s.cx - s.t.x) / s.t.scale;
            const imgY = (s.cy - s.t.y) / s.t.scale;
            applyRef.current({ scale, x: s.cx - imgX * scale, y: s.cy - imgY * scale });
          } else if (touches.length === 1 && s.dist === 0) {
            applyRef.current({
              scale: s.t.scale,
              x: s.t.x + (touches[0].pageX - s.cx),
              y: s.t.y + (touches[0].pageY - s.cy),
            });
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Zoom around the frame center, `zoom` in [0, 1] mapped to [min, max] scale. */
  const setZoom = useCallback(
    (zoom: number) => {
      const cur = tRef.current;
      const scale = minScale + (maxScale - minScale) * zoom;
      const cx = frameW / 2;
      const cy = frameH / 2;
      const imgX = (cx - cur.x) / cur.scale;
      const imgY = (cy - cur.y) / cur.scale;
      applyRef.current({ scale, x: cx - imgX * scale, y: cy - imgY * scale });
    },
    [minScale, maxScale, frameW, frameH],
  );

  const zoom = maxScale === minScale ? 0 : (t.scale - minScale) / (maxScale - minScale);

  /** Source rectangle in image pixels for the current framing. */
  const getCropRect = useCallback(() => {
    const cur = tRef.current;
    const width = Math.min(imgW, Math.round(frameW / cur.scale));
    const height = Math.min(imgH, Math.round(frameH / cur.scale));
    const originX = Math.max(0, Math.min(imgW - width, Math.round(-cur.x / cur.scale)));
    const originY = Math.max(0, Math.min(imgH - height, Math.round(-cur.y / cur.scale)));
    return { originX, originY, width, height };
  }, [frameW, frameH, imgW, imgH]);

  return {
    transform: t,
    panHandlers: panResponder.panHandlers,
    setZoom,
    zoom,
    reset: () => applyRef.current(center()),
    getCropRect,
  };
}
