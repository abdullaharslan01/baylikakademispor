#!/bin/sh
# Google Places API anahtarını kaydeder ve yorumları ilk kez çeker (sunucuda): ./scripts/google-anahtar.sh
set -eu
cd "$(dirname "$0")/.."
echo "Google Cloud'da oluşturduğun API anahtarını yapıştır (Cmd+V) ve Enter'a bas:"
stty -echo; read -r ANAHTAR; stty echo; echo
[ ${#ANAHTAR} -ge 30 ] || { echo "✗ Anahtar çok kısa görünüyor, tekrar dene."; exit 1; }
ANAHTAR="$ANAHTAR" docker compose exec -T -e ANAHTAR php php -r '
  require "/srv/www/_inc/yorumlar.php";
  $dosya = "/srv/data/config.php";
  $s = file_get_contents($dosya);
  $deger = var_export(getenv("ANAHTAR"), true);
  if (preg_match("/\x27google_places_anahtari\x27\s*=>/", $s)) {
      $s = preg_replace_callback("/(\x27google_places_anahtari\x27\s*=>\s*)\x27[^\x27]*\x27/", fn ($m) => $m[1] . $deger, $s, 1);
  } else {
      $s = preg_replace("/\];\s*$/", "    \x27google_places_anahtari\x27 => " . $deger . ",\n];\n", $s, 1);
  }
  file_put_contents($dosya, $s);
  $config = require $dosya;
  $GLOBALS["config"] = $config;
  $sonuc = yorumlariGuncelle();
  if ($sonuc["ok"]) {
      $ozet = ayarGetir("google_ozet");
      echo "✓ Bağlandı. Google puanı: ", $ozet["ortalama"] ?? "?", " (", $ozet["toplam"] ?? "?", " yorum), gelen yorum: ", $sonuc["gelen"], "\n";
  } else {
      echo "✗ Anahtar kaydedildi ama Google yanıt vermedi: ", $sonuc["hata"], "\n";
  }'
