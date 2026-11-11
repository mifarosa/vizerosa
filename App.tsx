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
import { OUTPUT_PX } from './src/spec';

type Picked = { uri: string; width: number; height: number };

export default function App() {
  const { width } = useWindowDimensions();
  const frameW = Math.min(width - 48, 360);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState(true);
  const editor = useRef<CropEditorHandle | null>(null);

  const handle = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled) return;
    const a = res.assets[0];
    setResult(null);
    setPicked({ uri: a.uri, width: a.width, height: a.height });
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
      setResult(out.uri);
    } catch (e) {
      Alert.alert('Hata', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result) return;
    try {
      await deliver(result);
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

          {result && (
            <View style={{ alignItems: 'center' }}>
              <Image
                source={{ uri: result }}
                style={{ width: frameW, height: frameW * (OUTPUT_PX.height / OUTPUT_PX.width), borderWidth: 1, borderColor: '#999' }}
              />
              <Text style={styles.sub}>Hazır. Kaydetmek için aşağıdaki düğmeyi kullan.</Text>
            </View>
          )}

          <View style={styles.row}>
            <Btn label="Galeriden seç" onPress={pickFromLibrary} secondary />
            <Btn label="Fotoğraf çek" onPress={takePhoto} secondary />
          </View>

          {picked && !result && <Btn label="Fotoğrafı oluştur" onPress={make} busy={busy} />}
          {result && (
            <>
              <Btn label="Kaydet / Paylaş" onPress={save} />
              <Btn label="Yeniden ayarla" onPress={() => setResult(null)} secondary />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Btn({ label, onPress, secondary, busy }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
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
  link: { color: '#0a7', fontSize: 14, textAlign: 'center' },
});
