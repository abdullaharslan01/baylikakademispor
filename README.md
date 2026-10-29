# Baylık Akademi Spor Kulübü — Demo Site

Yüzme (Eryaman), taekwondo (Sincan) ve kickboks için tanıtım sitesinin **demo** sürümü.
Tek dosya: `index.html` (HTML + CSS + JS). 3D sahne Three.js `0.160.0` ile CDN'den yüklenir.

## Konsept: "Tek sporcu, üç dünya"
Kaydırdıkça aynı sporcu çıkış bloğundan balıklama atlar, kulvarda yüzer, suyun altına iner;
havuz tabanı yükselip taekwondo minderine dönüşür, sonra ışıklar kararır ve kickboksa geçilir.

## Çalıştırma
```bash
python3 -m http.server 8765        # http://localhost:8765
docker compose up -d --build        # http://localhost:8080
```

## Görünüm modları
- `?3d` → her koşulda 3D
- `?lite` → sade (CSS) sürüm
- Otomatik: WebGL yoksa, cihaz zayıfsa veya "hareketi azalt" açıksa sade sürüm; 3D yavaşsa önce
  çözünürlük düşer, yine yavaşsa sade sürüme geçilir.

## Demo içerik
Kodda `TODO (DEMO)` ile işaretli yerler örnek bilgidir (eğitmen belgeleri, ders saatleri,
yorumlar, blog yazıları). Yayından önce kulüple teyit edilmeli.
