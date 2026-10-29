<?php
declare(strict_types=1);

// Veri klasörü: Docker'da /srv/data, aksi halde proje kökündeki data/
define('VERI', is_dir('/srv/data') ? '/srv/data' : dirname(__DIR__, 2) . '/data');

$configDosyasi = VERI . '/config.php';
$config = is_file($configDosyasi) ? require $configDosyasi : [];
date_default_timezone_set($config['saat_dilimi'] ?? 'Europe/Istanbul');

// Sitenin kalıcı adresi (canonical, sitemap, yapılandırılmış veri)
define('SITE_URL', rtrim((string) ($config['site_url'] ?? 'https://baylikakademispor.com'), '/'));

function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Dosyayı kilitleyip içeriği callback'e verir; callback ['__yaz' => yeni, '__donus' => sonuç] döndürürse yazar. */
function kilitliJson(string $dosya, callable $fn): mixed
{
    $fh = fopen($dosya, 'c+');
    if (!$fh) {
        throw new RuntimeException('Kayıt dosyası açılamadı');
    }
    flock($fh, LOCK_EX);
    $icerik = stream_get_contents($fh);
    $veri = $icerik ? (json_decode($icerik, true) ?: []) : [];
    $sonuc = $fn($veri);
    if (is_array($sonuc) && array_key_exists('__yaz', $sonuc)) {
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($sonuc['__yaz'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        fflush($fh);
        $sonuc = $sonuc['__donus'] ?? null;
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $sonuc;
}

/**
 * Ziyaretçinin gerçek IP adresi. Cloudflare arkasında CF-Connecting-IP başlığına,
 * yalnızca istek gerçekten Cloudflare'den geliyorsa güvenilir.
 */
function istemciIp(): string
{
    $uzak = $_SERVER['REMOTE_ADDR'] ?? '';
    $cf = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '';
    if ($cf !== '' && cloudflareIpMi($uzak) && filter_var($cf, FILTER_VALIDATE_IP)) {
        return $cf;
    }
    return $uzak;
}

/**
 * Hız sınırları ve sayaç için IP anahtarı. IPv6'da /64 ağı: tek bir bağlantı o ağdaki
 * milyonlarca adresi döndürerek sınırları aşamasın.
 */
function ipAnahtari(): string
{
    $ip = istemciIp();
    $bin = @inet_pton($ip);
    return $bin !== false && strlen($bin) === 16 ? bin2hex(substr($bin, 0, 8)) . '::/64' : $ip;
}

/** İstek başka bir siteden mi geldi? (Origin başlığı varsa kendi adresimiz olmalı; tarayıcıyla yapılan sahte gönderimlere karşı) */
function baskaSitedenMi(): bool
{
    $kaynak = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($kaynak === '') {
        return false;
    }
    $host = (string) parse_url($kaynak, PHP_URL_HOST);
    $port = parse_url($kaynak, PHP_URL_PORT);
    return $host === '' || strtolower($host . ($port ? ":$port" : '')) !== strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
}

/** Çerezler Secure olsun mu: HTTPS bağlantı ya da (Cloudflare arkasında) yerel olmayan her adres */
function guvenliBaglanti(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    $host = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    return !in_array($host, ['localhost', '127.0.0.1', '[::1]'], true);
}

function cloudflareIpMi(string $ip): bool
{
    // https://www.cloudflare.com/ips/ (değişirse güncelleyin)
    static $araliklar = [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32',
    ];
    $bin = @inet_pton($ip);
    if ($bin === false) {
        return false;
    }
    foreach ($araliklar as $aralik) {
        [$ag, $bit] = explode('/', $aralik);
        $agBin = inet_pton($ag);
        if (strlen($agBin) !== strlen($bin)) {
            continue;
        }
        $tam = intdiv((int) $bit, 8);
        $kalan = (int) $bit % 8;
        if (strncmp($bin, $agBin, $tam) !== 0) {
            continue;
        }
        if ($kalan === 0) {
            return true;
        }
        $maske = (0xFF << (8 - $kalan)) & 0xFF;
        if ((ord($bin[$tam]) & $maske) === (ord($agBin[$tam]) & $maske)) {
            return true;
        }
    }
    return false;
}
