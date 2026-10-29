<?php
declare(strict_types=1);

// Statik sayfalar ve sınav olayları için sayaç (navigator.sendBeacon ile çağrılır)
require_once __DIR__ . '/_ortak.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cevap(405, ['ok' => false]);
}
// Başka sitelerden (ziyaretçilerin tarayıcısı üzerinden) sayaç şişirilemesin
if (baskaSitedenMi()) {
    http_response_code(204);
    exit;
}
$girdi = json_decode((string) file_get_contents('php://input', false, null, 0, 4096), true);
$yol = is_array($girdi) ? (string) ($girdi['yol'] ?? '') : '';
// Statik sayfalar yönlendiren adresi kendileri gönderir (beacon isteğinde sayfanın kendisi görünür)
$ref = is_array($girdi) ? mb_substr((string) ($girdi['ref'] ?? ''), 0, 500) : '';
$utm = is_array($girdi) ? mb_substr((string) ($girdi['utm'] ?? ''), 0, 80) : '';
if (in_array($yol, ['/', '/sinav-deneyimi/'], true)) {
    sayacKaydet($yol, $ref, $utm);
} elseif (isset(OLAYLAR[$yol])) {
    sayacKaydet($yol);
}
http_response_code(204);
