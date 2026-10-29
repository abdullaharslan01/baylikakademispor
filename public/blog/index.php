<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_inc/blog.php';
require_once dirname(__DIR__) . '/_inc/sablon.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';

const SAYFA_BASI = 12;

// Kategori yalnız var olanlardan biri olabilir; sayfa numarası sınırlar içinde kalır
$kategoriListesi = kategoriler();
$kategori = (string) ($_GET['kategori'] ?? '');
if (!in_array($kategori, array_column($kategoriListesi, 'ad'), true)) {
    $kategori = '';
}
$toplam = yayindakiSayisi($kategori);
$sayfaSayisi = max(1, (int) ceil($toplam / SAYFA_BASI));
$sayfa = min($sayfaSayisi, max(1, (int) ($_GET['sayfa'] ?? 1)));
if ($sayfa === 1 && $kategori === '') {
    sayacKaydet('/blog/');
}

$yazilar = yayindakiYazilar(SAYFA_BASI, ($sayfa - 1) * SAYFA_BASI, $kategori);
// İlk sayfada en yeni yazı büyük gösterilir
$one = ($sayfa === 1 && $kategori === '') ? array_shift($yazilar) : null;
$gosterilen = $one ? array_merge([$one], $yazilar) : $yazilar;

function blogAdresi(string $kategori, int $sayfa): string
{
    $q = array_filter(['kategori' => $kategori, 'sayfa' => $sayfa > 1 ? $sayfa : null]);
    return '/blog/' . ($q ? '?' . http_build_query($q) : '');
}

$baslik = $kategori !== '' ? "$kategori yazıları" : 'Yüzme, Taekwondo ve Kickboks Blogu';
if ($sayfa > 1) {
    $baslik .= " – Sayfa $sayfa";
}
// Kategori sayfasının açıklaması kendi yazılarından oluşur (blog ana sayfasıyla aynı olmasın)
$aciklama = 'Su korkusu, çocuklarda yüzmeye başlama yaşı, doğru teknik, taekwondo ve kickboksun çocuklara katkıları: Baylık Akademi hocalarından Ankara\'daki ailelere rehber yazılar.';
if ($kategori !== '') {
    $aciklama = "$kategori: Baylık Akademi Spor Kulübü'nden $toplam rehber yazı. "
        . implode(' · ', array_map(fn ($y) => $y['baslik'], array_slice($yazilar, 0, 2)));
    $aciklama = mb_strlen($aciklama) > 158 ? rtrim(mb_substr($aciklama, 0, 155), ' ·,.') . '…' : $aciklama;
}
if ($sayfa > 1) {
    $aciklama = "Sayfa $sayfa · $aciklama";
}
sayfaBasi([
    'baslik' => "$baslik | Baylık Akademi, Ankara",
    'aciklama' => $aciklama,
    'yol' => blogAdresi($kategori, $sayfa),
    'sema' => [
        [
            '@type' => 'Blog',
            '@id' => SITE_URL . '/blog/#blog',
            'name' => 'Baylık Akademi Blog',
            'url' => SITE_URL . '/blog/',
            'inLanguage' => 'tr-TR',
            'publisher' => kurumSema(),
            'blogPost' => array_map(fn ($y) => [
                '@type' => 'BlogPosting',
                'headline' => $y['baslik'],
                'url' => SITE_URL . '/blog/' . $y['slug'],
                'datePublished' => $y['yayin'],
            ], $gosterilen),
        ],
        [
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Ana sayfa', 'item' => SITE_URL . '/'],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Blog', 'item' => SITE_URL . '/blog/'],
            ],
        ],
    ],
]);

?>
<main class="bl">
  <section class="bl__head">
    <p class="kicker">Blog</p>
    <h1><?= $kategori !== '' ? e($kategori) : 'Sudan ve minderden notlar' ?></h1>
    <p>Yüzme tekniği, su korkusu, çocuk gelişimi, taekwondo ve kickboks üzerine hocalarımızdan yazılar.</p>
  </section>

  <?php if ($kategoriListesi): ?>
  <nav class="kategoriler" aria-label="Kategoriler">
    <a href="/blog/" class="kategori<?= $kategori === '' ? ' is-on' : '' ?>">Tümü <small><?= yayindakiSayisi() ?></small></a>
    <?php foreach ($kategoriListesi as $k): ?>
      <a href="<?= e(blogAdresi($k['ad'], 1)) ?>" class="kategori<?= $kategori === $k['ad'] ? ' is-on' : '' ?>"><?= e($k['ad']) ?> <small><?= (int) $k['sayi'] ?></small></a>
    <?php endforeach ?>
  </nav>
  <?php endif ?>

  <?php if (!$gosterilen): ?>
    <p class="bl__empty">Yakında ilk yazımız burada olacak.</p>
  <?php else: ?>
    <?php if ($one): ?>
    <a class="feat" href="/blog/<?= e($one['slug']) ?>">
      <?php if ($one['kapak']): ?><img src="<?= e($one['kapak']) ?>" alt="" width="1200" height="750"><?php endif ?>
      <div>
        <span class="etiket etiket--yeni">En yeni yazı</span>
        <h2><?= e($one['baslik']) ?></h2>
        <p><?= e($one['ozet']) ?></p>
        <span class="meta"><?= e(tarihYaz($one['yayin'])) ?> · <?= $one['dakika'] ?> dk okuma</span>
      </div>
    </a>
    <?php endif ?>

    <div class="grid" id="yaziListesi">
      <?php foreach ($yazilar as $y) echo yaziKarti($y); ?>
    </div>

    <?php if ($sayfaSayisi > 1): ?>
    <nav class="sayfalar" aria-label="Sayfalar"<?= $sayfa < $sayfaSayisi ? ' data-sonraki="' . e(blogAdresi($kategori, $sayfa + 1)) . '"' : '' ?>>
      <?php if ($sayfa > 1): ?><a href="<?= e(blogAdresi($kategori, $sayfa - 1)) ?>" rel="prev">← Önceki</a><?php endif ?>
      <?php for ($n = 1; $n <= $sayfaSayisi; $n++): ?>
        <?php if ($n === $sayfa): ?><span aria-current="page"><?= $n ?></span><?php else: ?><a href="<?= e(blogAdresi($kategori, $n)) ?>"><?= $n ?></a><?php endif ?>
      <?php endfor ?>
      <?php if ($sayfa < $sayfaSayisi): ?><a href="<?= e(blogAdresi($kategori, $sayfa + 1)) ?>" rel="next">Sonraki →</a><?php endif ?>
    </nav>
    <?php endif ?>
  <?php endif ?>
</main>
<script>
// Aşağı kaydırdıkça sonraki sayfanın yazıları eklenir; JS yoksa sayfa bağlantıları çalışır
(() => {
  const liste = document.getElementById('yaziListesi');
  let nav = document.querySelector('.sayfalar[data-sonraki]');
  if (!liste || !nav || !('IntersectionObserver' in window)) return;
  let yukleniyor = false;
  const gozcu = new IntersectionObserver(async (girdiler) => {
    if (!girdiler[0].isIntersecting || yukleniyor || !nav?.dataset.sonraki) return;
    yukleniyor = true;
    nav.classList.add('is-yukleniyor');
    try {
      const html = await fetch(nav.dataset.sonraki).then((r) => r.text());
      const belge = new DOMParser().parseFromString(html, 'text/html');
      belge.querySelectorAll('#yaziListesi > .post').forEach((p) => liste.appendChild(document.adoptNode(p)));
      const yeni = belge.querySelector('.sayfalar');
      gozcu.unobserve(nav);
      if (yeni?.dataset.sonraki) { nav.replaceWith(yeni); nav = yeni; gozcu.observe(nav); } else { nav.remove(); nav = null; }
    } catch { nav?.classList.remove('is-yukleniyor'); }
    yukleniyor = false;
  }, { rootMargin: '400px 0px' });
  gozcu.observe(nav);
})();
</script>
<?php sayfaSonu();
