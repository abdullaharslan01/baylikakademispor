#!/bin/sh
# data/ klasörünü (blog, randevular, yüklenen görseller, ayarlar) tarihli arşive alır.
# Otomatik yedekleme kapalı (kullanıcı kararı, 22.10.2026): ne gece görevi ne yayın öncesi çağrı var. Gerekirse elle çalıştırılır.
set -eu
KOK="$(cd "$(dirname "$0")/.." && pwd)"
HEDEF="${YEDEK_KLASORU:-$KOK/yedekler}"
mkdir -p "$HEDEF"
# SQLite dosyasını tutarlı kopyalamak için önce yedek kopya al
docker compose -f "$KOK/docker-compose.yml" exec -T php php -r '
  $db = new SQLite3("/srv/data/blog.sqlite"); $db->exec("VACUUM INTO \"/srv/data/blog-yedek.sqlite\"");' 2>/dev/null || true
tar -czf "$HEDEF/site-$(date +%Y%m%d-%H%M).tar.gz" -C "$KOK" --exclude='data/sessions' --exclude='data/blog.sqlite*' data
rm -f "$KOK/data/blog-yedek.sqlite"
# Yalnız en yeni 3 yedek kalır (gece yedeği ve yayın öncesi yedek dahil); disk dolmaz
ls -1t "$HEDEF"/site-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f
