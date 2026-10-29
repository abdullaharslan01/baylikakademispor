<?php
declare(strict_types=1);

require_once __DIR__ . '/iletisim.php';

/** Kulübün yapılandırılmış veri kimliği (tüm sayfalarda aynı @id ile bağlanır) */
function kurumSema(): array
{
    return [
        '@type' => 'SportsClub',
        '@id' => SITE_URL . '/#kurum',
        'name' => 'Baylık Akademi Spor Kulübü',
        'url' => SITE_URL . '/',
        'logo' => SITE_URL . '/img/logo.svg',
        'telephone' => '+90 542 898 06 01',
    ];
}

function mutlakUrl(string $yol): string
{
    return preg_match('~^https?://~', $yol) ? $yol : SITE_URL . '/' . ltrim($yol, '/');
}

/** Ortak logo: siyah daire içinde tekme atan siluet */
function logoSvg(int $boyut = 40): string
{
    return '<svg width="' . $boyut . '" height="' . $boyut . '" viewBox="0 0 120 120" aria-hidden="true">'
        . '<circle cx="60" cy="60" r="60" fill="#d71920"/><circle cx="60" cy="60" r="50" fill="#0d0f13"/><path d="M14 80c8-5 15-5 23 0s15 5 23 0 15-5 23 0 15 5 23 0v6c-8 5-15 5-23 0s-15-5-23 0-15 5-23 0-15-5-23 0z" fill="#14b8cc"/><path d="M20 92c7-4 13-4 20 0s13 4 20 0 13-4 20 0 13 4 20 0" fill="none" stroke="#7ce6f1" stroke-width="3" stroke-linecap="round"/><g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M63 40 55 60M62 44 46 49M62 44l15 8M55 60l-4 13M55 60l18-6 20-15"/></g><circle cx="68" cy="29" r="7" fill="#fff"/></svg>';
}

/**
 * @param array $s baslik, aciklama, gorsel, yol (kanonik yol), tur (website|article), sema (JSON-LD dizileri), robots
 */
function sayfaBasi(array $s): void
{
    // Panelden değiştirilen iletişim bilgileri sayfanın tamamına uygulanır (sayfaSonu'nda boşaltılır)
    ob_start(fn (string $b) => strtr($b, iletisimDegisimleri()));
    $baslik = $s['baslik'];
    $aciklama = $s['aciklama'] ?? '';
    // Paylaşım görseli: yazının kapağı, yoksa sitenin paylaşım görseli
    $gorsel = mutlakUrl(($s['gorsel'] ?? '') ?: '/img/kapak.svg');
    $kanonik = isset($s['yol']) ? mutlakUrl($s['yol']) : '';
    ?><!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($baslik) ?></title>
  <meta name="description" content="<?= e($aciklama) ?>">
  <?php if (!empty($s['robots'])): ?><meta name="robots" content="<?= e($s['robots']) ?>"><?php endif ?>
  <meta name="theme-color" content="#0a2233">
  <?php if ($kanonik): ?><link rel="canonical" href="<?= e($kanonik) ?>"><?php endif ?>
  <meta property="og:site_name" content="Baylık Akademi Spor Kulübü">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:type" content="<?= e($s['tur'] ?? 'website') ?>">
  <meta property="og:title" content="<?= e($baslik) ?>">
  <meta property="og:description" content="<?= e($aciklama) ?>">
  <meta property="og:image" content="<?= e($gorsel) ?>">
  <meta property="og:image:alt" content="<?= e($s['gorselAlt'] ?? 'Baylık Akademi Spor Kulübü, Ankara') ?>">
  <?php if ($kanonik): ?><meta property="og:url" content="<?= e($kanonik) ?>"><?php endif ?>
  <meta name="twitter:card" content="summary_large_image">
  <?php foreach ($s['sema'] ?? [] as $sema): ?>
  <script type="application/ld+json"><?= json_encode(['@context' => 'https://schema.org'] + $sema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
  <?php endforeach ?>
  <link rel="icon" href="/img/logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/blog/blog.css?v=<?= @filemtime(dirname(__DIR__) . '/blog/blog.css') ?>">
</head>
<body>
<header class="bh">
  <div class="bh__in">
    <a href="/" class="brand"><?= logoSvg(42) ?><span><strong>Baylık Akademi</strong><small>Spor Kulübü</small></span></a>
    <nav class="bh__nav">
      <a href="/blog/" class="bh__link">Blog</a>
      <a href="/#randevu" class="bbtn">Randevu al</a>
    </nav>
  </div>
</header>
<?php
}

/** Blog listesi ve "bunları da okuyun" için yazı kartı */
function yaziKarti(array $y): string
{
    $gorsel = $y['kapak']
        ? '<img src="' . e($y['kapak']) . '" alt="" loading="lazy" width="640" height="400">'
        : '<span class="post__ph"></span>';
    $kat = ($y['kategori'] ?? '') !== '' ? '<span class="etiket">' . e($y['kategori']) . '</span>' : '';
    return '<a class="post" href="/blog/' . e($y['slug']) . '"><span class="post__gorsel">' . $gorsel . '</span>'
        . '<span class="post__govde">' . $kat . '<h3>' . e($y['baslik']) . '</h3><p>' . e($y['ozet']) . '</p>'
        . '<span class="meta">' . e(tarihYaz($y['yayin'])) . ' · ' . $y['dakika'] . ' dk okuma</span></span></a>';
}

/** 404 sayfası: bulunamayan adresler ve yazılar için */
function bulunamadi(string $baslik = 'Burası havuzun derin tarafı.', string $metin = 'Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Sığ tarafa dönmek kolay.'): never
{
    http_response_code(404);
    sayfaBasi(['baslik' => 'Sayfa bulunamadı | Baylık Akademi', 'aciklama' => 'Aradığınız sayfa bulunamadı.', 'robots' => 'noindex']);
    ?>
<main class="nf">
  <svg class="nf__yol" viewBox="0 0 640 140" aria-hidden="true">
    <rect x="0" y="40" width="640" height="100" rx="14" fill="#0e8ea6"/>
    <path d="M0 52c40-12 80-12 120 0s80 12 120 0 80-12 120 0 80 12 120 0 80-12 120 0 40 6 40 6" fill="none" stroke="#7ce6f1" stroke-width="4"/>
    <path d="M20 100H620" stroke="#fff" stroke-width="5" stroke-dasharray="18 14" stroke-linecap="round" opacity=".8"/>
    <g class="nf__arac">
      <g fill="none" stroke="#06202e" stroke-width="11" stroke-linecap="round"><path d="M250 66 340 60M340 57c-6-26-30-34-52-26M346 62l34 5M250 66l-36-4M250 68l-32 12"/></g>
      <circle cx="356" cy="56" r="12" fill="#06202e"/><path d="M345 51a12 12 0 0 1 22 0z" fill="#d71920"/>
    </g>
  </svg>
  <p class="nf__kod">404 · Sayfa bulunamadı</p>
  <h1><?= e($baslik) ?></h1>
  <p class="nf__metin"><?= e($metin) ?></p>
  <div class="nf__butonlar">
    <a href="/" class="bbtn bbtn--lg">Ana sayfaya dön</a>
    <a href="/blog/" class="bbtn bbtn--lg bbtn--acik">Blog</a>
  </div>
  <p class="nf__alt">Soru ve randevu için: <a href="tel:+905428980601">0542 898 06 01</a> · <a href="/#randevu">Online randevu</a></p>
</main>
<?php
    sayfaSonu();
    exit;
}

function sayfaSonu(bool $instagram = false): void
{
    ?>
<footer class="bf">
  <div class="bf__in">
    <span>© <?= date('Y') ?> <a href="/">Baylık Akademi Spor Kulübü</a> · Malazgirt Mah. Buhara Cd. No:71/B, Sincan / Ankara</span>
    <span><a href="tel:+905428980601">0542 898 06 01</a> · <a href="https://www.instagram.com/baylikakademisporkulubu/" target="_blank" rel="noopener">Instagram</a> · <a href="/kvkk/">KVKK</a></span>
  </div>
</footer>
<?php if ($instagram): ?>
<script>
// Instagram kendi çerezlerini bırakır; gönderi ziyaretçi isteyince yüklenir
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-insta-yukle]')) return;
  document.querySelectorAll('[data-insta-yukle]').forEach((b) => b.remove());
  const s = document.createElement('script');
  s.src = 'https://www.instagram.com/embed.js';
  s.async = true;
  document.body.append(s);
});
</script>
<?php endif ?>
<script src="/olay.js?v=<?= @filemtime(dirname(__DIR__) . '/olay.js') ?>" defer></script>
</body>
</html>
<?php
    ob_end_flush();
}
