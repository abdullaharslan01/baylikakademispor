<?php
declare(strict_types=1);

/*
 * IndexNow: yazı yayımlanınca / güncellenince / silinince Bing ve Yandex'e anında haber verir
 * (ChatGPT arama ve Copilot Bing dizinini kullanır). Google bu protokolü kullanmaz; sitemap.xml'i okur.
 * Anahtar data/indexnow-anahtari.txt içinde bir kez üretilir, /indexnow.txt adresinden doğrulanır.
 */

require_once __DIR__ . '/temel.php';

function indexnowAnahtari(): string
{
    $dosya = VERI . '/indexnow-anahtari.txt';
    if (!is_file($dosya)) {
        file_put_contents($dosya, bin2hex(random_bytes(16)), LOCK_EX);
    }
    return trim((string) file_get_contents($dosya));
}

/** Adresleri bildirir; yerelde (site_url sunucu değilken) ya da hata olursa sessizce geçer */
function indexnowBildir(array $yollar): void
{
    $host = (string) parse_url(SITE_URL, PHP_URL_HOST);
    if ($host === '' || !str_contains((string) ($_SERVER['HTTP_HOST'] ?? $host), $host)) {
        return;
    }
    $ch = curl_init('https://api.indexnow.org/indexnow');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 4,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8'],
        CURLOPT_POSTFIELDS => json_encode([
            'host' => $host,
            'key' => indexnowAnahtari(),
            'keyLocation' => SITE_URL . '/indexnow.txt',
            'urlList' => array_values(array_unique(array_map(fn ($y) => SITE_URL . $y, $yollar))),
        ], JSON_UNESCAPED_SLASHES),
    ]);
    curl_exec($ch);
    $kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($kod >= 400) {
        error_log("IndexNow yanıtı: HTTP $kod");
    }
}

// /indexnow.txt doğrudan istenirse anahtarı döndür
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    header('Content-Type: text/plain; charset=utf-8');
    echo indexnowAnahtari();
}
