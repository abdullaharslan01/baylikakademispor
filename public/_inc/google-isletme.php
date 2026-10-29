<?php
declare(strict_types=1);

/*
 * Google İşletme Profili (Business Profile) bağlantısı: işletme sahibi hesabıyla bir kez "Google ile bağlan"
 * denir, yenileme anahtarı saklanır ve yorumların HEPSİ sayfa sayfa çekilir (Places API gibi 5 ile sınırlı değil).
 * İstemci kimliği ve gizli anahtar: data/config.php → google_oauth_istemci, google_oauth_gizli
 * (Google Cloud → API'ler ve Hizmetler → Kimlik bilgileri → OAuth istemci kimliği, "Web uygulaması").
 * API erişimi Google'ın onayına bağlıdır; onay gelene kadar istekler kota hatası döner.
 */

require_once __DIR__ . '/sayac.php';

const GBP_KAPSAM = 'https://www.googleapis.com/auth/business.manage';
const GBP_YILDIZ = ['ONE' => 1, 'TWO' => 2, 'THREE' => 3, 'FOUR' => 4, 'FIVE' => 5];

function gbpAyarliMi(): bool
{
    global $config;
    return !empty($config['google_oauth_istemci']) && !empty($config['google_oauth_gizli']);
}

/** Bağlantı kuruldu mu: ['konum' => 'accounts/../locations/..', 'ad' => 'İşletme adı', 'hesap' => e-posta] ya da null */
function gbpBaglanti(): ?array
{
    $b = ayarGetir('google_bp');
    return is_array($b) && !empty($b['yenileme']) ? $b : null;
}

function gbpDonusAdresi(): string
{
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $yerel = preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/', $host);
    return ($yerel ? 'http://' : 'https://') . $host . '/api/blog.php?islem=google-donus';
}

/** Google onay sayfasının adresi; durum anahtarı 10 dakika geçerli ve tek kullanımlık */
function gbpOnayAdresi(): string
{
    global $config;
    $durum = bin2hex(random_bytes(24));
    ayarKaydet('google_bp_durum', ['d' => hash('sha256', $durum), 't' => time()]);
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
        'client_id' => $config['google_oauth_istemci'],
        'redirect_uri' => gbpDonusAdresi(),
        'response_type' => 'code',
        'scope' => GBP_KAPSAM . ' openid email',
        'access_type' => 'offline',
        'prompt' => 'consent',
        'state' => $durum,
    ]);
}

function gbpIstek(string $yontem, string $url, ?array $govde = null, ?string $erisim = null, bool $form = false): array
{
    global $config;
    // Yalnız yerel testte: istekler sahte bir sunucuya yönlendirilebilir
    if (!empty($config['google_bp_taban'])) {
        $url = rtrim((string) $config['google_bp_taban'], '/') . '/' . substr($url, 8);
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $yontem,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => array_values(array_filter([
            $erisim ? 'Authorization: Bearer ' . $erisim : null,
            $govde !== null && !$form ? 'Content-Type: application/json' : null,
        ])),
        CURLOPT_POSTFIELDS => $govde === null ? null : ($form ? http_build_query($govde) : json_encode($govde)),
    ]);
    $yanit = curl_exec($ch);
    $kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $veri = is_string($yanit) ? json_decode($yanit, true) : null;
    if ($kod !== 200 || !is_array($veri)) {
        $hata = is_array($veri) ? ($veri['error']['message'] ?? $veri['error_description'] ?? $veri['error'] ?? "HTTP $kod") : 'Google’a bağlanılamadı';
        if ($kod === 429 || str_contains((string) $hata, 'Quota')) {
            $hata = 'Google API erişimi henüz onaylanmadı (kota 0). Onay gelince kendiliğinden çalışır.';
        }
        throw new RuntimeException(is_string($hata) ? $hata : "HTTP $kod");
    }
    return $veri;
}

/** Google'dan dönüşte: kodu anahtara çevirir, işletmeyi bulur, kaydeder */
function gbpDonus(string $kod, string $durum): void
{
    global $config;
    $kayit = ayarGetir('google_bp_durum');
    ayarKaydet('google_bp_durum', null);
    if (!is_array($kayit) || time() - (int) $kayit['t'] > 600 || !hash_equals((string) $kayit['d'], hash('sha256', $durum))) {
        throw new RuntimeException('Bağlantı isteğinin süresi doldu; panelden yeniden “Google ile bağlan” deyin.');
    }
    $t = gbpIstek('POST', 'https://oauth2.googleapis.com/token', [
        'code' => $kod,
        'client_id' => $config['google_oauth_istemci'],
        'client_secret' => $config['google_oauth_gizli'],
        'redirect_uri' => gbpDonusAdresi(),
        'grant_type' => 'authorization_code',
    ], null, true);
    if (empty($t['refresh_token'])) {
        throw new RuntimeException('Google yenileme anahtarı vermedi; myaccount.google.com → Güvenlik → Üçüncü taraf erişimi bölümünden bağlantıyı kaldırıp yeniden deneyin.');
    }
    $hesap = '';
    if (!empty($t['id_token'])) {
        $parca = explode('.', (string) $t['id_token'])[1] ?? '';
        $hesap = (string) (json_decode((string) base64_decode(strtr($parca, '-_', '+/')), true)['email'] ?? '');
    }
    $baglanti = ['yenileme' => $t['refresh_token'], 'hesap' => $hesap, 'konum' => '', 'ad' => '', 't' => date('c')];
    ayarKaydet('google_bp', $baglanti);
    ayarKaydet('google_bp_erisim', ['a' => $t['access_token'], 'bitis' => time() + (int) ($t['expires_in'] ?? 3600) - 60]);
    gbpKonumBul();
}

function gbpErisim(): string
{
    global $config;
    $e = ayarGetir('google_bp_erisim');
    if (is_array($e) && ($e['bitis'] ?? 0) > time()) {
        return (string) $e['a'];
    }
    $b = gbpBaglanti() ?? throw new RuntimeException('Google bağlantısı yok.');
    try {
        $t = gbpIstek('POST', 'https://oauth2.googleapis.com/token', [
            'refresh_token' => $b['yenileme'],
            'client_id' => $config['google_oauth_istemci'],
            'client_secret' => $config['google_oauth_gizli'],
            'grant_type' => 'refresh_token',
        ], null, true);
    } catch (RuntimeException $ex) {
        if (str_contains($ex->getMessage(), 'invalid_grant')) {
            throw new RuntimeException('Google bağlantısının izni geri alınmış ya da süresi dolmuş; panelden yeniden bağlanın.');
        }
        throw $ex;
    }
    ayarKaydet('google_bp_erisim', ['a' => $t['access_token'], 'bitis' => time() + (int) ($t['expires_in'] ?? 3600) - 60]);
    return (string) $t['access_token'];
}

/** Hesaptaki işletmeyi bulur (birden çok varsa adı "Alparslan Ceylan" içereni) */
function gbpKonumBul(): array
{
    $b = gbpBaglanti() ?? throw new RuntimeException('Google bağlantısı yok.');
    if ($b['konum'] !== '') {
        return $b;
    }
    $erisim = gbpErisim();
    $hesaplar = gbpIstek('GET', 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts', null, $erisim)['accounts'] ?? [];
    $adaylar = [];
    foreach ($hesaplar as $h) {
        $yer = gbpIstek('GET', 'https://mybusinessbusinessinformation.googleapis.com/v1/' . $h['name'] . '/locations?readMask=name,title&pageSize=100', null, $erisim);
        foreach ($yer['locations'] ?? [] as $l) {
            $adaylar[] = ['konum' => $h['name'] . '/' . $l['name'], 'ad' => (string) ($l['title'] ?? '')];
        }
    }
    if (!$adaylar) {
        throw new RuntimeException('Bu Google hesabında yönetilen işletme bulunamadı. İşletmenin sahibi olan hesapla bağlanın.');
    }
    $secilen = array_values(array_filter($adaylar, fn ($a) => stripos($a['ad'], 'Alparslan Ceylan') !== false))[0] ?? $adaylar[0];
    $b = array_merge($b, $secilen);
    ayarKaydet('google_bp', $b);
    return $b;
}

/** Google'ın çeviri eklediği yorumlarda yalnız özgün metin alınır */
function gbpMetin(string $m): string
{
    if (preg_match('/\(Original\)\s*(.+)$/s', $m, $e)) {
        return trim($e[1]);
    }
    return trim(preg_replace('/\s*\(Translated by Google\).*$/s', '', $m));
}

/** Tüm yorumları çeker ve kaydeder (yorumlariKaydet: yeniler en üste, seçimler korunur) */
function gbpYorumlariCek(): array
{
    $b = gbpKonumBul();
    $erisim = gbpErisim();
    $gelen = [];
    $ozet = null;
    $sayfa = '';
    do {
        $d = gbpIstek('GET', 'https://mybusiness.googleapis.com/v4/' . $b['konum'] . '/reviews?' . http_build_query(array_filter([
            'pageSize' => 50, 'orderBy' => 'updateTime desc', 'pageToken' => $sayfa,
        ])), null, $erisim);
        $ozet ??= ['ortalama' => round((float) ($d['averageRating'] ?? 0), 1), 'toplam' => (int) ($d['totalReviewCount'] ?? 0)];
        array_push($gelen, ...($d['reviews'] ?? []));
        $sayfa = (string) ($d['nextPageToken'] ?? '');
    } while ($sayfa !== '' && count($gelen) < 5000);

    $liste = [];
    foreach ($gelen as $y) {
        if (empty($y['reviewId'])) {
            continue;
        }
        $liste[] = [
            'id' => 'gbp-' . $y['reviewId'],
            'yazar' => !empty($y['reviewer']['isAnonymous']) ? 'Google kullanıcısı' : (string) ($y['reviewer']['displayName'] ?? 'Google kullanıcısı'),
            'yazar_foto' => str_starts_with((string) ($y['reviewer']['profilePhotoUrl'] ?? ''), 'https://') ? (string) $y['reviewer']['profilePhotoUrl'] : '',
            'puan' => GBP_YILDIZ[$y['starRating'] ?? ''] ?? 0,
            'metin' => gbpMetin((string) ($y['comment'] ?? '')),
            'tarih' => (string) ($y['createTime'] ?? date('c')),
        ];
    }
    // Liste tam geldiği için Google'da silinen yorumlar burada da silinir
    $yeni = yorumlariKaydet($liste, 'gbp', true);
    $simdi = date('c');
    if ($ozet['toplam'] > 0) {
        ayarKaydet('google_ozet', $ozet + ['guncelleme' => $simdi]);
    }
    return ['ok' => true, 'yeni' => $yeni, 'gelen' => count($gelen)];
}
