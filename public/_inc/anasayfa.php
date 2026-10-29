<?php
declare(strict_types=1);

/*
 * Ana sayfa: Vite'ın ürettiği index.html'e panelden ve Google'dan gelen içerik sunucuda yerleştirilir
 * (son yazılar, yorumlar, medya alanları, sayfa yazıları ve SSS, duyuru). Böylece JavaScript çalıştırmayan arama ve yapay zekâ
 * botları da bu içeriği görür. site.js aynı veriyi #siteVerisi içinden okur, ek istek atmaz.
 */
require_once __DIR__ . '/sayac.php';
require_once __DIR__ . '/yorumlar.php';
require_once __DIR__ . '/iletisim.php';
require_once __DIR__ . '/randevu-saatleri.php';
require_once __DIR__ . '/medya.php';
require_once __DIR__ . '/metinler.php';

$html = (string) file_get_contents(dirname(__DIR__) . '/index.html');

$duyuru = ayarGetir('duyuru', ['aktif' => false, 'metin' => '', 'link' => '']);
$yorumlar = vitrinYorumlari();
$yazilar = yayindakiYazilar(3);

function onceYaz(?string $iso): string
{
    $g = $iso ? (int) floor((time() - strtotime($iso)) / 86400) : 0;
    return match (true) {
        $g < 1 => 'bugün',
        $g < 7 => "$g gün önce",
        $g < 30 => intdiv($g, 7) . ' hafta önce',
        $g < 365 => intdiv($g, 30) . ' ay önce',
        default => intdiv($g, 365) . ' yıl önce',
    };
}

$degistir = [];

if ($yazilar) {
    $kartlar = '';
    foreach ($yazilar as $y) {
        $gorsel = $y['kapak']
            ? '<img src="' . e($y['kapak']) . '" alt="" loading="lazy" width="640" height="400">'
            : '<span class="post__ph"></span>';
        $kartlar .= '<a class="post" href="/blog/' . e($y['slug']) . '">' . $gorsel . '<h3>' . e($y['baslik']) . '</h3><p>'
            . e($y['ozet']) . '</p><small>' . e(tarihYaz($y['yayin'])) . ' · ' . (int) $y['dakika'] . ' dk okuma</small></a>';
    }
    $degistir['<!--yazilar-->'] = $kartlar;
    $degistir['<section class="section" id="blog" hidden>'] = '<section class="section" id="blog">';
}

if ($yorumlar) {
    $kartlar = '';
    foreach ($yorumlar as $i => $y) {
        $kartlar .= '<article class="review"><span class="rating__stars" aria-label="' . $y['puan'] . ' yıldız">'
            . str_repeat('<svg><use href="#i-star"/></svg>', max(1, min(5, $y['puan']))) . '</span><p>' . e($y['metin'])
            . '</p><div class="review__top"><span class="avatar' . ($i % 2 ? ' avatar--red' : '') . '">'
            . ($y['foto'] ? '<img src="' . e($y['foto']) . '" alt="" loading="lazy" width="42" height="42" referrerpolicy="no-referrer">' : e(mb_strtoupper(mb_substr($y['ad'], 0, 1))))
            . '</span><div><strong>' . ($y['url'] ? '<a href="' . e($y['url']) . '" target="_blank" rel="noopener nofollow">' . e($y['ad']) . '</a>' : e($y['ad'])) . '</strong><span>Google · ' . onceYaz($y['tarih']) . '</span></div>'
            . '<svg class="review__g" aria-hidden="true"><use href="#i-google"/></svg></div></article>';
    }
    $degistir['<!--yorumlar-->'] = $kartlar;
    $degistir['<div class="reviews" id="reviews" hidden>'] = '<div class="reviews" id="reviews">';
} else {
    // Gösterilecek yorum yoksa (ör. Google bağlantısı henüz kurulmadı) boş bölüm gösterilmez;
    // "Google yorumları" bağlantıları doğrudan Google'daki sayfaya gider
    $google = 'https://www.google.com/maps?cid=11573994367863899538';
    $degistir['<section class="section section--soft" id="yorumlar">'] = '<section class="section section--soft" id="yorumlar" hidden>';
    $degistir['<a href="#yorumlar" class="rating">'] = '<a href="' . $google . '" class="rating" target="_blank" rel="noopener" data-olay="google-yorumlar">';
    $degistir['<a class="strip__item" href="#yorumlar">'] = '<a class="strip__item" href="' . $google . '" target="_blank" rel="noopener" data-olay="google-yorumlar">';
}

// KURSUM-APP bağlantısı panelden girildiyse e-sınav kutusu ve menü sekmesi görünür
$kursum = (string) (ayarGetir('kursum', [])['link'] ?? '');
if ($kursum !== '') {
    $degistir['<div class="kursum" id="kursum" hidden>'] = '<div class="kursum" id="kursum">';
    $degistir['<a class="btn btn--primary" id="kursumLink"'] = '<a class="btn btn--primary" id="kursumLink" href="' . e($kursum) . '"';
    $degistir['<a class="nav__kursum" id="navKursum" target="_blank" rel="noopener" data-olay="kursum-app" hidden>'] = '<a class="nav__kursum" id="navKursum" href="' . e($kursum) . '" target="_blank" rel="noopener" data-olay="kursum-app">';
}

// Ehliyet sınıfı kartlarında panelden yüklenen araç fotoğrafları kurum şemasının görsellerine de eklenir
$sinifGorselleri = [];
foreach (medyaAyari() as $alan => $ogeler) {
    if (str_starts_with($alan, 'sinif-')) {
        foreach ((array) $ogeler as $o) {
            if (($o['tip'] ?? '') === 'gorsel') {
                $sinifGorselleri[] = json_encode(SITE_URL . $o['src'], JSON_UNESCAPED_SLASHES);
            }
        }
    }
}
if ($sinifGorselleri) {
    $semaGorsel = '"image": ["' . SITE_URL . '/img/kapak.jpg", "' . SITE_URL . '/img/logo.png"';
    $degistir[$semaGorsel] = $semaGorsel . ', ' . implode(', ', array_slice($sinifGorselleri, 0, 12));
}

if (!empty($duyuru['aktif']) && ($duyuru['metin'] ?? '') !== '') {
    $degistir['<div class="duyuru" id="duyuru" hidden>'] = '<div class="duyuru" id="duyuru">';
    $degistir['<span class="duyuru__metin"></span>'] = '<span class="duyuru__metin">' . e($duyuru['metin']) . '</span>';
    if (($duyuru['link'] ?? '') !== '') {
        $degistir['<a class="duyuru__link" hidden>'] = '<a class="duyuru__link" href="' . e($duyuru['link']) . '">';
    }
}

$veri = [
    'duyuru' => $duyuru,
    'google' => ayarGetir('google_ozet'),
    'yorumlar' => $yorumlar,
    'turnstile' => $config['turnstile_site_anahtari'] ?? '',
    'randevu' => randevuIstemciAyarlari(),
];
$degistir['</body>'] = '<script type="application/json" id="siteVerisi">'
    . json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) . "</script>\n</body>";

$html = strtr($html, $degistir);

$html = medyaUygula($html, medyaAyari());
$html = metinleriUygula($html);

$html = strtr($html, iletisimDegisimleri());

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
echo $html;

// Ziyaretçiler tarayıcıdan sayılır (site.js); ana sayfayı okuyan yapay zekâ botları burada
yzBotKaydet('/');
// Google yorumları haftada bir, sayfa gönderildikten sonra yenilenir
yorumlarVaktiGeldiyse();
