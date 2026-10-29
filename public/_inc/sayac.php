<?php
declare(strict_types=1);

require_once __DIR__ . '/blog.php';

/*
 * Çerezsiz ziyaret sayacı.
 * Tekil ziyaretçi: IP + tarayıcı bilgisinin, her gün değişen gizli anahtarla alınmış özeti.
 * IP adresi saklanmaz; ertesi gün aynı kişi tekrar sayılır (günlük tekil).
 */

function sayacTablolari(): void
{
    static $hazir = false;
    if ($hazir) {
        return;
    }
    db()->exec('CREATE TABLE IF NOT EXISTS sayac_gunluk (
        yol TEXT NOT NULL, gun TEXT NOT NULL,
        toplam INTEGER NOT NULL DEFAULT 0, tekil INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (yol, gun)
    )');
    db()->exec('CREATE TABLE IF NOT EXISTS sayac_ziyaret (
        yol TEXT NOT NULL, gun TEXT NOT NULL, ziyaretci TEXT NOT NULL,
        PRIMARY KEY (yol, gun, ziyaretci)
    )');
    // IP başına günlük görüntüleme sayısı (sahte istekle şişirmeye karşı)
    db()->exec('CREATE TABLE IF NOT EXISTS sayac_ip (
        gun TEXT NOT NULL, ip TEXT NOT NULL, sayi INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (gun, ip)
    )');
    $hazir = true;
}

function sayacTuzu(): string
{
    $dosya = VERI . '/sayac-anahtari.txt';
    if (!is_file($dosya)) {
        file_put_contents($dosya, bin2hex(random_bytes(32)), LOCK_EX);
        @chmod($dosya, 0600);
    }
    return trim((string) file_get_contents($dosya));
}

function botMu(string $ua): bool
{
    return $ua === '' || (bool) preg_match('/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless|lighthouse/i', $ua);
}

// Sahte istekle şişirmeye karşı: bir IP günde en fazla bu kadar kayıt yazdırabilir,
// aynı IP'den en fazla bu kadar farklı tarayıcı aynı satırda tekil sayılır. Mobil operatörler
// çok sayıda kullanıcıyı aynı IP'nin arkasında topladığı için sınırlar düşük tutulmaz.
const SAYAC_IP_GUNLUK = 1000;
const SAYAC_IP_DAKIKA = 60;
const SAYAC_IP_TEKIL = 20;
// utm_source ile gelen tanınmayan adlar ayrı satır açar; uydurma adlarla tablo şişmesin diye günde en fazla bu kadar
const SAYAC_UTM_GUNLUK = 30;

// Panelde gösterilen etkileşimler. Yalnız bu adlar sayılır (api/sayac.php ve public/olay.js).
const OLAYLAR = [
    'olay:sinav-basladi' => 'Sınav simülasyonuna başladı',
    'olay:sinav-bitti' => 'Sınav simülasyonunu bitirdi',
    'olay:sinav-gecti' => 'Sınav simülasyonunu geçti',
    'olay:sinavi-dene' => '“Sınavı Dene” bağlantısına tıkladı',
    'olay:arac-testi-basladi' => 'Araç başı testine başladı',
    'olay:arac-testi-bitti' => 'Araç başı testini bitirdi',
    'olay:simulator-video' => 'Simülatör videosunu açtı',
    'olay:video' => 'Ana sayfadaki videolardan birini açtı',
    'olay:randevu-cta' => '“Ücretsiz Dene” / randevu düğmesine tıkladı',
    'olay:blog-randevu' => 'Blog yazısından randevuya geçti',
    'olay:randevu-formu' => 'Randevu formunu doldurmaya başladı',
    'olay:randevu-gonderildi' => 'Randevu gönderdi',
    'olay:telefon' => 'Telefon numarasına tıkladı',
    'olay:whatsapp' => 'WhatsApp’a tıkladı',
    'olay:instagram' => 'Instagram’a tıkladı',
    'olay:yol-tarifi' => 'Yol tarifini açtı',
    'olay:sanal-tur' => '360° kurs turunu açtı',
    'olay:google-yorumlar' => 'Google yorumlarını açtı',
    'olay:kursum-app' => 'KURSUM-APP bağlantısına tıkladı',
    'olay:galeri' => 'Fotoğraf galerisini açtı',
];

const KAYNAKLAR = [
    'google' => 'Google', 'chatgpt' => 'ChatGPT', 'gemini' => 'Gemini', 'perplexity' => 'Perplexity', 'copilot' => 'Copilot',
    'claude' => 'Claude', 'yapay-zeka' => 'Diğer yapay zekâ (DeepSeek, Grok…)', 'diger-arama' => 'Diğer arama motorları',
    'instagram' => 'Instagram', 'facebook' => 'Facebook', 'youtube' => 'YouTube', 'x' => 'X (Twitter)',
    'whatsapp' => 'WhatsApp', 'diger-site' => 'Diğer siteler', 'dogrudan' => 'Doğrudan / bilinmiyor',
];
const CIHAZLAR = ['mobil' => 'Telefon', 'tablet' => 'Tablet', 'masaustu' => 'Bilgisayar'];

// Yapay zekâ botları: sitenin içeriğini okuyan asistanlar (ziyaretçi sayılmaz, ayrı sayılır)
const YZ_BOTLARI = [
    'chatgpt-user' => ['/ChatGPT-User/i', 'ChatGPT (bir kullanıcının sorusu için sayfayı açtı)'],
    'oai-search' => ['/OAI-SearchBot/i', 'ChatGPT Arama (dizine ekliyor)'],
    'gptbot' => ['/GPTBot/i', 'OpenAI GPTBot (modeli eğitmek için)'],
    'claude-user' => ['/Claude-User/i', 'Claude (bir kullanıcının sorusu için sayfayı açtı)'],
    'claude' => ['/Claude-SearchBot|ClaudeBot|anthropic-ai/i', 'Claude botları'],
    'perplexity-user' => ['/Perplexity-User/i', 'Perplexity (bir kullanıcının sorusu için sayfayı açtı)'],
    'perplexity' => ['/PerplexityBot/i', 'Perplexity Arama'],
    'google' => ['/Googlebot|Google-Extended|GoogleOther/i', 'Google (Arama ve Gemini)'],
    'bing' => ['/bingbot/i', 'Bing (Arama ve Copilot)'],
    'meta' => ['/meta-externalagent|meta-externalfetcher/i', 'Meta AI'],
    'diger' => ['/DuckAssistBot|MistralAI-User|Amazonbot|Applebot-Extended|cohere-ai|YouBot/i', 'Diğer yapay zekâ botları'],
];

function yzBotu(string $ua): ?string
{
    foreach (YZ_BOTLARI as $ad => [$desen]) {
        if (preg_match($desen, $ua)) {
            return $ad;
        }
    }
    return null;
}

/** Yapay zekâ / arama botunun bir sayfayı okuduğunu sayar (yalnız toplam; bot başına ve sayfa başına) */
function yzBotKaydet(string $yol): void
{
    $bot = yzBotu((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    if (!$bot) {
        return;
    }
    try {
        sayacTablolari();
        $gun = date('Y-m-d');
        $st = db()->prepare('INSERT INTO sayac_gunluk (yol, gun, toplam, tekil) VALUES (?, ?, 1, 0)
            ON CONFLICT (yol, gun) DO UPDATE SET toplam = toplam + 1');
        $st->execute(['yzbot:' . $bot, $gun]);
        if (in_array($bot, ['chatgpt-user', 'claude-user', 'perplexity-user'], true)) {
            $st->execute(['yzsayfa:' . $yol, $gun]);
        }
    } catch (Throwable $e) {
        error_log('Bot sayacı: ' . $e->getMessage());
    }
}

/**
 * Ziyaretçinin nereden geldiği. Önce bağlantıdaki utm_source (ChatGPT bağlantılarına kendisi
 * utm_source=chatgpt.com ekler; kendi paylaştığın bağlantılara da ekleyebilirsin), yoksa yönlendiren adres.
 * Tanınmayan utm_source değerleri kendi adıyla ayrı sayılır (utm-<ad>). Adresin kendisi saklanmaz.
 */
function kaynakBul(string $ref, string $utm = ''): string
{
    $esles = [
        'chatgpt' => '/chatgpt|openai/', 'gemini' => '/gemini|bard\./', 'perplexity' => '/perplexity/',
        'copilot' => '/copilot|bing\.com\/chat/', 'claude' => '/claude|anthropic/',
        'yapay-zeka' => '/deepseek|you\.com|grok|meta\.ai|mistral|poe\.com|phind/',
        'google' => '/(^|\.)google(\.|$)/',
        'diger-arama' => '/(bing\.|yandex\.|duckduckgo\.|yahoo\.|ecosia\.|qwant\.|brave\.com)/',
        'instagram' => '/instagram\./', 'facebook' => '/(facebook\.|fb\.)/', 'youtube' => '/(youtube\.|youtu\.be)/',
        'x' => '/(^|\.)(t\.co|twitter\.com|x\.com)$/', 'whatsapp' => '/(whatsapp\.|wa\.me)/',
    ];
    $utm = strtr(mb_strtolower($utm), ['ç' => 'c', 'ğ' => 'g', 'ı' => 'i', 'ö' => 'o', 'ş' => 's', 'ü' => 'u']);
    $utm = substr(trim((string) preg_replace('/[^a-z0-9._-]+/', '-', $utm), '-'), 0, 40);
    if ($utm !== '') {
        $kisa = ['ig' => 'instagram', 'fb' => 'facebook', 'yt' => 'youtube', 'wa' => 'whatsapp', 'twitter' => 'x'];
        if (isset($kisa[$utm])) {
            return $kisa[$utm];
        }
        foreach ($esles as $ad => $desen) {
            if (preg_match($desen, $utm) || $utm === $ad) {
                return $ad;
            }
        }
        return 'utm-' . $utm;
    }
    $host = strtolower((string) parse_url($ref, PHP_URL_HOST));
    if ($host === '' || $host === strtolower((string) parse_url(SITE_URL, PHP_URL_HOST))
        || $host === strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''))) {
        return 'dogrudan';
    }
    foreach ($esles as $ad => $desen) {
        if (preg_match($desen, $host)) {
            return $ad;
        }
    }
    return 'diger-site';
}

function cihazBul(string $ua): string
{
    if (preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $ua)) {
        return 'tablet';
    }
    return preg_match('/Mobi|iPhone|Android/i', $ua) ? 'mobil' : 'masaustu';
}

/** Bir satırı sayar; ziyaretçi o gün bu satırda ilk kez görülüyorsa (tekil) true döner */
function sayacSatiri(string $yol, string $gun, string $ziyaretci, string $ipOzet): bool
{
    $yeni = 0;
    $ayniIp = db()->prepare('SELECT COUNT(*) FROM sayac_ziyaret WHERE yol = ? AND gun = ? AND ziyaretci >= ? AND ziyaretci < ?');
    $ayniIp->execute([$yol, $gun, $ipOzet, $ipOzet . 'g']);
    if ((int) $ayniIp->fetchColumn() < SAYAC_IP_TEKIL) {
        $ekle = db()->prepare('INSERT OR IGNORE INTO sayac_ziyaret (yol, gun, ziyaretci) VALUES (?, ?, ?)');
        $ekle->execute([$yol, $gun, $ziyaretci]);
        $yeni = $ekle->rowCount() > 0 ? 1 : 0;
    }
    db()->prepare('INSERT INTO sayac_gunluk (yol, gun, toplam, tekil) VALUES (?, ?, 1, ?)
        ON CONFLICT (yol, gun) DO UPDATE SET toplam = toplam + 1, tekil = tekil + excluded.tekil')
        ->execute([$yol, $gun, $yeni]);
    return (bool) $yeni;
}

/**
 * Bir sayfa görüntülemesini ya da etkileşimi kaydeder. Yönetici ve botlar sayılmaz.
 * Sayfalarda site geneli tekil ziyaretçi de sayılır; ziyaretçi o gün ilk kez geldiyse
 * nereden geldiği (Google, Instagram…) ve cihaz türü de bir kez sayılır.
 */
function sayacKaydet(string $yol, ?string $ref = null, ?string $utm = null): void
{
    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (yzBotu($ua)) {
        yzBotKaydet($yol);
        return;
    }
    if (botMu($ua) || isset($_COOKIE['acsk_yonetim'])) {
        return;
    }
    try {
        sayacTablolari();
        $gun = date('Y-m-d');
        $gunAnahtari = hash_hmac('sha256', $gun, sayacTuzu());
        // Ziyaretçi = IP özeti + tarayıcı özeti; ikisi de her gün değişen anahtarla, IP saklanmaz
        $ipOzet = substr(hash_hmac('sha256', ipAnahtari(), $gunAnahtari), 0, 16);
        $ziyaretci = $ipOzet . substr(hash_hmac('sha256', $ua, $gunAnahtari), 0, 16);

        // IP başına günlük ve dakikalık tavan (dakika satırı "gün saat:dakika" adıyla aynı tabloda, aynı temizlikle silinir)
        $st = db()->prepare('INSERT INTO sayac_ip (gun, ip, sayi) VALUES (?, ?, 1)
            ON CONFLICT (gun, ip) DO UPDATE SET sayi = sayi + 1 RETURNING sayi');
        foreach ([[$gun, SAYAC_IP_GUNLUK], [date('Y-m-d H:i'), SAYAC_IP_DAKIKA]] as [$anahtar, $tavan]) {
            $st->execute([$anahtar, $ipOzet]);
            if ((int) $st->fetchColumn() > $tavan) {
                return;
            }
        }

        sayacSatiri($yol, $gun, $ziyaretci, $ipOzet);
        if (!str_starts_with($yol, 'olay:') && sayacSatiri('site:ziyaret', $gun, $ziyaretci, $ipOzet)) {
            $kaynak = kaynakBul($ref ?? (string) ($_SERVER['HTTP_REFERER'] ?? ''), $utm ?? (string) ($_GET['utm_source'] ?? ''));
            if (str_starts_with($kaynak, 'utm-')) {
                $st = db()->prepare("SELECT COUNT(*), COALESCE(SUM(yol = ?), 0) FROM sayac_gunluk WHERE gun = ? AND yol LIKE 'kaynak:utm-%'");
                $st->execute(['kaynak:' . $kaynak, $gun]);
                [$utmSayisi, $varMi] = $st->fetch(PDO::FETCH_NUM);
                if (!$varMi && $utmSayisi >= SAYAC_UTM_GUNLUK) {
                    $kaynak = 'diger-site';
                }
            }
            foreach (['kaynak:' . $kaynak, 'cihaz:' . cihazBul($ua)] as $satir) {
                db()->prepare('INSERT INTO sayac_gunluk (yol, gun, toplam, tekil) VALUES (?, ?, 1, 1)
                    ON CONFLICT (yol, gun) DO UPDATE SET toplam = toplam + 1, tekil = tekil + 1')->execute([$satir, $gun]);
            }
        }

        // Eski günlerin ziyaretçi ve IP özetlerine gerek yok
        if (random_int(1, 50) === 1) {
            $dun = date('Y-m-d', strtotime('-1 day'));
            db()->prepare('DELETE FROM sayac_ziyaret WHERE gun < ?')->execute([$dun]);
            db()->prepare('DELETE FROM sayac_ip WHERE gun < ?')->execute([$dun]);
        }
    } catch (Throwable $e) {
        error_log('Sayaç hatası: ' . $e->getMessage());
    }
}

/** Yol bazında toplam ve tekil sayılar; $gun null ise tüm zamanlar. */
function sayacOzet(?int $gun = null): array
{
    sayacTablolari();
    $sart = $gun ? 'WHERE gun >= :bas' : '';
    $st = db()->prepare("SELECT yol, SUM(toplam) AS toplam, SUM(tekil) AS tekil FROM sayac_gunluk $sart GROUP BY yol");
    if ($gun) {
        $st->bindValue(':bas', date('Y-m-d', strtotime('-' . ($gun - 1) . ' days')));
    }
    $st->execute();
    $sonuc = [];
    foreach ($st->fetchAll() as $r) {
        $sonuc[$r['yol']] = ['toplam' => (int) $r['toplam'], 'tekil' => (int) $r['tekil']];
    }
    return $sonuc;
}

/** Günlük site geneli (son N gün): görüntüleme ve tekil ziyaretçi */
function sayacGunluk(int $gun = 30): array
{
    sayacTablolari();
    $st = db()->prepare("SELECT gun, toplam, tekil FROM sayac_gunluk WHERE yol = 'site:ziyaret' AND gun >= ? ORDER BY gun");
    $st->execute([date('Y-m-d', strtotime('-' . ($gun - 1) . ' days'))]);
    $var = array_column($st->fetchAll(), null, 'gun');
    $sonuc = [];
    for ($i = $gun - 1; $i >= 0; $i--) {
        $g = date('Y-m-d', strtotime("-$i days"));
        $sonuc[] = ['gun' => $g, 'toplam' => (int) ($var[$g]['toplam'] ?? 0), 'tekil' => (int) ($var[$g]['tekil'] ?? 0)];
    }
    return $sonuc;
}

/* ---------- Ana sayfada yönetimden değiştirilebilen içerik ---------- */

function ayarTablosu(): void
{
    db()->exec('CREATE TABLE IF NOT EXISTS ayarlar (anahtar TEXT PRIMARY KEY, deger TEXT NOT NULL)');
}

function ayarGetir(string $anahtar, mixed $varsayilan = null): mixed
{
    ayarTablosu();
    $st = db()->prepare('SELECT deger FROM ayarlar WHERE anahtar = ?');
    $st->execute([$anahtar]);
    $d = $st->fetchColumn();
    return $d === false ? $varsayilan : json_decode((string) $d, true);
}

function ayarKaydet(string $anahtar, mixed $deger): void
{
    ayarTablosu();
    db()->prepare('INSERT INTO ayarlar (anahtar, deger) VALUES (?, ?) ON CONFLICT (anahtar) DO UPDATE SET deger = excluded.deger')
        ->execute([$anahtar, json_encode($deger, JSON_UNESCAPED_UNICODE)]);
}
