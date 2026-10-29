<?php
declare(strict_types=1);

require_once __DIR__ . '/_ortak.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';
require_once dirname(__DIR__) . '/_inc/iletisim.php';
require_once dirname(__DIR__) . '/_inc/yorumlar.php';
require_once dirname(__DIR__) . '/_inc/randevu-saatleri.php';
require_once dirname(__DIR__) . '/_inc/indexnow.php';
require_once dirname(__DIR__) . '/_inc/medya.php';
require_once dirname(__DIR__) . '/_inc/metinler.php';

/** IndexNow bildirimi yanıt ziyaretçiye gittikten sonra yapılır; panel beklemez */
function indexnowSonra(array $yollar): void
{
    register_shutdown_function(function () use ($yollar) {
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        indexnowBildir($yollar);
    });
}

@mkdir(VERI . '/sessions', 0700, true);
session_save_path(VERI . '/sessions');
session_name('acsk_yonetim');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => guvenliBaglanti(),
    'httponly' => true,
    'samesite' => 'Strict',
]);

$yontem = $_SERVER['REQUEST_METHOD'];
$islem = (string) ($_GET['islem'] ?? '');

// Oturum (çerez) yalnız giriş denemesinde ya da açık bir oturum varken başlar;
// ziyaretçiler "son yazılar" gibi herkese açık çağrılarda çerez almaz.
if (isset($_COOKIE[session_name()]) || $islem === 'giris') {
    session_start();
}

// POST istekleri yalnızca kendi sayfamızdan (özel başlık başka siteden gönderilemez)
if ($yontem === 'POST' && ($_SERVER['HTTP_X_ISTEK'] ?? '') !== '1') {
    cevap(403, ['ok' => false, 'hata' => 'Geçersiz istek.']);
}

// Oturum: 4 saat işlem yapılmazsa ya da girişten 12 saat sonra kapanır
const OTURUM_BOSTA = 4 * 3600;
const OTURUM_EN_UZUN = 12 * 3600;
// Giriş denemeleri 15 dakikalık pencerede sayılır
const GIRIS_PENCERE = 900;
const GIRIS_IP_SINIRI = 3;      // aynı IP'den 3 hatalı denemeden sonra 15 dakika bekleme
const GIRIS_GENEL_SINIR = 30;   // tüm IP'lerden toplam; aşılırsa panel kilitlenir (423)
const CIHAZ_SURESI = 90 * 86400;

function adminMi(): bool
{
    if (empty($_SESSION['admin'])) {
        return false;
    }
    $simdi = time();
    if ($simdi - ($_SESSION['son'] ?? 0) > OTURUM_BOSTA || $simdi - ($_SESSION['bas'] ?? 0) > OTURUM_EN_UZUN) {
        $_SESSION = [];
        return false;
    }
    $_SESSION['son'] = $simdi;
    return true;
}

/** Panelde gösterilen son 30 güvenlik olayı: başarılı giriş, yeni cihazdan giriş, panel kilidi */
function girisKaydi(string $tur, string $ip): void
{
    $kayit = ['t' => date('c'), 'tur' => $tur, 'ip' => $ip, 'ua' => mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200)];
    kilitliJson(VERI . '/giris-kayitlari.json', fn (array $k) => ['__yaz' => array_slice(array_merge([$kayit], $k), 0, 30)]);
}

/** Daha önce başarıyla giriş yapılmış tarayıcıyı tanıyan imza anahtarı */
function cihazAnahtari(): string
{
    $dosya = VERI . '/giris-anahtari.txt';
    if (!is_file($dosya)) {
        file_put_contents($dosya, bin2hex(random_bytes(32)), LOCK_EX);
        @chmod($dosya, 0600);
    }
    return trim((string) file_get_contents($dosya));
}

/** Bu tarayıcı son 90 günde panele girmiş mi? Böyle cihazlar genel kilitten etkilenmez. */
function guvenilirCihaz(): bool
{
    [$zaman, $imza] = array_pad(explode('.', (string) ($_COOKIE['acsk_cihaz'] ?? ''), 2), 2, '');
    return ctype_digit($zaman) && (int) $zaman > time() - CIHAZ_SURESI
        && hash_equals(hash_hmac('sha256', $zaman, cihazAnahtari()), $imza);
}

function cihaziHatirla(): void
{
    $zaman = (string) time();
    setcookie('acsk_cihaz', $zaman . '.' . hash_hmac('sha256', $zaman, cihazAnahtari()), [
        'expires' => time() + CIHAZ_SURESI,
        'path' => '/api/',
        'secure' => guvenliBaglanti(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function adminGerekli(): void
{
    if (!adminMi()) {
        cevap(401, ['ok' => false, 'hata' => 'Oturum gerekli.']);
    }
}

function girdi(): array
{
    $v = json_decode((string) file_get_contents('php://input'), true);
    return is_array($v) ? $v : [];
}

switch ("$yontem $islem") {
    // Ana sayfadaki "Son yazılar"
    case 'GET son':
        $yazilar = array_map(fn ($y) => [
            'slug' => $y['slug'],
            'baslik' => $y['baslik'],
            'ozet' => $y['ozet'],
            'kapak' => $y['kapak'],
            'tarih' => tarihYaz($y['yayin']),
            'dakika' => $y['dakika'],
        ], yayindakiYazilar(3));
        header('Cache-Control: public, max-age=300');
        cevap(200, ['ok' => true, 'yazilar' => $yazilar]);

    case 'GET ben':
        $yaklasan = 0;
        if (adminMi() && is_file(RANDEVU_DOSYASI)) {
            $bugun = date('Y-m-d');
            $yaklasan = count(array_filter(json_decode((string) file_get_contents(RANDEVU_DOSYASI), true) ?: [], fn ($r) => ($r['tarih'] ?? '') >= $bugun));
        }
        cevap(200, ['ok' => true, 'admin' => adminMi(), 'yaklasan' => $yaklasan]);

    case 'POST giris':
        $g = girdi();
        if (empty($config['admin_sifre_hash'])) {
            cevap(503, ['ok' => false, 'hata' => 'Yönetici şifresi henüz tanımlanmadı (data/config.php).']);
        }
        $ip = istemciIp();
        $ipAnahtar = hash('sha256', ipAnahtari());
        $guvenilir = guvenilirCihaz();
        // Deneme, şifre kontrolünden önce aynı kilit içinde sayılır; aynı anda gönderilen
        // yüzlerce istek de sınırı aşamaz. Başarılı girişte bu IP'nin kayıtları silinir.
        $engel = kilitliJson(VERI . '/giris.json', function (array $k) use ($ipAnahtar, $guvenilir) {
            $k = array_values(array_filter($k, fn ($v) => ($v['t'] ?? 0) > time() - GIRIS_PENCERE));
            $ipKayit = array_filter($k, fn ($v) => ($v['k'] ?? '') === $ipAnahtar);
            if (count($ipKayit) >= GIRIS_IP_SINIRI) {
                return ['__yaz' => $k, '__donus' => ['tur' => 'ip', 'bekle' => min(array_column($ipKayit, 't')) + GIRIS_PENCERE - time()]];
            }
            if (!$guvenilir && count($k) >= GIRIS_GENEL_SINIR) {
                return ['__yaz' => $k, '__donus' => ['tur' => 'genel', 'bekle' => min(array_column($k, 't')) + GIRIS_PENCERE - time()]];
            }
            $k[] = ['k' => $ipAnahtar, 't' => time()];
            return ['__yaz' => $k, '__donus' => count($k) === GIRIS_GENEL_SINIR ? ['tur' => 'uyari'] : null];
        });
        if (($engel['tur'] ?? '') === 'uyari') {
            girisKaydi('kilit', $ip);
        } elseif ($engel) {
            header('Retry-After: ' . max(1, $engel['bekle']));
            $dakika = max(1, (int) ceil($engel['bekle'] / 60));
            $engel['tur'] === 'ip'
                ? cevap(429, ['ok' => false, 'hata' => "Çok fazla hatalı deneme. $dakika dakika sonra tekrar dene."])
                : cevap(423, ['ok' => false, 'hata' => "Panel çok sayıda hatalı deneme nedeniyle geçici olarak kilitlendi. $dakika dakika sonra tekrar dene."]);
        }
        // Kullanıcı adı yanlış olsa da şifre kontrol edilir; yanıt süresi kullanıcı adını ele vermez
        $kullaniciDogru = hash_equals((string) ($config['admin_kullanici'] ?? 'admin'), (string) ($g['kullanici'] ?? ''));
        $sifreDogru = password_verify((string) ($g['sifre'] ?? ''), (string) $config['admin_sifre_hash']);
        if (!$kullaniciDogru || !$sifreDogru) {
            cevap(401, ['ok' => false, 'hata' => 'Kullanıcı adı veya şifre hatalı.']);
        }
        kilitliJson(VERI . '/giris.json', fn (array $k) => ['__yaz' => array_values(array_filter($k, fn ($v) => ($v['k'] ?? '') !== $ipAnahtar))]);
        session_regenerate_id(true);
        $_SESSION = ['admin' => true, 'bas' => time(), 'son' => time()];
        girisKaydi($guvenilir ? 'giris' : 'yeni-cihaz', $ip);
        cihaziHatirla();
        cevap(200, ['ok' => true]);

    case 'POST cikis':
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/']);
        cevap(200, ['ok' => true]);

    case 'GET liste':
        adminGerekli();
        $rows = db()->query("SELECT y.id, y.slug, y.baslik, y.durum, y.guncelleme, y.yayin, y.kapak, y.kategori_id, COALESCE(k.ad, '') AS kategori
            FROM yazilar y " . YAZI_KATEGORI . ' ORDER BY y.guncelleme DESC')->fetchAll();
        cevap(200, ['ok' => true, 'yazilar' => $rows]);

    case 'GET kategoriler':
        adminGerekli();
        cevap(200, ['ok' => true, 'kategoriler' => db()->query("SELECT k.id, k.ad, k.sira, COUNT(y.id) AS sayi,
            SUM(y.durum = 'yayinda') AS yayinda FROM kategoriler k LEFT JOIN yazilar y ON y.kategori_id = k.id
            GROUP BY k.id ORDER BY k.sira, k.ad")->fetchAll()]);

    case 'POST kategori-kaydet':
        // Yeni kategori ya da ad değişikliği (yazılar kimlikle bağlı olduğu için ad değişince hepsinde değişir)
        adminGerekli();
        $g = girdi();
        $ad = mb_substr(trim(preg_replace('/\s+/u', ' ', (string) ($g['ad'] ?? ''))), 0, 60);
        $id = (int) ($g['id'] ?? 0);
        if (mb_strlen($ad) < 2) {
            cevap(422, ['ok' => false, 'hata' => 'Kategori adı en az 2 harf olmalı.']);
        }
        $ayni = db()->prepare('SELECT id FROM kategoriler WHERE lower(ad) = lower(?) AND id != ?');
        $ayni->execute([$ad, $id]);
        if ($ayni->fetchColumn()) {
            cevap(409, ['ok' => false, 'hata' => 'Bu adda bir kategori zaten var.']);
        }
        if ($id) {
            db()->prepare('UPDATE kategoriler SET ad = ? WHERE id = ?')->execute([$ad, $id]);
            db()->prepare('UPDATE yazilar SET kategori = ? WHERE kategori_id = ?')->execute([$ad, $id]);
        } else {
            db()->prepare('INSERT INTO kategoriler (ad, sira) VALUES (?, (SELECT COALESCE(MAX(sira), 0) + 1 FROM kategoriler))')->execute([$ad]);
            $id = (int) db()->lastInsertId();
        }
        cevap(200, ['ok' => true, 'id' => $id]);

    case 'POST kategori-sil':
        // Kategori silinince yazılar silinmez, yalnız kategorisiz kalır
        adminGerekli();
        $id = (int) (girdi()['id'] ?? 0);
        db()->prepare("UPDATE yazilar SET kategori_id = NULL, kategori = '' WHERE kategori_id = ?")->execute([$id]);
        db()->prepare('DELETE FROM kategoriler WHERE id = ?')->execute([$id]);
        cevap(200, ['ok' => true]);

    case 'POST kategori-sira':
        adminGerekli();
        $st = db()->prepare('UPDATE kategoriler SET sira = ? WHERE id = ?');
        foreach (array_values(array_slice((array) (girdi()['idler'] ?? []), 0, 200)) as $i => $id) {
            $st->execute([$i + 1, (int) $id]);
        }
        cevap(200, ['ok' => true]);

    case 'GET getir':
        adminGerekli();
        $st = db()->prepare('SELECT * FROM yazilar WHERE id = ?');
        $st->execute([(int) ($_GET['id'] ?? 0)]);
        $y = $st->fetch();
        if (!$y) {
            cevap(404, ['ok' => false, 'hata' => 'Yazı bulunamadı.']);
        }
        $y['icerik'] = json_decode($y['icerik'], true);
        $y['sss'] = json_decode($y['sss'] ?: '[]', true);
        cevap(200, ['ok' => true, 'yazi' => $y]);

    case 'POST kaydet':
        adminGerekli();
        $g = girdi();
        $id = (int) ($g['id'] ?? 0);
        $baslik = trim((string) ($g['baslik'] ?? ''));
        if ($baslik === '' || mb_strlen($baslik) > 200) {
            cevap(422, ['ok' => false, 'hata' => 'Başlık gerekli.']);
        }
        $icerik = $g['icerik'] ?? null;
        if (!is_array($icerik) || ($icerik['type'] ?? '') !== 'doc') {
            cevap(422, ['ok' => false, 'hata' => 'İçerik okunamadı.']);
        }
        $durum = ($g['durum'] ?? '') === 'yayinda' ? 'yayinda' : 'taslak';
        $ozet = trim((string) ($g['ozet'] ?? ''));
        if ($ozet === '') {
            $ozet = mb_substr(trim(preg_replace('/\s+/u', ' ', icerikMetin($icerik))), 0, 180);
        }
        $kapak = guvenliGorsel((string) ($g['kapak'] ?? '')) ?? '';
        $slug = slugYap((string) (($g['slug'] ?? '') ?: $baslik));
        $simdi = date('c');

        // Aynı adres varsa sonuna sayı ekle
        $kontrol = db()->prepare('SELECT COUNT(*) FROM yazilar WHERE slug = ? AND id != ?');
        $temel = $slug;
        for ($n = 2; ; $n++) {
            $kontrol->execute([$slug, $id]);
            if (!(int) $kontrol->fetchColumn()) {
                break;
            }
            $slug = "$temel-$n";
        }

        $json = json_encode($icerik, JSON_UNESCAPED_UNICODE);
        $seoBaslik = mb_substr(trim((string) ($g['seo_baslik'] ?? '')), 0, 120);
        $seoAciklama = mb_substr(trim((string) ($g['seo_aciklama'] ?? '')), 0, 300);
        $anahtar = mb_substr(trim((string) ($g['anahtar_kelime'] ?? '')), 0, 80);
        // Kategori kimliğiyle bağlanır; ad yalnız eski sütunda kopya olarak tutulur
        $st = db()->prepare('SELECT id, ad FROM kategoriler WHERE id = ?');
        $st->execute([(int) ($g['kategori_id'] ?? 0)]);
        $kat = $st->fetch() ?: ['id' => null, 'ad' => ''];
        $kategoriId = $kat['id'];
        $kategori = $kat['ad'];
        $sss = [];
        foreach (array_slice((array) ($g['sss'] ?? []), 0, 12) as $q) {
            $soru = mb_substr(trim((string) ($q['soru'] ?? '')), 0, 200);
            $cevap = mb_substr(trim((string) ($q['cevap'] ?? '')), 0, 1200);
            if ($soru !== '' && $cevap !== '') {
                $sss[] = ['soru' => $soru, 'cevap' => $cevap];
            }
        }
        $sssJson = json_encode($sss, JSON_UNESCAPED_UNICODE);
        if ($id) {
            $st = db()->prepare('SELECT yayin FROM yazilar WHERE id = ?');
            $st->execute([$id]);
            $eski = $st->fetch();
            if (!$eski) {
                cevap(404, ['ok' => false, 'hata' => 'Yazı bulunamadı.']);
            }
            $yayin = $durum === 'yayinda' ? ($eski['yayin'] ?: $simdi) : $eski['yayin'];
            db()->prepare('UPDATE yazilar SET slug=?, baslik=?, ozet=?, kapak=?, icerik=?, durum=?, guncelleme=?, yayin=?, seo_baslik=?, seo_aciklama=?, anahtar_kelime=?, sss=?, kategori=?, kategori_id=? WHERE id=?')
                ->execute([$slug, $baslik, $ozet, $kapak, $json, $durum, $simdi, $yayin, $seoBaslik, $seoAciklama, $anahtar, $sssJson, $kategori, $kategoriId, $id]);
        } else {
            db()->prepare('INSERT INTO yazilar (slug, baslik, ozet, kapak, icerik, durum, olusturma, guncelleme, yayin, seo_baslik, seo_aciklama, anahtar_kelime, sss, kategori, kategori_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$slug, $baslik, $ozet, $kapak, $json, $durum, $simdi, $simdi, $durum === 'yayinda' ? $simdi : null, $seoBaslik, $seoAciklama, $anahtar, $sssJson, $kategori, $kategoriId]);
            $id = (int) db()->lastInsertId();
        }
        // Yayındaki yazı değişince arama motorlarına haber verilir (yanıt gönderildikten sonra)
        if ($durum === 'yayinda') {
            indexnowSonra(['/blog/' . $slug, '/blog/', '/sitemap.xml']);
        }
        cevap(200, ['ok' => true, 'id' => $id, 'slug' => $slug, 'durum' => $durum]);

    case 'POST sil':
        adminGerekli();
        $id = (int) (girdi()['id'] ?? 0);
        $st = db()->prepare('SELECT kapak || icerik FROM yazilar WHERE id = ?');
        $st->execute([$id]);
        // Yazının görselleri (JSON'da "\/uploads\/..." biçiminde de olabilir)
        preg_match_all('~uploads(?:\\\\?/[\w.-]+)*?\\\\?/([\w-]+\.webp)~', (string) $st->fetchColumn(), $m);
        $st = db()->prepare("SELECT slug FROM yazilar WHERE id = ? AND durum = 'yayinda'");
        $st->execute([$id]);
        $silinenSlug = $st->fetchColumn();
        db()->prepare('DELETE FROM yazilar WHERE id = ?')->execute([$id]);
        if ($silinenSlug) {
            indexnowSonra(['/blog/' . $silinenSlug, '/blog/']);
        }
        $silinen = kullanilmayanGorselleriSil($m[1]);
        cevap(200, ['ok' => true, 'silinen_gorsel' => $silinen]);

    case 'POST yukle':
        adminGerekli();
        $f = $_FILES['dosya'] ?? null;
        if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
            cevap(422, ['ok' => false, 'hata' => 'Dosya yüklenemedi (en fazla 12 MB).']);
        }
        if ($f['size'] > 12 * 1024 * 1024) {
            cevap(422, ['ok' => false, 'hata' => 'Görsel en fazla 12 MB olabilir.']);
        }
        $bilgi = @getimagesize($f['tmp_name']);
        $turler = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng', IMAGETYPE_WEBP => 'imagecreatefromwebp', IMAGETYPE_GIF => 'imagecreatefromgif'];
        if (!$bilgi || !isset($turler[$bilgi[2]])) {
            cevap(422, ['ok' => false, 'hata' => 'Sadece JPG, PNG, WEBP veya GIF yüklenebilir.']);
        }
        if ($bilgi[0] * $bilgi[1] > 40_000_000) {
            cevap(422, ['ok' => false, 'hata' => 'Görsel çok büyük.']);
        }
        $img = $turler[$bilgi[2]]($f['tmp_name']);
        if (!$img) {
            cevap(422, ['ok' => false, 'hata' => 'Görsel okunamadı.']);
        }
        // Telefon fotoğraflarının yönünü düzelt
        if ($bilgi[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $exif = @exif_read_data($f['tmp_name']);
            $aci = [3 => 180, 6 => -90, 8 => 90][$exif['Orientation'] ?? 1] ?? 0;
            if ($aci) {
                $img = imagerotate($img, $aci, 0);
            }
        }
        if (imagesx($img) > 1600) {
            $img = imagescale($img, 1600);
        }
        imagepalettetotruecolor($img);
        imagesavealpha($img, true);
        $klasor = date('Y/m');
        @mkdir(VERI . "/uploads/$klasor", 0755, true);
        $ad = bin2hex(random_bytes(8)) . '.webp';
        imagewebp($img, VERI . "/uploads/$klasor/$ad", 80);
        cevap(200, ['ok' => true, 'url' => "/uploads/$klasor/$ad"]);

    case 'GET ayarlar':
        adminGerekli();
        cevap(200, [
            'ok' => true,
            'duyuru' => ayarGetir('duyuru', ['aktif' => false, 'metin' => '', 'link' => '']),
            'kursum' => (string) (ayarGetir('kursum', [])['link'] ?? ''),
            'iletisim' => array_intersect_key(iletisim(), ILETISIM_VARSAYILAN),
        ]);

    case 'POST ayarlar':
        adminGerekli();
        $g = girdi();
        $d = $g['duyuru'] ?? [];
        $duyuru = [
            'aktif' => !empty($d['aktif']),
            'metin' => mb_substr(trim((string) ($d['metin'] ?? '')), 0, 160),
            'link' => guvenliLink((string) ($d['link'] ?? '')) ?? '',
        ];
        $il = (array) ($g['iletisim'] ?? []);
        $telefon = telefonTemizle((string) ($il['telefon'] ?? ''));
        $whatsapp = trim((string) ($il['whatsapp'] ?? '')) === '' ? $telefon : telefonTemizle((string) $il['whatsapp']);
        $eposta = trim((string) ($il['eposta'] ?? ''));
        $instagram = preg_replace('~^(https?://)?(www\.)?instagram\.com/|^@|/$~i', '', trim((string) ($il['instagram'] ?? '')));
        if (!$telefon || !$whatsapp) {
            cevap(422, ['ok' => false, 'hata' => 'Telefon ve WhatsApp numarası 10 haneli olmalı (örn. 0545 359 51 55).']);
        }
        if (!filter_var($eposta, FILTER_VALIDATE_EMAIL)) {
            cevap(422, ['ok' => false, 'hata' => 'E-posta adresi geçersiz.']);
        }
        if (!preg_match('/^[A-Za-z0-9._]{1,30}$/', (string) $instagram)) {
            cevap(422, ['ok' => false, 'hata' => 'Instagram kullanıcı adı geçersiz.']);
        }
        $kursum = trim((string) ($g['kursum'] ?? ''));
        if ($kursum !== '' && !preg_match('~^https://~i', $kursum)) {
            cevap(422, ['ok' => false, 'hata' => 'KURSUM-APP bağlantısı https:// ile başlamalı.']);
        }
        ayarKaydet('duyuru', $duyuru);
        ayarKaydet('kursum', ['link' => mb_substr($kursum, 0, 300)]);
        ayarKaydet('iletisim', ['telefon' => $telefon, 'whatsapp' => $whatsapp, 'eposta' => $eposta, 'instagram' => $instagram]);
        cevap(200, ['ok' => true]);

    // Ana sayfa medya alanları (fotoğraf, YouTube, Instagram, video): _inc/medya.php
    case 'GET medya':
        adminGerekli();
        $alanlar = [];
        foreach (MEDYA_ALANLARI as $ad => $a) {
            $alanlar[] = ['ad' => $ad, 'bolum' => $a['bolum'], 'baslik' => $a['ad'], 'oran' => $a['oran'], 'liste' => !empty($a['liste']), 'yazi' => $a['yazi']];
        }
        cevap(200, ['ok' => true, 'alanlar' => $alanlar, 'kayit' => (object) medyaAyari(), 'varsayilan' => (object) varsayilanMedya(anaSayfaKaynagi()), 'enFazla' => MEDYA_EN_FAZLA]);

    case 'POST medya':
        adminGerekli();
        $kayit = medyaAyari();
        foreach ((array) (girdi()['medya'] ?? []) as $ad => $ogeler) {
            if (!isset(MEDYA_ALANLARI[$ad])) {
                continue;
            }
            // null: alan varsayılana döner
            if ($ogeler === null) {
                unset($kayit[$ad]);
                continue;
            }
            $temiz = [];
            foreach (array_slice((array) $ogeler, 0, MEDYA_EN_FAZLA) as $o) {
                $t = medyaOgesiTemizle((array) $o);
                if (is_string($t)) {
                    cevap(422, ['ok' => false, 'hata' => MEDYA_ALANLARI[$ad]['ad'] . ': ' . $t]);
                }
                $temiz[] = $t;
            }
            $kayit[$ad] = $temiz;
        }
        ayarKaydet('medya', (object) $kayit);
        cevap(200, ['ok' => true]);

    // Panelden video yükleme (MP4 / WebM, en fazla 60 MB). Video olduğu gibi saklanır; kapağı panel üretir.
    case 'POST video-yukle':
        adminGerekli();
        $f = $_FILES['dosya'] ?? null;
        if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
            cevap(422, ['ok' => false, 'hata' => 'Video yüklenemedi (en fazla 60 MB).']);
        }
        if ($f['size'] > 60 * 1024 * 1024) {
            cevap(422, ['ok' => false, 'hata' => 'Video en fazla 60 MB olabilir.']);
        }
        $bas = (string) file_get_contents($f['tmp_name'], false, null, 0, 16);
        $uzanti = substr($bas, 4, 4) === 'ftyp' ? 'mp4' : (str_starts_with($bas, "\x1A\x45\xDF\xA3") ? 'webm' : null);
        if (!$uzanti) {
            cevap(422, ['ok' => false, 'hata' => 'Sadece MP4, MOV ya da WebM video yüklenebilir.']);
        }
        $klasor = 'video/' . date('Y/m');
        @mkdir(VERI . "/uploads/$klasor", 0755, true);
        $ad = bin2hex(random_bytes(8)) . ".$uzanti";
        if (!move_uploaded_file($f['tmp_name'], VERI . "/uploads/$klasor/$ad")) {
            cevap(500, ['ok' => false, 'hata' => 'Video kaydedilemedi.']);
        }
        @chmod(VERI . "/uploads/$klasor/$ad", 0644);
        cevap(200, ['ok' => true, 'url' => "/uploads/$klasor/$ad"]);

    // Ana sayfa yazıları ve sık sorulan sorular: _inc/metinler.php
    case 'GET metinler':
        adminGerekli();
        $sss = ayarGetir('sss');
        cevap(200, [
            'ok' => true,
            'alanlar' => array_values(metinAlanlari(anaSayfaKaynagi())),
            'kayit' => (object) ayarGetir('metinler', []),
            'sss' => sssListesi(),
            'sssVarsayilan' => !(is_array($sss) && $sss),
            'sssSinir' => ['adet' => SSS_EN_FAZLA, 'soru' => SSS_SORU_EN_FAZLA, 'cevap' => SSS_CEVAP_EN_FAZLA],
        ]);

    case 'POST metinler':
        adminGerekli();
        $g = girdi();
        $metinler = metinleriTemizle((array) ($g['metinler'] ?? []), metinAlanlari(anaSayfaKaynagi()));
        if (is_string($metinler)) {
            cevap(422, ['ok' => false, 'hata' => $metinler]);
        }
        $sss = null;
        if (is_array($g['sss'] ?? null)) {
            $sss = sssTemizle($g['sss']);
            if (is_string($sss)) {
                cevap(422, ['ok' => false, 'hata' => $sss]);
            }
            // Varsayılanla aynıysa kaydedilmez (index.html'deki sorular güncellenirse onlar görünür)
            if ($sss === varsayilanSss(anaSayfaKaynagi())) {
                $sss = null;
            }
        }
        ayarKaydet('metinler', (object) $metinler);
        ayarKaydet('sss', $sss);
        cevap(200, ['ok' => true]);

    // Panel kullanım videosu: yalnız giriş yapmış yöneticiye verilir (data/kullanim/, sitede herkese açık adresi yok).
    // İleri-geri sarma için Range isteklerini karşılar.
    case 'GET kullanim-video':
        adminGerekli();
        $dosya = VERI . '/kullanim/panel-tanitim.mp4';
        if (!is_file($dosya)) {
            cevap(404, ['ok' => false, 'hata' => 'Video bulunamadı.']);
        }
        session_write_close();
        $boyut = filesize($dosya);
        $bas = 0;
        $son = $boyut - 1;
        header('Content-Type: video/mp4');
        header('Accept-Ranges: bytes');
        header('Cache-Control: private, max-age=3600');
        header('X-Robots-Tag: noindex, nofollow');
        if (preg_match('/^bytes=(\d*)-(\d*)$/', (string) ($_SERVER['HTTP_RANGE'] ?? ''), $m)) {
            if ($m[1] === '') {
                $bas = max(0, $boyut - (int) $m[2]);
            } else {
                $bas = (int) $m[1];
                if ($m[2] !== '') {
                    $son = min((int) $m[2], $son);
                }
            }
            if ($bas > $son) {
                http_response_code(416);
                header("Content-Range: bytes */$boyut");
                exit;
            }
            http_response_code(206);
            header("Content-Range: bytes $bas-$son/$boyut");
        }
        header('Content-Length: ' . ($son - $bas + 1));
        $f = fopen($dosya, 'rb');
        fseek($f, $bas);
        for ($kalan = $son - $bas + 1; $kalan > 0 && !feof($f);) {
            $parca = fread($f, min(262144, $kalan));
            echo $parca;
            flush();
            $kalan -= strlen($parca);
        }
        fclose($f);
        exit;

    case 'GET kullanim':
        adminGerekli();
        cevap(200, ['ok' => true, 'video' => is_file(VERI . '/kullanim/panel-tanitim.mp4')]);

    case 'GET randevu-saatleri':
        adminGerekli();
        $a = randevuAyarlari();
        unset($a['saatler']);
        cevap(200, ['ok' => true, 'ayarlar' => $a]);

    case 'POST randevu-saatleri':
        adminGerekli();
        $g = girdi();
        $saat = fn ($s) => preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $s) ? (string) $s : null;
        $gunler = [];
        for ($i = 0; $i <= 6; $i++) {
            $gun = (array) ($g['gunler'][$i] ?? []);
            $bas = $saat($gun['bas'] ?? '');
            $bit = $saat($gun['bit'] ?? '');
            if (!empty($gun['acik']) && (!$bas || !$bit || $bas > $bit)) {
                cevap(422, ['ok' => false, 'hata' => 'Açık günlerde ilk ve son randevu saatini doğru yaz (ilk saat son saatten önce olmalı).']);
            }
            $gunler[$i] = ['acik' => !empty($gun['acik']), 'bas' => $bas ?? '09:00', 'bit' => $bit ?? '17:00'];
        }
        $kapali = [];
        foreach (array_slice((array) ($g['kapali'] ?? []), 0, 100) as $t) {
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $t) && (string) $t >= date('Y-m-d')) {
                $kapali[] = (string) $t;
            }
        }
        sort($kapali);
        ayarKaydet('randevu_saatleri', [
            'gunler' => $gunler,
            'aralik' => in_array((int) ($g['aralik'] ?? 60), [15, 20, 30, 45, 60, 90, 120], true) ? (int) $g['aralik'] : 60,
            'kapasite' => max(1, min(20, (int) ($g['kapasite'] ?? 1))),
            'ileriGun' => max(1, min(120, (int) ($g['ileriGun'] ?? 30))),
            'kapali' => array_values(array_unique($kapali)),
        ]);
        cevap(200, ['ok' => true]);

    case 'GET yorumlar':
        adminGerekli();
        $bpMesaj = ayarGetir('google_bp_mesaj');
        if ($bpMesaj) {
            ayarKaydet('google_bp_mesaj', null);
        }
        cevap(200, [
            'ok' => true,
            'bpMesaj' => $bpMesaj,
            'yorumlar' => tumYorumlar(),
            'ozet' => ayarGetir('google_ozet'),
            'hata' => ayarGetir('google_hata'),
            'sonDeneme' => (int) ayarGetir('google_son_deneme', 0),
            'anahtarVar' => yorumKaynagiVar(),
            'serp' => !empty($config['serpapi_anahtari']),
            'gbp' => ($b = gbpBaglanti()) ? ['hesap' => $b['hesap'], 'ad' => $b['ad'], 't' => $b['t']] : null,
            'gbpAyarli' => gbpAyarliMi(),
        ]);

    case 'GET google-baglan':
        // Panelden açılır; işletme sahibinin hesabıyla Google'ın onay sayfasına gider
        adminGerekli();
        if (!gbpAyarliMi()) {
            cevap(503, ['ok' => false, 'hata' => 'OAuth istemcisi tanımlı değil (data/config.php → google_oauth_istemci, google_oauth_gizli).']);
        }
        header('Location: ' . gbpOnayAdresi(), true, 302);
        exit;

    case 'GET google-donus':
        // Google'dan dönüş. Oturum çerezi (SameSite=Strict) bu yönlendirmede gelmez; isteği,
        // panelin ürettiği tek kullanımlık durum anahtarı doğrular.
        // Panelden başlatılmış geçerli bir bağlantı isteği yoksa hiçbir şey yapılmaz (panel adresi de verilmez)
        $bekleyen = ayarGetir('google_bp_durum');
        if (!is_array($bekleyen) || time() - (int) ($bekleyen['t'] ?? 0) > 600
            || !hash_equals((string) ($bekleyen['d'] ?? ''), hash('sha256', (string) ($_GET['state'] ?? '')))) {
            cevap(404, ['ok' => false, 'hata' => 'Bilinmeyen işlem.']);
        }
        $mesaj = 'Google bağlantısı kuruldu, yorumlar çekiliyor.';
        try {
            if (isset($_GET['error'])) {
                ayarKaydet('google_bp_durum', null);
                throw new RuntimeException('Google izni verilmedi.');
            }
            gbpDonus((string) ($_GET['code'] ?? ''), (string) ($_GET['state'] ?? ''));
            yorumTablosu();
            $sonuc = yorumlariGuncelle();
            if (!$sonuc['ok']) {
                $mesaj = 'Bağlantı kuruldu ama yorumlar alınamadı: ' . $sonuc['hata'];
            }
        } catch (Throwable $e) {
            error_log('Google bağlantısı: ' . $e->getMessage());
            $mesaj = 'Google bağlantısı kurulamadı: ' . $e->getMessage();
        }
        ayarKaydet('google_bp_mesaj', $mesaj);
        header('Content-Type: text/html; charset=utf-8');
        // Panele yeni bir gezinmeyle dönülür ki oturum çerezi gönderilsin
        $panel = e(rtrim((string) (getenv('PANEL_YOLU') ?: '/'), '/') . '/#yorumlar');
        echo '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' . $panel . '"><title>Yönlendiriliyor</title><a href="' . $panel . '">Panele dön</a>';
        exit;

    case 'POST google-kopar':
        adminGerekli();
        ayarKaydet('google_bp', null);
        ayarKaydet('google_bp_erisim', null);
        cevap(200, ['ok' => true]);

    case 'POST yorum':
        adminGerekli();
        $g = girdi();
        if (!in_array($g['durum'] ?? '', ['oto', 'goster', 'gizle'], true)) {
            cevap(422, ['ok' => false, 'hata' => 'Geçersiz seçim.']);
        }
        yorumTablosu();
        db()->prepare('UPDATE google_yorumlar SET durum = ? WHERE id = ?')->execute([$g['durum'], (string) ($g['id'] ?? '')]);
        cevap(200, ['ok' => true]);

    case 'POST yorum-ekle':
        adminGerekli();
        $g = girdi();
        $yazar = mb_substr(trim((string) ($g['yazar'] ?? '')), 0, 120);
        $metin = mb_substr(trim((string) ($g['metin'] ?? '')), 0, 2000);
        $puan = (int) ($g['puan'] ?? 5);
        $tarih = (string) ($g['tarih'] ?? '');
        if ($yazar === '' || $metin === '' || $puan < 1 || $puan > 5 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $tarih) || $tarih > date('Y-m-d')) {
            cevap(422, ['ok' => false, 'hata' => 'Ad, yorum, 1–5 arası yıldız ve geçmiş bir tarih gerekli.']);
        }
        yorumTablosu();
        // Fotoğraf panelden yüklenir (sunucuda yeniden kodlanmış /uploads/ görseli)
        $foto = (string) ($g['foto'] ?? '');
        $foto = str_starts_with($foto, '/uploads/') ? $foto : '';
        db()->prepare("INSERT INTO google_yorumlar (id, yazar, yazar_url, yazar_foto, puan, metin, tarih, cekilme, durum, kaynak) VALUES (?, ?, '', ?, ?, ?, ?, ?, 'goster', 'elle')")
            ->execute(['elle-' . bin2hex(random_bytes(6)), $yazar, $foto, $puan, $metin, $tarih . 'T12:00:00+03:00', date('c')]);
        cevap(200, ['ok' => true]);

    case 'POST yorum-sil':
        adminGerekli();
        yorumTablosu();
        db()->prepare("DELETE FROM google_yorumlar WHERE id = ? AND kaynak = 'elle'")->execute([(string) (girdi()['id'] ?? '')]);
        cevap(200, ['ok' => true]);

    case 'POST google-ozet':
        // Google bağlantısı yokken puan ve yorum sayısı elle girilir (bağlantı kurulunca Google'ınki yazılır)
        adminGerekli();
        $g = girdi();
        $ortalama = round((float) str_replace(',', '.', (string) ($g['ortalama'] ?? '')), 1);
        $toplam = (int) ($g['toplam'] ?? 0);
        if (($g['temizle'] ?? false) === true) {
            ayarKaydet('google_ozet', null);
            cevap(200, ['ok' => true]);
        }
        if ($ortalama < 1 || $ortalama > 5 || $toplam < 1) {
            cevap(422, ['ok' => false, 'hata' => 'Puan 1 ile 5 arasında, yorum sayısı en az 1 olmalı.']);
        }
        ayarKaydet('google_ozet', ['ortalama' => $ortalama, 'toplam' => $toplam, 'guncelleme' => date('c'), 'elle' => true]);
        cevap(200, ['ok' => true]);

    case 'POST yorum-sira':
        adminGerekli();
        yorumTablosu();
        $sira = db()->prepare('UPDATE google_yorumlar SET sira = ? WHERE id = ?');
        foreach (array_values(array_slice((array) (girdi()['idler'] ?? []), 0, 500)) as $i => $id) {
            $sira->execute([$i + 1, (string) $id]);
        }
        cevap(200, ['ok' => true]);

    case 'POST yorumlari-yenile':
        adminGerekli();
        // Google kotası için elle yenileme 5 dakikada bir
        if (time() - (int) ayarGetir('google_son_elle', 0) < 300) {
            cevap(429, ['ok' => false, 'hata' => 'Az önce yenilendi; birkaç dakika sonra tekrar dene.']);
        }
        ayarKaydet('google_son_elle', time());
        $sonuc = yorumlariGuncelle();
        cevap($sonuc['ok'] ? 200 : 502, $sonuc['ok'] ? $sonuc : ['ok' => false, 'hata' => $sonuc['hata']]);

    case 'GET istatistik':
        adminGerekli();
        // Dönem: 1 = bugün, 7 / 30 gün, 0 = tüm zamanlar
        $donem = (int) ($_GET['gun'] ?? 30);
        if (!in_array($donem, [0, 1, 7, 30], true)) {
            $donem = 30;
        }
        $ozet = sayacOzet($donem ?: null);
        $tum = $donem ? sayacOzet() : $ozet;
        $bos = ['toplam' => 0, 'tekil' => 0];
        $liste = function (string $onek, array $etiketler) use ($ozet, $bos) {
            $sonuc = [];
            foreach ($etiketler as $ad => $etiket) {
                $sonuc[] = ['ad' => $ad, 'etiket' => $etiket] + ($ozet[$onek . $ad] ?? $bos);
            }
            usort($sonuc, fn ($x, $y) => [$y['tekil'], $y['toplam']] <=> [$x['tekil'], $x['toplam']]);
            return $sonuc;
        };
        $sayfalar = [];
        foreach (['/' => 'Ana sayfa', '/sinav-deneyimi/' => 'Sınav simülasyonu', '/blog/' => 'Blog listesi', '/kvkk/' => 'KVKK metni'] as $yol => $ad) {
            $sayfalar[] = ['yol' => $yol, 'ad' => $ad] + ($ozet[$yol] ?? $bos);
        }
        $yazilar = [];
        foreach (db()->query("SELECT slug, baslik, yayin FROM yazilar WHERE durum = 'yayinda'")->fetchAll() as $y) {
            $yol = '/blog/' . $y['slug'];
            $yazilar[] = ['slug' => $y['slug'], 'baslik' => $y['baslik'], 'yayin' => tarihYaz($y['yayin']), 'yayinIso' => $y['yayin'],
                'donem' => $ozet[$yol] ?? $bos, 'tum' => $tum[$yol] ?? $bos];
        }
        usort($yazilar, fn ($x, $y) => [$y['donem']['toplam'], $y['tum']['toplam']] <=> [$x['donem']['toplam'], $x['tum']['toplam']]);

        $randevular = is_file(RANDEVU_DOSYASI) ? (json_decode((string) file_get_contents(RANDEVU_DOSYASI), true) ?: []) : [];
        $bas = $donem ? date('Y-m-d', strtotime('-' . ($donem - 1) . ' days')) : '';
        $bugun = date('Y-m-d');
        $yaklasan = array_values(array_filter($randevular, fn ($r) => ($r['tarih'] ?? '') >= $bugun));
        usort($yaklasan, fn ($x, $y) => strcmp($x['tarih'] . $x['saat'], $y['tarih'] . $y['saat']));

        // Son panel girişleri: tarayıcı ve sistem kısaltılarak gösterilir
        $girisler = is_file(VERI . '/giris-kayitlari.json') ? (json_decode((string) file_get_contents(VERI . '/giris-kayitlari.json'), true) ?: []) : [];
        $tarayici = function (string $ua): string {
            $t = match (true) {
                str_contains($ua, 'Edg/') => 'Edge', str_contains($ua, 'OPR/') => 'Opera', str_contains($ua, 'Firefox/') => 'Firefox',
                str_contains($ua, 'Chrome/') => 'Chrome', str_contains($ua, 'Safari/') => 'Safari', default => 'Tarayıcı',
            };
            $s = match (true) {
                str_contains($ua, 'iPhone') => 'iPhone', str_contains($ua, 'iPad') => 'iPad', str_contains($ua, 'Android') => 'Android',
                str_contains($ua, 'Windows') => 'Windows', str_contains($ua, 'Mac OS') => 'macOS', str_contains($ua, 'Linux') => 'Linux', default => '',
            };
            return trim("$t · $s", ' ·');
        };

        cevap(200, [
            'ok' => true,
            'donem' => $donem,
            'ziyaret' => $ozet['site:ziyaret'] ?? $bos,
            'gunluk' => sayacGunluk($donem === 7 ? 7 : 30),
            'sayfalar' => $sayfalar,
            'olaylar' => $liste('', OLAYLAR),
            // utm_source ile gelen tanınmayan kaynaklar (kendi paylaştığın bağlantılar) kendi adlarıyla
            'kaynaklar' => $liste('kaynak:', KAYNAKLAR + array_combine(
                $u = array_map(fn ($k) => substr($k, 7), array_values(array_filter(array_keys($ozet), fn ($k) => str_starts_with($k, 'kaynak:utm-')))),
                array_map(fn ($k) => 'Bağlantı: ' . substr($k, 4), $u)
            )),
            'yzBotlari' => $liste('yzbot:', array_map(fn ($b) => $b[1], YZ_BOTLARI)),
            'yzSayfalar' => (function () use ($ozet) {
                $s = [];
                foreach ($ozet as $k => $v) {
                    if (str_starts_with($k, 'yzsayfa:')) {
                        $s[] = ['yol' => substr($k, 8)] + $v;
                    }
                }
                usort($s, fn ($x, $y) => $y['toplam'] <=> $x['toplam']);
                return array_slice($s, 0, 10);
            })(),
            'cihazlar' => $liste('cihaz:', CIHAZLAR),
            'yazilar' => $yazilar,
            'randevu' => [
                'donem' => count(array_filter($randevular, fn ($r) => substr((string) ($r['olusturma'] ?? ''), 0, 10) >= $bas)),
                'yaklasanSayi' => count($yaklasan),
                'yaklasan' => array_slice($yaklasan, 0, 5),
            ],
            'girisler' => array_map(fn ($g) => ['t' => $g['t'], 'tur' => $g['tur'], 'ip' => $g['ip'], 'tarayici' => $tarayici($g['ua'] ?? '')], array_slice($girisler, 0, 10)),
        ]);

    case 'GET randevular':
        adminGerekli();
        $liste = is_file(RANDEVU_DOSYASI) ? (json_decode((string) file_get_contents(RANDEVU_DOSYASI), true) ?: []) : [];
        $sinir = date('Y-m-d', strtotime('-7 days'));
        $liste = array_values(array_filter($liste, fn ($r) => ($r['tarih'] ?? '') >= $sinir));
        usort($liste, fn ($a, $b) => strcmp($a['tarih'] . $a['saat'], $b['tarih'] . $b['saat']));
        cevap(200, ['ok' => true, 'randevular' => $liste]);

    case 'POST randevu-ekle':
        // Telefonla ya da yüz yüze alınan randevu: çalışma saati ve doluluk sınırı yetkiliyi bağlamaz
        adminGerekli();
        $g = girdi();
        $ad = mb_substr(trim(preg_replace('/\s+/u', ' ', (string) ($g['ad'] ?? ''))), 0, 80);
        $telefon = telefonTemizle((string) ($g['telefon'] ?? ''));
        $tarih = (string) ($g['tarih'] ?? '');
        $saat = (string) ($g['saat'] ?? '');
        $tur = in_array($g['tur'] ?? '', ['vr', 'bilgi'], true) ? $g['tur'] : 'bilgi';
        $sinif = $tur === 'vr' ? 'B' : (in_array($g['sinif'] ?? '', ['B', 'B Otomatik', 'A1', 'A2', 'A', 'C', 'Karar vermedim'], true) ? $g['sinif'] : 'Karar vermedim');
        $not = mb_substr(trim((string) ($g['not'] ?? '')), 0, 300);
        $gun = DateTimeImmutable::createFromFormat('!Y-m-d', $tarih);
        if (mb_strlen($ad) < 2) {
            cevap(422, ['ok' => false, 'hata' => 'Ad soyad gerekli.']);
        }
        if (!$telefon) {
            cevap(422, ['ok' => false, 'hata' => 'Telefon 10 haneli olmalı (örn. 0532 123 45 67).']);
        }
        if (!$gun || $gun->format('Y-m-d') !== $tarih || $tarih < date('Y-m-d', strtotime('-7 days')) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $saat)) {
            cevap(422, ['ok' => false, 'hata' => 'Geçerli bir tarih ve saat seç.']);
        }
        $randevu = ['id' => bin2hex(random_bytes(6)), 'tur' => $tur, 'ad' => $ad, 'telefon' => '0' . $telefon, 'sinif' => $sinif,
            'tarih' => $tarih, 'saat' => $saat, 'olusturma' => date('c'), 'kaynak' => 'panel', 'not' => $not];
        kilitliJson(RANDEVU_DOSYASI, function (array $liste) use ($randevu) {
            $liste[] = $randevu;
            return ['__yaz' => $liste];
        });
        cevap(200, ['ok' => true, 'id' => $randevu['id']]);

    case 'POST randevu-sil':
        adminGerekli();
        $id = (string) (girdi()['id'] ?? '');
        kilitliJson(RANDEVU_DOSYASI, fn (array $liste) => ['__yaz' => array_values(array_filter($liste, fn ($r) => ($r['id'] ?? '') !== $id))]);
        cevap(200, ['ok' => true]);

    default:
        cevap(404, ['ok' => false, 'hata' => 'Bilinmeyen işlem.']);
}
