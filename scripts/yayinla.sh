#!/bin/sh
# VPS'te siteyi günceller. data/ klasörüne (blog, randevular, görseller, ayarlar) DOKUNMAZ. Otomatik yedek almaz.
# Kullanım (sunucuda, proje klasöründe):  ./scripts/yayinla.sh
set -eu
cd "$(dirname "$0")/.."

echo "› Kod güncelleniyor"
git pull --ff-only

echo "› Ön yüz derleniyor"
npm ci --no-audit --no-fund
npm run build

echo "› Konteynerler yenileniyor"
docker compose up -d --build
# Caddyfile değişmiş olabilir; yeniden yükle
docker compose exec -T web caddy reload --config /etc/caddy/Caddyfile

echo "✓ Yayında. Veriler data/ klasöründe korunuyor."
