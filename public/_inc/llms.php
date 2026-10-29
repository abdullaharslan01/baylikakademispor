<?php
declare(strict_types=1);

// llms.txt: yapay zekâ asistanlarına sitenin özeti (https://llmstxt.org)
require_once __DIR__ . '/blog.php';

require_once __DIR__ . '/iletisim.php';
require_once __DIR__ . '/sayac.php';
require_once __DIR__ . '/metinler.php';
yzBotKaydet('/llms.txt');
ob_start(fn (string $b) => strtr($b, iletisimDegisimleri()));
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: public, max-age=3600');

$u = SITE_URL;
echo <<<MD
# Alparslan Ceylan Sürücü Kursu

> Adana Seyhan'da (Yeşilyurt Mahallesi, Mavi Bulvar yakını) A, A1, A2, B, B Otomatik ve C sınıfı ehliyet eğitimi veren 40 yıllık sürücü kursu. Kursun "Sanal Sürüş Alanı"nda yapay zekâ destekli, VR gözlüklü bir sürüş simülatörü bulunur; B sınıfı manuel ehliyet almak isteyen ve hiç araç kullanmamış adaylar için geliştirilmiştir ve araç içindeki ekipmanlar ile düz sürüş, duruş, kalkış, şerit değiştirme gibi temel hareketleri sıfırdan öğretir. Sınav manevraları ve trafikte sürüş eğitmenle gerçek eğitim aracında çalışılır.

## Temel bilgiler

- Ad: Alparslan Ceylan Sürücü Kursu (eski adı: Adana Ceylan Sürücü Kursu), 40 yıllık kurum
- Adres: Yeşilyurt Mah. 70081 Sok. No:2, Doğanlar Apartmanı, Seyhan / Adana 01150
- Telefon: 0545 359 51 55
- E-posta: adanaceylansurucukursu@gmail.com
- Instagram: https://www.instagram.com/alparslanceylansurucukursu/
- Ehliyet sınıfları: A, A1, A2, B, B (otomatik), C
- Öne çıkan hizmet: yapay zekâ destekli VR simülatör eğitimi (Sanal Sürüş Alanı) — B manuel ve ilk kez araç kullanacak adaylar için temel sürüş
- E-sınav hazırlığı: kayıtlı adaylar KURSUM-APP uygulamasında (https://kursum.app/) "Kursiyer girişi" bölümüne T.C. kimlik numarasıyla girerek çalışır; uygulama yalnız kursun kayıtlı adaylarına açıktır
- Online randevu: ücretsiz sanal sürüş denemesi (yalnız B manuel vites adayları için) ya da kayıt / bilgi görüşmesi, sitedeki formdan gün ve saat seçilerek alınır
- Simülatör tanıtım videosu: https://www.youtube.com/watch?v=IOAdaQIfns0
- Kayıt belgeleri (MEB MTSK Yönetmeliği md. 11): son altı ayda çekilmiş 2 biyometrik fotoğraf, T.C. kimlik kartı, sürücü olur raporu, öğrenim belgesi, barkotlu adli sicil belgesi; varsa mevcut sürücü belgesi fotokopisi, 18 yaş altına veli muvafakatnamesi; kursumuz ayrıca ikametgâh (yerleşim yeri belgesi, e-Devlet) ister
- Direksiyon sınavı (B): MEB EK-4 formu (Ocak 2025'ten beri); araç bilgisi, dar alanda en fazla üç hamlede geri dönüş, koniler arasına geri park, 25 metre geri, geri giderken sağa (L) dönüş, en az %7 eğimde kalkış, 30 km/s'te ani fren; en az 40 dakika
- Ücretler: ehliyet sınıfına ve döneme göre değişir; güncel bilgi için kursu arayın.

## Sayfalar

- [Ana sayfa]({$u}/): kurs, sanal sürüş alanı, ehliyet sınıfları, belgeler, online randevu, iletişim
- [Direksiyon sınavı simülasyonu]({$u}/sinav-deneyimi/): tarayıcıda ücretsiz oynanan, kayıt gerektirmeyen temsilî sınav (araç bilgisi, eğimli yolda kalkış, ani fren, 25 metre geri, L dönüş, koniler arasına geri park, trafik); MEB EK-4 renk kurallarıyla değerlendirilir
- [Blog]({$u}/blog/): ehliyet ve direksiyon sınavı rehberleri

MD;
// Ana sayfadaki sık sorulan sorular (panelden değişir; sayfadaki FAQPage şemasıyla birebir aynı)
echo "\n## Sık sorulan sorular\n\n";
foreach (sssListesi() as $q) {
    echo '- **', $q['soru'], '** ', preg_replace('/\s+/u', ' ', $q['cevap']), "\n";
}
echo "\n## Blog yazıları\n\n";
foreach (yayindakiYazilar(1000) as $y) {
    echo '- [', $y['baslik'], '](', $u, '/blog/', $y['slug'], '): ', preg_replace('/\s+/u', ' ', $y['ozet']), "\n";
}
