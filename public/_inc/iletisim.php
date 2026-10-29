<?php
declare(strict_types=1);

// Panelden değiştirilebilen iletişim bilgileri (Site içeriği → İletişim).
// Sayfalardaki varsayılan değerler çıktı aşamasında güncel değerlerle değiştirilir.

require_once __DIR__ . '/sayac.php';

const ILETISIM_VARSAYILAN = [
    'telefon' => '5428980601',
    'whatsapp' => '5428980601',
    'eposta' => 'baylikgokhun7@gmail.com',
    'instagram' => 'baylikakademisporkulubu',
];

/** "0545 359 51 55", "+90 545..." gibi yazımları 10 haneye çevirir; geçersizse null */
function telefonTemizle(string $t): ?string
{
    $t = preg_replace('/\D/', '', $t);
    if (str_starts_with($t, '90') && strlen($t) === 12) {
        $t = substr($t, 2);
    }
    $t = ltrim($t, '0');
    return preg_match('/^[2-5]\d{9}$/', $t) ? $t : null;
}

function iletisim(): array
{
    static $c = null;
    if ($c) {
        return $c;
    }
    try {
        $kayit = (array) ayarGetir('iletisim', []);
    } catch (Throwable) {
        $kayit = [];
    }
    $v = array_merge(ILETISIM_VARSAYILAN, array_filter($kayit));
    $yazi = fn (string $t) => '0' . substr($t, 0, 3) . ' ' . substr($t, 3, 3) . ' ' . substr($t, 6, 2) . ' ' . substr($t, 8, 2);
    return $c = $v + [
        'telefonYazi' => $yazi($v['telefon']),
        'telefonHref' => '+90' . $v['telefon'],
        'telefonSema' => '+90 ' . substr($v['telefon'], 0, 3) . ' ' . substr($v['telefon'], 3, 3) . ' ' . substr($v['telefon'], 6, 2) . ' ' . substr($v['telefon'], 8, 2),
        'whatsappNo' => '90' . $v['whatsapp'],
    ];
}

/** Sayfalardaki varsayılan yazımlar → güncel değerler (değişiklik yoksa boş dizi) */
function iletisimDegisimleri(): array
{
    $i = iletisim();
    $d = ILETISIM_VARSAYILAN;
    $harita = [
        '0' . substr($d['telefon'], 0, 3) . ' ' . substr($d['telefon'], 3, 3) . ' ' . substr($d['telefon'], 6, 2) . ' ' . substr($d['telefon'], 8, 2) => $i['telefonYazi'],
        '+90 ' . substr($d['telefon'], 0, 3) . ' ' . substr($d['telefon'], 3, 3) . ' ' . substr($d['telefon'], 6, 2) . ' ' . substr($d['telefon'], 8, 2) => $i['telefonSema'],
        'tel:+90' . $d['telefon'] => 'tel:' . $i['telefonHref'],
        'wa.me/90' . $d['whatsapp'] => 'wa.me/' . $i['whatsappNo'],
        $d['eposta'] => $i['eposta'],
        'instagram.com/' . $d['instagram'] => 'instagram.com/' . $i['instagram'],
        '@' . $d['instagram'] => '@' . $i['instagram'],
    ];
    return array_filter($harita, fn ($yeni, $eski) => $yeni !== $eski, ARRAY_FILTER_USE_BOTH);
}
