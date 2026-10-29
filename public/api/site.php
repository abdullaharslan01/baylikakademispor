<?php
declare(strict_types=1);

// Ana sayfadaki, yönetim panelinden değiştirilebilen içerik (duyuru bandı) ve Google yorumları
require_once __DIR__ . '/_ortak.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';
require_once dirname(__DIR__) . '/_inc/yorumlar.php';
require_once dirname(__DIR__) . '/_inc/randevu-saatleri.php';

header('Cache-Control: public, max-age=60');
cevap(200, [
    'ok' => true,
    'duyuru' => ayarGetir('duyuru', ['aktif' => false, 'metin' => '', 'link' => '']),
    'google' => ayarGetir('google_ozet'),
    'yorumlar' => vitrinYorumlari(),
    'turnstile' => $config['turnstile_site_anahtari'] ?? '',
    'randevu' => randevuIstemciAyarlari(),
]);
