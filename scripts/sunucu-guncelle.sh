#!/bin/sh
# GitHub Actions dosyaları gönderdikten sonra sunucuda çalışır: konteynerleri yeniler.
# data/ klasörüne dokunmaz. Otomatik yedek yok (kullanıcı kararı, 22.10.2026); elle almak için docker/yedekle.sh.
set -eu
cd "$(dirname "$0")/.."
docker compose up -d --build --remove-orphans
docker compose exec -T web caddy reload --config /etc/caddy/Caddyfile
docker image prune -f >/dev/null
echo "✓ Yayında: $(date '+%d.%m.%Y %H:%M')"
