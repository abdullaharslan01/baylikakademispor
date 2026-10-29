<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_inc/temel.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function cevap(int $kod, array $veri): never
{
    http_response_code($kod);
    echo json_encode($veri, JSON_UNESCAPED_UNICODE);
    exit;
}

define('RANDEVU_DOSYASI', VERI . '/randevular.json');

require_once dirname(__DIR__) . '/_inc/randevu-saatleri.php';

/** Geçerli, randevu verilebilir bir gün mü? (geçmiş, çok ileri ya da tatil değil) */
function gecerliTarih(string $tarih): ?DateTimeImmutable
{
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $tarih);
    if (!$d || $d->format('Y-m-d') !== $tarih || in_array($tarih, randevuAyarlari()['kapali'], true)) {
        return null;
    }
    $bugun = new DateTimeImmutable('today');
    $son = $bugun->modify('+' . (int) randevuAyarlari()['ileriGun'] . ' days');
    return ($d < $bugun || $d > $son) ? null : $d;
}

function gununSaatleri(DateTimeImmutable $gun): array
{
    return randevuAyarlari()['saatler'][(int) $gun->format('w')] ?? [];
}

function doluSaatler(array $randevular, string $tarih, int $kapasite): array
{
    $sayac = [];
    foreach ($randevular as $r) {
        if (($r['tarih'] ?? '') === $tarih) {
            $sayac[$r['saat']] = ($sayac[$r['saat']] ?? 0) + 1;
        }
    }
    return array_keys(array_filter($sayac, fn ($n) => $n >= $kapasite));
}
