<?php
declare(strict_types=1);

require_once __DIR__ . '/blog.php';
require_once __DIR__ . '/sablon.php';
require_once __DIR__ . '/sayac.php';
require_once __DIR__ . '/medya.php';

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$sayfalar = [
    ['/', date('Y-m-d'), '1.0'],
    ['/sinav-deneyimi/', null, '0.9'],
    ['/blog/', date('Y-m-d'), '0.8'],
    ['/kvkk/', null, '0.2'],
];
// Ana sayfa görselleri: kapak ve panelden yüklenen fotoğraflar
$gorseller = ['/' => ['/img/kapak.jpg', ...medyaGorselleri()]];
// Kategori sayfaları (blogdaki filtre adresleri)
foreach (kategoriler() as $k) {
    $st = db()->prepare("SELECT MAX(COALESCE(guncelleme, yayin)) FROM yazilar WHERE durum = 'yayinda' AND kategori_id = ?");
    $st->execute([$k['id']]);
    $sayfalar[] = ['/blog/?' . http_build_query(['kategori' => $k['ad']]), substr((string) $st->fetchColumn(), 0, 10) ?: null, '0.5'];
}
foreach (yayindakiYazilar(1000) as $y) {
    $sayfalar[] = ['/blog/' . $y['slug'], substr((string) ($y['guncelleme'] ?: $y['yayin']), 0, 10), '0.7'];
    if ($y['kapak']) {
        $gorseller['/blog/' . $y['slug']] = [$y['kapak']];
    }
}

echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">', "\n";
foreach ($sayfalar as [$yol, $tarih, $oncelik]) {
    echo '  <url><loc>', e(SITE_URL . $yol), '</loc>';
    if ($tarih) {
        echo '<lastmod>', e($tarih), '</lastmod>';
    }
    echo '<priority>', $oncelik, '</priority>';
    foreach ($gorseller[$yol] ?? [] as $g) {
        echo '<image:image><image:loc>', e(mutlakUrl($g)), '</image:loc></image:image>';
    }
    echo '</url>', "\n";
}
echo '</urlset>', "\n";
