<?php
declare(strict_types=1);
require_once __DIR__ . '/_ortak.php';

$tarih = (string) ($_GET['tarih'] ?? '');
if (!gecerliTarih($tarih)) {
    cevap(200, ['dolu' => []]);
}

$randevular = is_file(RANDEVU_DOSYASI) ? (json_decode((string) file_get_contents(RANDEVU_DOSYASI), true) ?: []) : [];
cevap(200, ['dolu' => doluSaatler($randevular, $tarih, (int) randevuAyarlari()['kapasite'])]);
