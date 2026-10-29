<?php
declare(strict_types=1);

// Randevu saatleri: panelden (Randevular → Randevu saatleri) değiştirilir; yoksa data/config.php varsayılanları.

require_once __DIR__ . '/sayac.php';

const RANDEVU_VARSAYILAN = [
    // 0 = Pazar ... 6 = Cumartesi
    'gunler' => [
        0 => ['acik' => false, 'bas' => '09:00', 'bit' => '17:00'],
        1 => ['acik' => true, 'bas' => '09:00', 'bit' => '17:00'],
        2 => ['acik' => true, 'bas' => '09:00', 'bit' => '17:00'],
        3 => ['acik' => true, 'bas' => '09:00', 'bit' => '17:00'],
        4 => ['acik' => true, 'bas' => '09:00', 'bit' => '17:00'],
        5 => ['acik' => true, 'bas' => '09:00', 'bit' => '17:00'],
        6 => ['acik' => true, 'bas' => '09:00', 'bit' => '14:00'],
    ],
    'aralik' => 60,
    'kapasite' => 1,
    'ileriGun' => 30,
    'kapali' => [],
];

/** Kayıtlı ayarlar (panelden), eksikler varsayılanla */
function randevuAyarlari(): array
{
    static $a = null;
    if ($a) {
        return $a;
    }
    try {
        $kayit = (array) ayarGetir('randevu_saatleri', []);
    } catch (Throwable) {
        $kayit = [];
    }
    $a = array_merge(RANDEVU_VARSAYILAN, $kayit);
    $a['saatler'] = [];
    foreach ($a['gunler'] as $gun => $g) {
        $a['saatler'][(int) $gun] = $g['acik'] ? saatDizisi($g['bas'], $g['bit'], (int) $a['aralik']) : [];
    }
    return $a;
}

/** "09:00"–"17:00", 60 dk → 09:00, 10:00 … 17:00 (bitiş son randevu saatidir) */
function saatDizisi(string $bas, string $bit, int $aralik): array
{
    $dk = fn (string $s) => (int) substr($s, 0, 2) * 60 + (int) substr($s, 3, 2);
    $sonuc = [];
    for ($t = $dk($bas); $t <= $dk($bit) && count($sonuc) < 48; $t += max(15, $aralik)) {
        $sonuc[] = sprintf('%02d:%02d', intdiv($t, 60), $t % 60);
    }
    return $sonuc;
}

/** Ziyaretçi tarafına gönderilen kısım (site.js) */
function randevuIstemciAyarlari(): array
{
    $a = randevuAyarlari();
    return ['saatler' => $a['saatler'], 'ileriGun' => (int) $a['ileriGun'], 'kapali' => array_values($a['kapali'])];
}
