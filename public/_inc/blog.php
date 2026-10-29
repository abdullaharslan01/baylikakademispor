<?php
declare(strict_types=1);

require_once __DIR__ . '/temel.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $pdo = new PDO('sqlite:' . VERI . '/blog.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
    $pdo->exec('CREATE TABLE IF NOT EXISTS yazilar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        baslik TEXT NOT NULL,
        ozet TEXT NOT NULL DEFAULT \'\',
        kapak TEXT NOT NULL DEFAULT \'\',
        icerik TEXT NOT NULL DEFAULT \'{"type":"doc","content":[]}\',
        durum TEXT NOT NULL DEFAULT \'taslak\' CHECK (durum IN (\'taslak\', \'yayinda\')),
        olusturma TEXT NOT NULL,
        guncelleme TEXT NOT NULL,
        yayin TEXT
    )');
    $pdo->exec('CREATE INDEX IF NOT EXISTS yazilar_yayin ON yazilar (durum, yayin DESC)');
    // Sonradan eklenen SEO / GEO / AEO alanları
    $sutunlar = array_column($pdo->query('PRAGMA table_info(yazilar)')->fetchAll(), 'name');
    foreach (['seo_baslik' => "TEXT NOT NULL DEFAULT ''", 'seo_aciklama' => "TEXT NOT NULL DEFAULT ''",
        'anahtar_kelime' => "TEXT NOT NULL DEFAULT ''", 'sss' => "TEXT NOT NULL DEFAULT '[]'",
        'kategori' => "TEXT NOT NULL DEFAULT ''", 'ilgili' => "TEXT NOT NULL DEFAULT '[]'"] as $ad => $tip) {
        if (!in_array($ad, $sutunlar, true)) {
            $pdo->exec("ALTER TABLE yazilar ADD COLUMN $ad $tip");
        }
    }
    // Kategoriler panelden yönetilir; yazı kategoriye kimliğiyle bağlıdır (ad değişince yazılar etkilenmez)
    $pdo->exec('CREATE TABLE IF NOT EXISTS kategoriler (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad TEXT NOT NULL UNIQUE,
        sira INTEGER NOT NULL DEFAULT 0
    )');
    if (!in_array('kategori_id', $sutunlar, true)) {
        $pdo->exec('ALTER TABLE yazilar ADD COLUMN kategori_id INTEGER REFERENCES kategoriler (id) ON DELETE SET NULL');
        // Bir kez: eski metin kategoriler tabloya taşınır ve yazılar bağlanır
        $adlar = $pdo->query("SELECT kategori, COUNT(*) AS n FROM yazilar WHERE kategori != '' GROUP BY kategori ORDER BY n DESC")->fetchAll(PDO::FETCH_COLUMN);
        $ekle = $pdo->prepare('INSERT OR IGNORE INTO kategoriler (ad, sira) VALUES (?, ?)');
        foreach (array_unique([...$adlar, ...KATEGORI_VARSAYILAN]) as $i => $ad) {
            $ekle->execute([$ad, $i + 1]);
        }
        $pdo->exec("UPDATE yazilar SET kategori_id = (SELECT id FROM kategoriler WHERE ad = yazilar.kategori) WHERE kategori != ''");
    }
    return $pdo;
}

const KATEGORI_VARSAYILAN = ['Direksiyon sınavı', 'Teorik sınav', 'Güvenli eğitim', 'Adana ve kayıt', 'Kayıt ve belgeler',
    'Sınav sonrası ve işlemler', 'VR ve eğitim deneyimi', 'Ücret ve planlama'];

/** Yazı sorgularında kategori adı tablodan gelir (y = yazilar, k = kategoriler) */
const YAZI_KATEGORI = 'LEFT JOIN kategoriler k ON k.id = y.kategori_id';

/**
 * Hiçbir yazıda ve site ayarında geçmeyen yüklenmiş görselleri siler.
 * $hemen: silinen yazının görselleri (beklemeden silinir). Diğerleri ancak 1 günden eskiyse silinir;
 * böylece panelde yüklenip henüz kaydedilmemiş görseller korunur.
 */
function kullanilmayanGorselleriSil(array $hemen = []): int
{
    $kok = VERI . '/uploads';
    if (!is_dir($kok)) {
        return 0;
    }
    $kullanilan = implode("\n", db()->query('SELECT kapak || icerik FROM yazilar')->fetchAll(PDO::FETCH_COLUMN));
    try {
        $kullanilan .= implode("\n", db()->query('SELECT deger FROM ayarlar')->fetchAll(PDO::FETCH_COLUMN));
    } catch (PDOException) {
        // ayarlar tablosu henüz yok
    }
    try {
        $kullanilan .= implode("\n", db()->query('SELECT yazar_foto FROM google_yorumlar')->fetchAll(PDO::FETCH_COLUMN));
    } catch (PDOException) {
        // yorum tablosu ya da foto sütunu henüz yok
    }
    $hemen = array_flip(array_map('basename', $hemen));
    $silinen = 0;
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($kok, FilesystemIterator::SKIP_DOTS)) as $dosya) {
        $ad = $dosya->getFilename();
        // Görsel adları rastgele ve benzersiz; JSON'da "/" kaçışlı saklandığı için yalnız ad aranır
        if (!$dosya->isFile() || str_contains($kullanilan, $ad)) {
            continue;
        }
        if (isset($hemen[$ad]) || $dosya->getMTime() < time() - 86400) {
            $silinen += (int) @unlink($dosya->getPathname());
        }
    }
    return $silinen;
}

function slugYap(string $s): string
{
    $s = strtr($s, ['ç' => 'c', 'Ç' => 'c', 'ğ' => 'g', 'Ğ' => 'g', 'ı' => 'i', 'I' => 'i', 'İ' => 'i',
        'ö' => 'o', 'Ö' => 'o', 'ş' => 's', 'Ş' => 's', 'ü' => 'u', 'Ü' => 'u']);
    $s = strtolower($s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim(substr($s, 0, 80), '-') ?: 'yazi';
}

function youtubeId(string $url): ?string
{
    $desen = '~^(?:https?://)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})~';
    return preg_match($desen, $url, $m) ? $m[1] : null;
}

function instagramUrl(string $url): ?string
{
    return preg_match('~^https://(?:www\.)?instagram\.com/(?:[A-Za-z0-9_.]+/)?(p|reel|tv)/([A-Za-z0-9_-]+)~', $url, $m)
        ? "https://www.instagram.com/{$m[1]}/{$m[2]}/"
        : null;
}

function guvenliLink(string $href): ?string
{
    $href = trim($href);
    if (preg_match('~^(https?://|mailto:|tel:|/|#)~i', $href)) {
        return $href;
    }
    return null;
}

function guvenliGorsel(string $src): ?string
{
    return preg_match('~^(/uploads/|/assets/|https://)~', $src) ? $src : null;
}

/**
 * Editörün kaydettiği JSON'u HTML'e çevirir. Sadece bilinen öğeler çıkar,
 * tüm metinler kaçışlanır; böylece yazıya zararlı kod girmez.
 */
function icerikHtml(array $dugum, array &$bayrak = []): string
{
    $tip = $dugum['type'] ?? '';
    $attrs = $dugum['attrs'] ?? [];
    $ic = function () use ($dugum, &$bayrak) {
        $out = '';
        foreach ($dugum['content'] ?? [] as $alt) {
            if (is_array($alt)) {
                $out .= icerikHtml($alt, $bayrak);
            }
        }
        return $out;
    };

    switch ($tip) {
        case 'doc':
            return $ic();
        case 'paragraph':
            $html = $ic();
            return $html === '' ? '' : "<p>$html</p>";
        case 'heading':
            $l = in_array((int) ($attrs['level'] ?? 2), [2, 3], true) ? (int) $attrs['level'] : 2;
            return "<h$l>" . $ic() . "</h$l>";
        case 'bulletList':
            return '<ul>' . $ic() . '</ul>';
        case 'orderedList':
            return '<ol>' . $ic() . '</ol>';
        case 'listItem':
            return '<li>' . $ic() . '</li>';
        case 'blockquote':
            return '<blockquote>' . $ic() . '</blockquote>';
        case 'horizontalRule':
            return '<hr>';
        case 'hardBreak':
            return '<br>';
        case 'image':
            $src = guvenliGorsel((string) ($attrs['src'] ?? ''));
            if (!$src) {
                return '';
            }
            $alt = e((string) ($attrs['alt'] ?? ''));
            $alt2 = (string) ($attrs['title'] ?? '');
            $cap = $alt2 !== '' ? '<figcaption>' . e($alt2) . '</figcaption>' : '';
            return '<figure><img src="' . e($src) . '" alt="' . $alt . '" loading="lazy">' . $cap . '</figure>';
        case 'youtube':
            $id = youtubeId((string) ($attrs['src'] ?? ''));
            if (!$id) {
                return '';
            }
            return '<figure class="embed embed--video"><iframe src="https://www.youtube-nocookie.com/embed/' . $id
                . '" title="YouTube videosu" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></figure>';
        case 'instagram':
            $url = instagramUrl((string) ($attrs['url'] ?? ''));
            if (!$url) {
                return '';
            }
            $bayrak['instagram'] = true;
            return '<figure class="embed embed--insta"><blockquote class="instagram-media" data-instgrm-permalink="' . e($url)
                . '" data-instgrm-version="14"><a class="insta-kart" href="' . e($url) . '" target="_blank" rel="noopener">'
                . '<span class="insta-kart__ikon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r=".8" fill="currentColor"/></svg></span>'
                . '<span><strong>Instagram videosu</strong><small>@alparslanceylansurucukursu · Instagram\'da aç</small></span></a></blockquote>'
                . '<button type="button" class="insta-yukle" data-insta-yukle>▶ Videoyu burada izle</button></figure>';
        case 'text':
            $html = e((string) ($dugum['text'] ?? ''));
            foreach ($dugum['marks'] ?? [] as $isaret) {
                switch ($isaret['type'] ?? '') {
                    case 'bold': $html = "<strong>$html</strong>"; break;
                    case 'italic': $html = "<em>$html</em>"; break;
                    case 'underline': $html = "<u>$html</u>"; break;
                    case 'strike': $html = "<s>$html</s>"; break;
                    case 'code': $html = "<code>$html</code>"; break;
                    case 'link':
                        $href = guvenliLink((string) ($isaret['attrs']['href'] ?? ''));
                        if ($href) {
                            $dis = str_starts_with($href, 'http') ? ' target="_blank" rel="noopener"' : '';
                            $html = '<a href="' . e($href) . '"' . $dis . '>' . $html . '</a>';
                        }
                        break;
                }
            }
            return $html;
        default:
            return $ic();
    }
}

function icerikMetin(array $dugum): string
{
    if (($dugum['type'] ?? '') === 'text') {
        return (string) ($dugum['text'] ?? '');
    }
    $parcalar = [];
    foreach ($dugum['content'] ?? [] as $alt) {
        if (is_array($alt)) {
            $parcalar[] = icerikMetin($alt);
        }
    }
    return implode(' ', $parcalar);
}

/** Soru biçimli (? ile biten) başlık + hemen altındaki paragraf çiftleri; en fazla 8 */
function soruCevaplar(array $doc): array
{
    $bloklar = $doc['content'] ?? [];
    $sonuc = [];
    foreach ($bloklar as $i => $b) {
        $soru = trim(icerikMetin($b));
        $sonraki = $bloklar[$i + 1] ?? [];
        if (($b['type'] ?? '') !== 'heading' || !str_ends_with($soru, '?') || ($sonraki['type'] ?? '') !== 'paragraph') {
            continue;
        }
        $cevap = trim(preg_replace('/\s+/u', ' ', icerikMetin($sonraki)));
        if (mb_strlen($cevap) >= 40) {
            $sonuc[] = ['soru' => $soru, 'cevap' => $cevap];
        }
        if (count($sonuc) >= 8) {
            break;
        }
    }
    return $sonuc;
}

function okumaSuresi(array $doc): int
{
    $kelime = count(preg_split('/\s+/u', trim(icerikMetin($doc)), -1, PREG_SPLIT_NO_EMPTY));
    return max(1, (int) round($kelime / 200));
}

function tarihYaz(?string $iso): string
{
    if (!$iso) {
        return '';
    }
    $aylar = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    $d = new DateTimeImmutable($iso);
    return $d->format('j') . ' ' . $aylar[(int) $d->format('n')] . ' ' . $d->format('Y');
}

function yayindakiYazilar(int $limit = 50, int $atla = 0, string $kategori = ''): array
{
    $st = db()->prepare("SELECT y.id, y.slug, y.baslik, y.ozet, y.kapak, y.icerik, y.yayin, y.guncelleme, COALESCE(k.ad, '') AS kategori
        FROM yazilar y " . YAZI_KATEGORI . " WHERE y.durum = 'yayinda' AND (:k = '' OR k.ad = :k) ORDER BY y.yayin DESC LIMIT :l OFFSET :o");
    $st->bindValue(':l', $limit, PDO::PARAM_INT);
    $st->bindValue(':o', $atla, PDO::PARAM_INT);
    $st->bindValue(':k', $kategori);
    $st->execute();
    return array_map(function ($y) {
        $doc = json_decode($y['icerik'], true) ?: [];
        $y['dakika'] = okumaSuresi($doc);
        unset($y['icerik']);
        return $y;
    }, $st->fetchAll());
}

function yayindakiSayisi(string $kategori = ''): int
{
    $st = db()->prepare("SELECT COUNT(*) FROM yazilar y " . YAZI_KATEGORI . " WHERE y.durum = 'yayinda' AND (:k = '' OR k.ad = :k)");
    $st->execute([':k' => $kategori]);
    return (int) $st->fetchColumn();
}

/**
 * Yazının altındaki "Bunları da okuyun" önerileri: önce yazıya kayıtlı ilgili yazılar (ilgili sütunu),
 * sonra benzerlik puanı: aynı kategori + başlık / anahtar kelimede ortak kelimeler; eşitlikte yenisi önce.
 */
function ilgiliYazilar(array $y, int $adet = 4): array
{
    $hepsi = array_column(yayindakiYazilar(1000), null, 'slug');
    unset($hepsi[$y['slug']]);
    $sonuc = [];
    foreach ((array) json_decode((string) ($y['ilgili'] ?? '[]'), true) as $s) {
        if (isset($hepsi[$s]) && count($sonuc) < $adet) {
            $sonuc[$s] = $hepsi[$s];
        }
    }
    $kelimeler = function (string $metin): array {
        static $bos = ['için', 'nasıl', 'nedir', 'neler', 'olan', 'olarak', 'gibi', 'daha', 'veya', 'adana', 'sürücü', 'kursu',
            'ehliyet', 'ehliyeti', '2026', 'ile', 'mi', 'mı', 'ne', 'bir', 've', 'en', 'bilinmesi', 'gerekenler', 'rehberi'];
        $metin = mb_strtolower(preg_replace('/[^\p{L}\p{N} ]+/u', ' ', $metin));
        $k = array_filter(explode(' ', $metin), fn ($w) => mb_strlen($w) >= 3 && !in_array($w, $bos, true));
        // Türkçe ekler yüzünden kelime köklerini kabaca karşılaştır (ilk 5 harf)
        return array_unique(array_map(fn ($w) => mb_substr($w, 0, 5), $k));
    };
    $benim = $kelimeler($y['baslik'] . ' ' . ($y['anahtar_kelime'] ?? ''));
    $puanlar = [];
    foreach ($hepsi as $s => $o) {
        if (isset($sonuc[$s])) {
            continue;
        }
        $puan = ($y['kategori'] ?? '') !== '' && $o['kategori'] === $y['kategori'] ? 5 : 0;
        $puan += 2 * count(array_intersect($benim, $kelimeler($o['baslik'])));
        $puanlar[$s] = [$puan, (string) $o['yayin']];
    }
    uasort($puanlar, fn ($a, $b) => $b <=> $a);
    foreach (array_keys($puanlar) as $s) {
        if (count($sonuc) >= $adet) {
            break;
        }
        $sonuc[$s] = $hepsi[$s];
    }
    return array_values($sonuc);
}

/** Yayında yazısı olan kategoriler, paneldeki sırayla */
function kategoriler(): array
{
    return db()->query("SELECT k.id, k.ad, COUNT(*) AS sayi FROM kategoriler k JOIN yazilar y ON y.kategori_id = k.id AND y.durum = 'yayinda'
        GROUP BY k.id ORDER BY k.sira, k.ad")->fetchAll();
}
