import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CropEditor, CropEditorHandle } from './src/CropEditor';
import { deliver, renderPhoto } from './src/exportPhoto';
import { readJpeg, writeJpeg } from './src/io';
import { composeSheet, SHEETS } from './src/sheet';
import { OUTPUT_PX } from './src/spec';
import { Sensitivity, TOLERANCE, whitenBackground } from './src/whiten';

// Lets React paint the busy indicator before heavy synchronous pixel work.
const nextFrame = () => new Promise<void>((r) => setTimeout(r, 50));

type Picked = { uri: string; width: number; height: number };

export default function App() {
  const { width } = useWindowDimensions();
  const frameW = Math.min(width - 48, 360);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [result, setResult] = useState<string | null>(null); // cropped photo (before whitening)
  const [whitened, setWhitened] = useState<string | null>(null); // after background whitening
  const [sens, setSens] = useState<Sensitivity>('medium');
  const [note, setNote] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ uri: string; label: string; count: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState(true);
  const editor = useRef<CropEditorHandle | null>(null);

  const handle = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled) return;
    const a = res.assets[0];
    resetOutputs();
    setPicked({ uri: a.uri, width: a.width, height: a.height });
  };

  const resetOutputs = () => {
    setResult(null);
    setWhitened(null);
    setSheet(null);
    setNote(null);
  };

  const finalUri = whitened ?? result;

  const whiten = async (level: Sensitivity) => {
    if (!result) return;
    setBusy(true);
    setSheet(null);
    try {
      await nextFrame();
      const img = await readJpeg(result);
      const res = whitenBackground(img, TOLERANCE[level]);
      if (res.coverage < 0.05) {
        setNote('Arka plan algılanamadı. Düz ve açık renkli bir fonda çekilmiş fotoğraf gerekir.');
        setWhitened(null);
        return;
      }
      if (res.coverage > 0.85) {
        setNote('Hassasiyet çok yüksek, yüz de beyazlamış olabilir. Düşürmeyi dene.');
      } else {
        setNote(null);
      }
      setWhitened(await writeJpeg(res.image, 'vizerosa-white.jpg'));
    } catch (e) {
      Alert.alert('Hata', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const makeSheet = async (i: number) => {
    if (!finalUri) return;
    setBusy(true);
    try {
      await nextFrame();
      const photo = await readJpeg(finalUri);
      const spec = SHEETS[i];
      const { image, cols, rows } = composeSheet(photo, spec);
      setSheet({ uri: await writeJpeg(image, 'vizerosa-sheet.jpg', 92), label: spec.name, count: cols * rows });
    } catch (e) {
      Alert.alert('Hata', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf çekmek için kamera iznini açın.');
      return;
    }
    handle(
      await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        quality: 1,
      }),
    );
  };

  const make = async () => {
    if (!picked || !editor.current) return;
    setBusy(true);
    try {
      const out = await renderPhoto(picked.uri, editor.current.getCropRect());
      resetOutputs();
      setResult(out.uri);
    } catch (e) {
      Alert.alert('Hata', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const save = async (uri: string | null, filename: string) => {
    if (!uri) return;
    try {
      await deliver(uri, filename);
    } catch (e) {
      Alert.alert('Hata', String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Schengen Vize Fotoğrafı</Text>
          <Text style={styles.sub}>
            35×45 mm · {OUTPUT_PX.width}×{OUTPUT_PX.height} px · açık arka plan, düz bakış
          </Text>

          {!picked && (
            <View style={styles.card}>
              <Text style={styles.tips}>
                • Düz duvar önünde, açık/beyaz fon{'\n'}• Yüze eşit ışık, gölge yok{'\n'}• Kameraya düz bak, ağzın
                kapalı{'\n'}• Gözlük yansıması, şapka, filtre yok
              </Text>
            </View>
          )}

          {picked && !result && (
            <>
              <CropEditor
                uri={picked.uri}
                imgW={picked.width}
                imgH={picked.height}
                frameW={frameW}
                showGuide={guide}
                controlRef={editor}
              />
              <Pressable onPress={() => setGuide((v) => !v)}>
                <Text style={styles.link}>{guide ? 'Kılavuzu gizle' : 'Kılavuzu göster'}</Text>
              </Pressable>
            </>
          )}

          {result && finalUri && (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Image
                source={{ uri: finalUri }}
                style={{ width: frameW, height: frameW * (OUTPUT_PX.height / OUTPUT_PX.width), borderWidth: 1, borderColor: '#999' }}
              />
              {note && <Text style={styles.warn}>{note}</Text>}
              <Text style={styles.sub}>Arka plan beyazlatma (düz fonlar için)</Text>
              <View style={styles.row}>
                {(['low', 'medium', 'high'] as Sensitivity[]).map((lv) => (
                  <Btn
                    key={lv}
                    label={{ low: 'Düşük', medium: 'Orta', high: 'Yüksek' }[lv]}
                    secondary={!(whitened && sens === lv)}
                    onPress={() => {
                      setSens(lv);
                      whiten(lv);
                    }}
                    disabled={busy}
                  />
                ))}
              </View>
              {whitened && <Text style={styles.link} onPress={() => { setWhitened(null); setSheet(null); setNote(null); }}>Orijinal arka plana dön</Text>}

              <Text style={[styles.sub, { marginTop: 8 }]}>Baskı sayfası</Text>
              <View style={styles.row}>
                {SHEETS.map((sh, i) => (
                  <Btn key={sh.name} label={sh.name} secondary onPress={() => makeSheet(i)} disabled={busy} />
                ))}
              </View>
              {busy && <ActivityIndicator color="#0a7" />}
              {sheet && (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Image source={{ uri: sheet.uri }} style={{ width: frameW, height: frameW * 1.5, borderWidth: 1, borderColor: '#999' }} resizeMode="contain" />
                  <Text style={styles.sub}>{sheet.label} · {sheet.count} adet · 300 dpi. Baskıda “gerçek boyut / ölçekleme yok” seç.</Text>
                  <Btn label="Sayfayı kaydet / paylaş" onPress={() => save(sheet.uri, 'vizerosa-sheet.jpg')} />
                </View>
              )}
            </View>
          )}

          <View style={styles.row}>
            <Btn label="Galeriden seç" onPress={pickFromLibrary} secondary />
            <Btn label="Fotoğraf çek" onPress={takePhoto} secondary />
          </View>

          {picked && !result && <Btn label="Fotoğrafı oluştur" onPress={make} busy={busy} />}
          {result && (
            <>
              <Btn label="Fotoğrafı kaydet / paylaş" onPress={() => save(finalUri, 'vizerosa-35x45.jpg')} />
              <Btn label="Yeniden ayarla" onPress={resetOutputs} secondary />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Btn({ label, onPress, secondary, busy, disabled }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={[styles.btn, secondary ? styles.btnSecondary : styles.btnPrimary]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.btnTxt, secondary && { color: '#0a7' }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, gap: 14, alignItems: 'stretch' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#f4f8f6', borderRadius: 12, padding: 16 },
  tips: { fontSize: 14, lineHeight: 22, color: '#333' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#0a7' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#0a7' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  warn: { color: '#b45309', fontSize: 13, textAlign: 'center' },
  link: { color: '#0a7', fontSize: 14, textAlign: 'center' },
});
