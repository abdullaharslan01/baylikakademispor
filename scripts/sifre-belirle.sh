#!/bin/sh
# Panel şifresini belirler (sunucuda): ./scripts/sifre-belirle.sh
# Şifre ekranda görünmez, dosyaya yalnız özeti (hash) yazılır.
set -eu
cd "$(dirname "$0")/.."
printf "Panel kullanıcı adı [admin]: "; read -r KULLANICI; KULLANICI=${KULLANICI:-admin}
echo
echo "Şimdi şifreyi yaz. Yazarken ekranda HİÇBİR ŞEY görünmez, bu normal. Bitince Enter'a bas."
deneme=0
while :; do
  deneme=$((deneme + 1))
  [ $deneme -le 3 ] || { echo "Şifre belirlenemedi, komutu yeniden çalıştır."; exit 1; }
  stty -echo; printf "Yeni şifre (en az 12 karakter): "; read -r SIFRE; printf "\nAynı şifre tekrar: "; read -r SIFRE2; stty echo; echo
  if [ "$SIFRE" != "$SIFRE2" ]; then echo "✗ İki şifre aynı değil, tekrar dene."; continue; fi
  if [ "$(printf %s "$SIFRE" | wc -m)" -lt 12 ]; then echo "✗ Şifre $(printf %s "$SIFRE" | wc -m | tr -d ' ') karakter; en az 12 olmalı, tekrar dene."; continue; fi
  break
done
SIFRE="$SIFRE" KULLANICI="$KULLANICI" docker compose exec -T -e SIFRE -e KULLANICI php php -r '
  $dosya = "/srv/data/config.php";
  $s = file_get_contents($dosya);
  // Değiştirme geri çağrıyla yapılır: özetteki "$2y$10$" metin olarak kalmalı (grup referansı sanılmasın)
  $yaz = fn ($s, $alan, $deger) => preg_replace_callback("/(\x27$alan\x27\s*=>\s*)\x27[^\x27]*\x27/", fn ($m) => $m[1] . var_export($deger, true), $s, 1);
  $s = $yaz($s, "admin_kullanici", getenv("KULLANICI"));
  $s = $yaz($s, "admin_sifre_hash", password_hash(getenv("SIFRE"), PASSWORD_DEFAULT));
  file_put_contents($dosya, $s);
  echo "✓ Panel şifresi kaydedildi. Giriş: https://alparslanceylansurucukursu.com.tr", getenv("PANEL_YOLU"), "/\n";'
