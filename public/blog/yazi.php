<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_inc/blog.php';
require_once dirname(__DIR__) . '/_inc/sablon.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';

$slug = (string) ($_GET['slug'] ?? '');
$st = db()->prepare("SELECT y.*, COALESCE(k.ad, '') AS kategori FROM yazilar y " . YAZI_KATEGORI . ' WHERE y.slug = ?');
$st->execute([$slug]);
$y = $st->fetch();

// Taslaklar yalnızca yönetici oturumunda önizlenir
if ($y && $y['durum'] !== 'yayinda') {
    $admin = false;
    if (isset($_COOKIE['acsk_yonetim'])) {
        session_save_path(VERI . '/sessions');
        session_name('acsk_yonetim');
        session_start(['read_and_close' => true]);
        // Panel oturumunun süre sınırları (api/blog.php: 4 saat boşta, en fazla 12 saat) burada da geçerli
        $admin = !empty($_SESSION['admin']) && time() - (int) ($_SESSION['son'] ?? 0) <= 4 * 3600
            && time() - (int) ($_SESSION['bas'] ?? 0) <= 12 * 3600;
    }
    if (!$admin) {
        $y = null;
    }
}

if (!$y) {
    bulunamadi('Bu yazı bulunamadı.', 'Yazı kaldırılmış ya da adresi değişmiş olabilir. Diğer yazılara bloğumuzdan ulaşabilirsiniz.');
}

if ($y['durum'] === 'yayinda') {
    sayacKaydet('/blog/' . $y['slug']);
}

$doc = json_decode($y['icerik'], true) ?: [];
$bayrak = [];
$govde = icerikHtml($doc, $bayrak);

$sss = json_decode($y['sss'] ?? '[]', true) ?: [];
// SSS alanı boşsa yazının kendi soru başlıkları ve hemen altındaki cevap paragrafı soru-cevap şemasına girer
// (içerik sayfada zaten görünür; ayrı bir SSS bölümü basılmaz)
$semaSss = $sss ?: soruCevaplar($doc);
$url = SITE_URL . '/blog/' . $y['slug'];
$sema = [
    [
        '@type' => 'BlogPosting',
        '@id' => $url . '#yazi',
        'headline' => $y['baslik'],
        'description' => $y['seo_aciklama'] ?: $y['ozet'],
        'image' => $y['kapak'] ? mutlakUrl($y['kapak']) : SITE_URL . '/img/kapak.svg',
        'datePublished' => $y['yayin'] ?: $y['olusturma'],
        'dateModified' => $y['guncelleme'],
        'inLanguage' => 'tr-TR',
        'mainEntityOfPage' => $url,
        'author' => kurumSema(),
        'publisher' => kurumSema(),
        'isPartOf' => ['@type' => 'Blog', '@id' => SITE_URL . '/blog/#blog'],
        'speakable' => ['@type' => 'SpeakableSpecification', 'cssSelector' => ['.art__head h1', '.art__lead']],
        'wordCount' => count(preg_split('/\s+/u', trim(icerikMetin($doc)), -1, PREG_SPLIT_NO_EMPTY)),
    ] + ($y['anahtar_kelime'] ? ['keywords' => $y['anahtar_kelime']] : [])
      + ($y['kategori'] ? ['articleSection' => $y['kategori']] : []),
    [
        '@type' => 'BreadcrumbList',
        'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Ana sayfa', 'item' => SITE_URL . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Blog', 'item' => SITE_URL . '/blog/'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $y['baslik'], 'item' => $url],
        ],
    ],
];
if ($semaSss) {
    $sema[] = [
        '@type' => 'FAQPage',
        'mainEntity' => array_map(fn ($q) => [
            '@type' => 'Question',
            'name' => $q['soru'],
            'acceptedAnswer' => ['@type' => 'Answer', 'text' => $q['cevap']],
        ], $semaSss),
    ];
}
// Okumaya devam: yazıya kayıtlı ilgili yazılar, sonra benzerlik (aynı kategori + ortak kelimeler)
$devam = $y['durum'] === 'yayinda' ? ilgiliYazilar($y) : [];
sayfaBasi([
    'baslik' => $y['seo_baslik'] ?: $y['baslik'] . ' | Baylık Akademi',
    'aciklama' => $y['seo_aciklama'] ?: $y['ozet'],
    'gorsel' => $y['kapak'],
    'gorselAlt' => $y['baslik'],
    'yol' => '/blog/' . $y['slug'],
    'tur' => 'article',
    'sema' => $sema,
    'robots' => $y['durum'] === 'yayinda' ? '' : 'noindex',
]);
?>
<main class="art">
  <?php if ($y['durum'] !== 'yayinda'): ?><p class="draft">Taslak önizlemesi · ziyaretçiler göremez</p><?php endif ?>
  <header class="art__head">
    <a class="kicker" href="/blog/">← Blog</a>
    <h1><?= e($y['baslik']) ?></h1>
    <?php if ($y['ozet']): ?><p class="art__lead"><?= e($y['ozet']) ?></p><?php endif ?>
    <div class="byline">
      <?= logoSvg(40) ?>
      <div><strong>Baylık Akademi Spor Kulübü</strong><span><?= e(tarihYaz($y['yayin'] ?: $y['guncelleme'])) ?> · <?= okumaSuresi($doc) ?> dk okuma</span></div>
    </div>
  </header>
  <?php if ($y['kapak']): ?><figure class="art__cover"><img src="<?= e($y['kapak']) ?>" alt="<?= e($y['baslik']) ?>" fetchpriority="high"></figure><?php endif ?>
  <article class="prose"><?= $govde ?></article>

  <?php if ($devam): ?>
  <section class="devam" aria-labelledby="devamBaslik">
    <div class="devam__ust">
      <h2 id="devamBaslik">Bunları da okuyun</h2>
      <a href="/blog/" class="devam__tumu">Tüm yazılar →</a>
    </div>
    <div class="grid grid--2">
      <?php foreach ($devam as $o) echo yaziKarti($o); ?>
    </div>
  </section>
  <?php endif ?>

  <?php if ($sss): ?>
  <section class="faq">
    <h2>Sık sorulan sorular</h2>
    <?php foreach ($sss as $q): ?>
    <details>
      <summary><?= e($q['soru']) ?></summary>
      <p><?= nl2br(e($q['cevap'])) ?></p>
    </details>
    <?php endforeach ?>
  </section>
  <?php endif ?>

  <section class="about-author">
    <?= logoSvg(48) ?>
    <div>
      <strong>Baylık Akademi Spor Kulübü</strong>
      <p>Ankara Eryaman'da çocuk ve yetişkinlere birebir yüzme dersleri, Sincan'da çocuklar için taekwondo ve kickboks eğitimi veren spor kulübü. Kurucusu Gökhun Baylık, Gazi Üniversitesi Spor Bilimleri mezunu. Son güncelleme: <?= e(tarihYaz($y['guncelleme'])) ?>.</p>
      <p><a href="/">Kulübümüzü tanıyın</a> · <a href="/#randevu">Ön görüşme randevusu</a> · <a href="tel:+905428980601">0542 898 06 01</a></p>
    </div>
  </section>

  <aside class="cta">
    <h2>Önce tanışalım</h2>
    <p>Havuzu ya da salonu görün, hocanızla tanışın, sorularınızı yerinde sorun. Ön görüşme için size uyan günü seçin.</p>
    <a class="bbtn bbtn--lg" href="/#randevu">Ön görüşme randevusu al</a>
  </aside>
</main>
<?php sayfaSonu(!empty($bayrak['instagram']));
