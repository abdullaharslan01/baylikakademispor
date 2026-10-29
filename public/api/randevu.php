<?php
declare(strict_types=1);
require_once __DIR__ . '/_ortak.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cevap(405, ['ok' => false, 'hata' => 'Geçersiz istek.']);
}

// Başka bir sitenin ziyaretçilerinin tarayıcısı üzerinden toplu gönderim yapılamasın
if (baskaSitedenMi()) {
    cevap(403, ['ok' => false, 'hata' => 'Geçersiz istek.']);
}

$girdi = json_decode((string) file_get_contents('php://input', false, null, 0, 16384), true);
if (!is_array($girdi)) {
    $girdi = $_POST;
}

// Botlar için gizli alan doluysa sessizce kabul et
if (!empty($girdi['website'])) {
    cevap(200, ['ok' => true]);
}

$turler = ['vr' => 'Ücretsiz VR deneme', 'bilgi' => 'Kayıt / bilgi görüşmesi'];
$siniflar = ['B', 'B Otomatik', 'A1', 'A2', 'A', 'C', 'Karar vermedim'];

$tur = (string) ($girdi['tur'] ?? '');
// Görünmez / denetim karakterleri atılır, boşluklar teke indirilir
$ad = trim((string) preg_replace('/\s+/u', ' ', (string) preg_replace('/[^\P{C}\s]+/u', '', (string) ($girdi['ad'] ?? ''))));
$telefon = preg_replace('/\D/', '', (string) ($girdi['telefon'] ?? ''));
$sinif = (string) ($girdi['sinif'] ?? '');
$tarih = (string) ($girdi['tarih'] ?? '');
$saat = (string) ($girdi['saat'] ?? '');
$kvkk = !empty($girdi['kvkk']);

if (str_starts_with($telefon, '90')) {
    $telefon = substr($telefon, 2);
}
$telefon = ltrim($telefon, '0');

if (!isset($turler[$tur])) {
    cevap(422, ['ok' => false, 'hata' => 'Randevu türü geçersiz.']);
}
if (mb_strlen($ad) < 2 || mb_strlen($ad) > 80) {
    cevap(422, ['ok' => false, 'hata' => 'Lütfen adını yaz.']);
}
if (!preg_match('/^5\d{9}$/', $telefon)) {
    cevap(422, ['ok' => false, 'hata' => 'Lütfen geçerli bir cep telefonu yaz.']);
}
if (!in_array($sinif, $siniflar, true)) {
    $sinif = 'Karar vermedim';
}
// Sanal sürüş denemesi yalnız B (manuel vites) içindir
if ($tur === 'vr') {
    $sinif = 'B';
}
$gun = gecerliTarih($tarih);
if (!$gun) {
    cevap(422, ['ok' => false, 'hata' => 'Lütfen geçerli bir gün seç.']);
}
if (!in_array($saat, gununSaatleri($gun), true)) {
    cevap(422, ['ok' => false, 'hata' => 'Seçilen saat uygun değil.']);
}
if (new DateTimeImmutable("$tarih $saat") <= new DateTimeImmutable()) {
    cevap(422, ['ok' => false, 'hata' => 'Geçmiş bir saat seçilemez.']);
}
if (!$kvkk) {
    cevap(422, ['ok' => false, 'hata' => 'KVKK onayı gerekli.']);
}

// Cloudflare Turnstile anahtarı tanımlıysa bot doğrulaması zorunlu
$ip = istemciIp();
if (!empty($config['turnstile_gizli_anahtar'])) {
    $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'secret' => $config['turnstile_gizli_anahtar'],
            'response' => mb_substr((string) ($girdi['turnstile'] ?? ''), 0, 2048),
            'remoteip' => $ip,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
    ]);
    $dogrulama = json_decode((string) curl_exec($ch), true);
    curl_close($ch);
    if (empty($dogrulama['success'])) {
        error_log('Turnstile doğrulanamadı: ' . json_encode($dogrulama['error-codes'] ?? 'bağlantı hatası'));
        cevap(403, ['ok' => false, 'hata' => 'Güvenlik doğrulaması başarısız oldu. Sayfayı yenileyip tekrar dene ya da bizi ara.']);
    }
}

// Sınırlar: IP (IPv6'da /64) başına saatte 5, günde 10 gönderim; tüm site için saatte 100
$ipAnahtar = hash_hmac('sha256', ipAnahtari(), sayacTuzu());
$limitAsildi = kilitliJson(VERI . '/limit.json', function (array $kayit) use ($ipAnahtar, $config) {
    $simdi = time();
    $kayit = array_values(array_filter($kayit, fn ($v) => ($v['t'] ?? 0) > $simdi - 86400));
    $benim = array_filter($kayit, fn ($v) => ($v['k'] ?? '') === $ipAnahtar);
    $sonSaat = fn (array $l) => count(array_filter($l, fn ($v) => $v['t'] > $simdi - 3600));
    if ($sonSaat($benim) >= (int) ($config['saatlik_limit'] ?? 5) || count($benim) >= (int) ($config['gunluk_limit'] ?? 10)
        || $sonSaat($kayit) >= (int) ($config['genel_saatlik_limit'] ?? 100)) {
        return ['__yaz' => $kayit, '__donus' => true];
    }
    $kayit[] = ['k' => $ipAnahtar, 't' => $simdi];
    return ['__yaz' => $kayit, '__donus' => false];
});
if ($limitAsildi) {
    cevap(429, ['ok' => false, 'hata' => 'Çok fazla deneme yapıldı. Lütfen bizi telefonla ara.']);
}

// Kaydet (aynı saat doluysa reddet)
$kapasite = (int) randevuAyarlari()['kapasite'];
$randevu = [
    'id' => bin2hex(random_bytes(6)),
    'tur' => $tur,
    'ad' => $ad,
    'telefon' => '0' . $telefon,
    'sinif' => $sinif,
    'tarih' => $tarih,
    'saat' => $saat,
    'olusturma' => date('c'),
];
$kaydedildi = kilitliJson(RANDEVU_DOSYASI, function (array $liste) use ($randevu, $kapasite) {
    if (in_array($randevu['saat'], doluSaatler($liste, $randevu['tarih'], $kapasite), true)) {
        return 'dolu';
    }
    // Aynı numarayla en fazla 2 yaklaşan online randevu (sahte numara dışında boş saatleri tek kişi dolduramasın)
    $bugun = date('Y-m-d');
    $ayniNumara = array_filter($liste, fn ($r) => ($r['telefon'] ?? '') === $randevu['telefon'] && ($r['tarih'] ?? '') >= $bugun && ($r['kaynak'] ?? '') !== 'panel');
    if (count($ayniNumara) >= 2) {
        return 'numara';
    }
    // Geçmiş randevuları 60 gün sonra temizle
    $sinir = (new DateTimeImmutable('-60 days'))->format('Y-m-d');
    $liste = array_values(array_filter($liste, fn ($r) => ($r['tarih'] ?? '') >= $sinir));
    $liste[] = $randevu;
    return ['__yaz' => $liste, '__donus' => 'tamam'];
});
if ($kaydedildi === 'numara') {
    cevap(409, ['ok' => false, 'hata' => 'Bu numarayla zaten yaklaşan randevun var. Değiştirmek için bizi ara.']);
}
if ($kaydedildi !== 'tamam') {
    cevap(409, ['ok' => false, 'hata' => 'Bu saat az önce doldu, başka bir saat seç.']);
}

// Randevu panelde görünür; panel istatistiği için de sayılır
sayacKaydet('olay:randevu-gonderildi');

cevap(200, ['ok' => true, 'id' => $randevu['id']]);
