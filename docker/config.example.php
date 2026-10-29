<?php
// Bu dosyayı data/config.php olarak kopyalayıp doldurun.
// data/ klasörü sitenin dışında durur ve yedeklenir; kimseyle paylaşılmaz.

return [
    // Sitenin kalıcı adresi (canonical, sitemap ve yapılandırılmış veride kullanılır)
    'site_url' => 'https://alparslanceylansurucukursu.com.tr',

    // Blog yönetim paneli girişi (/yonetim/)
    'admin_kullanici' => 'admin',
    // Şifre özeti üretmek için:
    // docker compose run --rm php php -r "echo password_hash('YENI_SIFRE', PASSWORD_DEFAULT), PHP_EOL;"
    'admin_sifre_hash' => '',

    // Randevu saatleri, kapasite ve tatil günleri panelden ayarlanır (Randevular → Randevu saatleri).

    // Bir IP'den saatte en fazla kaç randevu isteği
    'saatlik_limit' => 5,

    // Cloudflare Turnstile (randevu formunda görünmez bot doğrulaması). Cloudflare → Turnstile → Add widget,
    // alan adı: alparslanceylansurucukursu.com.tr. Boş bırakılırsa doğrulama kapalıdır.
    'turnstile_site_anahtari' => '',
    'turnstile_gizli_anahtar' => '',

    // Google yorumları (Google Places API). Google Cloud Console → yeni proje → "Places API (New)" etkinleştir →
    // Kimlik bilgileri → API anahtarı oluştur → anahtarı yalnız "Places API (New)" ile sınırla. Haftada bir çekilir.
    // Yer kimliği boşsa işletme adıyla otomatik bulunur; bulunamazsa google_place_id yazın.
    'google_places_anahtari' => '',
    'google_place_id' => '',

    // Google yorumlarının hepsi SerpApi ile (serpapi.com, ücretsiz plan ayda 250 istek yeter): ./scripts/serpapi-anahtar.sh
    'serpapi_anahtari' => '',

    // Google İşletme Profili bağlantısı (tercih edilen; yorumların hepsi gelir). Google Cloud → Kimlik bilgileri →
    // OAuth istemci kimliği (Web uygulaması), yönlendirme adresi: https://SITE/api/blog.php?islem=google-donus
    // API erişimi için Google'ın onayı gerekir. Sonra panel → Yorumlar → "Google ile bağlan".
    'google_oauth_istemci' => '',
    'google_oauth_gizli' => '',

    'saat_dilimi' => 'Europe/Istanbul',
];
