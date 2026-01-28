# BarcodeScanner Bileşeni

> **Bileşen:** BarcodeScanner
> **Konum:** `src/components/BarcodeScanner.tsx`
> **Son Güncelleme:** 28 Ocak 2026

## Genel Bakış

BarcodeScanner, React Native Vision Camera kullanarak barkod ve QR kod tarama özelliği sağlayan tam ekran modal bileşenidir. Otomatik odaklama, el feneri kontrolü ve yüksek çözünürlüklü kamera desteği içerir.

## Özellikler

- Tam ekran modal tarama arayüzü
- Otomatik odaklama (Auto-focus)
- Dokunarak odaklama (Tap-to-focus)
- El feneri (Torch) kontrolü
- Animasyonlu tarama çizgisi
- Çoklu barkod formatı desteği
- Yüksek çözünürlük kamera formatı (1920x1080)
- İzin yönetimi (Permission handling)

## Props

| Prop | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `visible` | boolean | Evet | - | Modal görünürlüğü |
| `onClose` | () => void | Evet | - | Modal kapatma callback |
| `onBarcodeScanned` | (barcode: string) => void | Evet | - | Barkod okunduğunda callback |
| `title` | string | Hayır | "Barkod Tara" | Modal başlık metni |

## Kullanım

```tsx
import BarcodeScanner from '../components/BarcodeScanner';

function MyScreen() {
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScanned = (barcode: string) => {
    console.log('Okunan barkod:', barcode);
    // Barkod ile işlem yap
  };

  return (
    <>
      <Button onPress={() => setShowScanner(true)} title="Barkod Tara" />

      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
        title="Ürün Barkodu Tara"
      />
    </>
  );
}
```

## Desteklenen Barkod Formatları

| Format | Açıklama |
|--------|----------|
| `qr` | QR Code |
| `ean-13` | EAN-13 (Avrupa Ürün Numarası) |
| `ean-8` | EAN-8 |
| `code-128` | Code 128 |
| `code-39` | Code 39 |
| `code-93` | Code 93 |
| `codabar` | Codabar |
| `itf` | ITF (Interleaved 2 of 5) |
| `upc-a` | UPC-A (ABD Ürün Kodu) |
| `upc-e` | UPC-E |

## Teknik Detaylar

### Kamera Formatı

Optimal barkod okuma performansı için yüksek çözünürlüklü format kullanılır:

```typescript
const format = useCameraFormat(device, [
  { videoResolution: { width: 1920, height: 1080 } },
  { fps: 30 },
]);
```

### Otomatik Odaklama (Auto-Focus)

Sistem üç katmanlı odaklama stratejisi kullanır:

1. **Başlangıç odaklama** - Kamera hazır olduktan 300ms sonra
2. **Periyodik odaklama** - Her 1.5 saniyede bir
3. **Dokunarak odaklama** - Kullanıcı tarama alanına dokunduğunda

```typescript
// Odaklama fonksiyonu
const triggerFocus = async () => {
  if (cameraRef.current && device?.supportsFocus && isCameraReady) {
    try {
      await cameraRef.current.focus({ x: 0.5, y: 0.5 });
    } catch (e) {
      // Focus failed, ignore
    }
  }
};

// Kamera hazır olduğunda
const handleCameraInitialized = () => {
  setIsCameraReady(true);
  setTimeout(triggerFocus, 300);
};

// Periyodik odaklama (1.5 saniye)
useEffect(() => {
  let focusInterval = null;
  if (isActive && isCameraReady && device?.supportsFocus) {
    focusInterval = setInterval(triggerFocus, 1500);
  }
  return () => {
    if (focusInterval) clearInterval(focusInterval);
  };
}, [isActive, isCameraReady, device]);
```

### Kamera Props

```typescript
<Camera
  ref={cameraRef}
  style={StyleSheet.absoluteFill}
  device={device}
  isActive={isActive}
  codeScanner={codeScanner}
  torch={torchOn ? 'on' : 'off'}
  format={format}
  onInitialized={handleCameraInitialized}
  onError={(error) => console.log('Camera error:', error)}
  enableZoomGesture={false}
  exposure={0}
  videoStabilizationMode="off"
/>
```

### Tarama Alanı

Tarama çerçevesi boyutları:
- Konteyner: 340x340 piksel
- İç çerçeve: 300x300 piksel (20px padding)
- Border radius: 32px
- Border width: 3px

### Animasyonlu Tarama Çizgisi

```typescript
// Scan line animasyonu
const startScanAnimation = () => {
  scanLineAnim.setValue(0);
  animationRef.current = Animated.loop(
    Animated.sequence([
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(scanLineAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ])
  );
  animationRef.current.start();
};
```

## İzin Yönetimi

Bileşen kamera izinlerini otomatik olarak yönetir:

1. İzin durumu kontrol edilir
2. `not-determined` ise izin istenir
3. Reddedilirse `PermissionModal` gösterilir

```typescript
const checkCameraPermission = () => {
  const cameraPermission = Camera.getCameraPermissionStatus();

  if (cameraPermission === 'granted') {
    setHasPermission(true);
    setIsActive(true);
  } else if (cameraPermission === 'not-determined') {
    setShowPermissionModal(true);
  } else {
    setShowPermissionModal(true);
  }
};
```

## UI Bileşenleri

### Header
- Sol: El feneri butonu
- Orta: Başlık
- Sağ: Kapatma butonu

### Tarama Alanı
- Golaks logosu (üstte)
- Kamera görüntüsü (ortada, çerçeve içinde)
- Animasyonlu tarama çizgisi

### Talimatlar (Alt)
- "Barkodu kare içine yerleştirin"
- "Odaklamak için dokunun"
- Desteklenen formatlar listesi

## Stil Özellikleri

| Öğe | Değer |
|-----|-------|
| Arka plan | #000000 (siyah) |
| Çerçeve rengi | colors.primary |
| Çerçeve kalınlığı | 3px |
| Çerçeve köşe | 32px radius |
| Header padding (iOS) | top: 50px |
| Header padding (Android) | top: 16px |
| Buton boyutu | 44x44px |
| Buton köşe | 22px radius |

## Performans İpuçları

1. **Video stabilizasyon kapalı** - Daha hızlı işleme
2. **Exposure 0** - Varsayılan pozlama
3. **Zoom gesture devre dışı** - Tarama kararlılığı
4. **FPS 30** - Akıcı önizleme

## Bağımlılıklar

```json
{
  "react-native-vision-camera": "^4.x",
  "react-native-vector-icons": "^10.x"
}
```

## İlgili Bileşenler

- `PermissionModal` - Kamera izni modal
- `Header` - Standart header bileşeni

## Sorun Giderme

### Odaklama çalışmıyor
- `isCameraReady` state'in true olduğundan emin olun
- `device?.supportsFocus` kontrol edin
- iOS'ta cihaz odaklama desteği olmalı

### Barkod okunmuyor
- Yeterli ışık olduğundan emin olun
- El fenerini açın
- Barkodu tarama alanına yaklaştırın
- Barkodun desteklenen formatta olduğunu kontrol edin

### Kamera siyah ekran
- Kamera izinlerini kontrol edin
- `isActive` state'in true olduğunu doğrulayın
- Device'ın null olmadığından emin olun
