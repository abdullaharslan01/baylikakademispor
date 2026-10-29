<?php
declare(strict_types=1);

/*
 * Google yorumları haftada bir (ve panelden "Şimdi yenile" ile) çekilip burada saklanır. İki yol var:
 * 1) Google İşletme Profili bağlantısı (google-isletme.php, kaynak = 'gbp'): işletme sahibinin hesabıyla
 *    bağlanılır, yorumların HEPSİ gelir ve kalıcı saklanır. Tercih edilen yol.
 * 2) SerpApi (kaynak = 'serp'): data/config.php → serpapi_anahtari. Haritalar'daki yorumların hepsi gelir,
 *    kalıcı saklanır; sonraki yenilemelerde yalnız yeniler alınır. İşletme Profili onayı yokken kullanılan yol.
 * 3) Places API (kaynak = 'google'): data/config.php → google_places_anahtari. En fazla 5 yorum döner;
 *    Google Maps Platform kuralları gereği 30 gündür gelmeyen yorumlar silinir.
 * Sitede: panelde "göster" seçilenler + "otomatik" olup 5 yıldızlı ve metni en az 20 karakter olanlar.
 * Panelden elle de yorum eklenebilir (kaynak = 'elle'); bunlar silinene kadar kalır.
 */

require_once __DIR__ . '/sayac.php';
require_once __DIR__ . '/google-isletme.php';

const YORUM_SAKLAMA_GUN = 30;
const YORUM_YENILEME_GUN = 7;

function yorumTablosu(): void
{
    static $hazir = false;
    if ($hazir) {
        return;
    }
    db()->exec('CREATE TABLE IF NOT EXISTS google_yorumlar (
        id TEXT PRIMARY KEY,
        yazar TEXT NOT NULL,
        puan INTEGER NOT NULL,
        metin TEXT NOT NULL DEFAULT \'\',
        tarih TEXT NOT NULL,
        cekilme TEXT NOT NULL
    )');
    $sutunlar = array_column(db()->query('PRAGMA table_info(google_yorumlar)')->fetchAll(), 'name');
    foreach (['yazar_url' => "TEXT NOT NULL DEFAULT ''", 'yazar_foto' => "TEXT NOT NULL DEFAULT ''", 'durum' => "TEXT NOT NULL DEFAULT 'oto'", 'sira' => 'INTEGER',
        'kaynak' => "TEXT NOT NULL DEFAULT 'google'"] as $ad => $tip) {
        if (!in_array($ad, $sutunlar, true)) {
            db()->exec("ALTER TABLE google_yorumlar ADD COLUMN $ad $tip");
        }
    }
    $hazir = true;
}

/** Yorumları otomatik çekecek bir bağlantı var mı (İşletme Profili, SerpApi ya da Places) */
function yorumKaynagiVar(): bool
{
    global $config;
    return gbpBaglanti() || !empty($config['serpapi_anahtari']) || !empty($config['google_places_anahtari']);
}

/** Sitede gösterilenlerin koşulu (panelde de aynı kural kullanılır). Metni olmayan yorum hiç gösterilmez. */
const YORUM_GORUNUR = "(length(trim(metin)) > 0 AND (durum = 'goster' OR (durum = 'oto' AND puan = 5 AND length(trim(metin)) >= 20)))";

function vitrinYorumlari(int $adet = 24): array
{
    yorumTablosu();
    $st = db()->prepare('SELECT yazar, yazar_url, yazar_foto, puan, metin, tarih FROM google_yorumlar WHERE ' . YORUM_GORUNUR . '
        ORDER BY sira IS NULL, sira, tarih DESC LIMIT ?');
    $st->execute([$adet]);
    // Bağlantı ve fotoğraf dış kaynaktan gelir: yalnız https (javascript: gibi adresler sayfaya girmez)
    $guvenli = fn (string $u, bool $yerel = false) => str_starts_with($u, 'https://') || ($yerel && str_starts_with($u, '/uploads/')) ? $u : '';
    return array_map(fn ($y) => ['ad' => $y['yazar'], 'url' => $guvenli((string) $y['yazar_url']), 'foto' => $guvenli((string) $y['yazar_foto'], true),
        'puan' => (int) $y['puan'], 'metin' => $y['metin'], 'tarih' => $y['tarih']], $st->fetchAll());
}

/** Panel listesi: hepsi, sitede görünüp görünmediğiyle */
function tumYorumlar(): array
{
    yorumTablosu();
    return db()->query('SELECT id, yazar, yazar_url, yazar_foto, puan, metin, tarih, cekilme, durum, sira, kaynak, ' . YORUM_GORUNUR . ' AS gorunur
        FROM google_yorumlar ORDER BY sira IS NULL, sira, tarih DESC')->fetchAll();
}

/**
 * Gelen yorumları kaydeder. Yeni gelenler panel sırasında en üste eklenir (en yenisi en üstte);
 * mevcutların sırası ve göster/gizle seçimi korunur. $tam: liste eksiksizse, listede olmayan
 * aynı kaynaktaki yorumlar silinir (Google'da silinmiş demektir). Döner: yeni yorum sayısı.
 * Her öğe: id, yazar, puan, metin, tarih, (isteğe bağlı) yazar_url, yazar_foto
 */
function yorumlariKaydet(array $liste, string $kaynak, bool $tam = false): int
{
    yorumTablosu();
    $simdi = date('c');
    $st = db()->prepare('SELECT id FROM google_yorumlar WHERE kaynak = ?');
    $st->execute([$kaynak]);
    $mevcut = array_flip($st->fetchAll(PDO::FETCH_COLUMN));
    $enUst = db()->query('SELECT MIN(sira) FROM google_yorumlar')->fetchColumn();
    $ekle = db()->prepare("INSERT INTO google_yorumlar (id, yazar, yazar_url, yazar_foto, puan, metin, tarih, cekilme, kaynak, sira)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET yazar = excluded.yazar, yazar_url = excluded.yazar_url, yazar_foto = excluded.yazar_foto, puan = excluded.puan,
        metin = excluded.metin, cekilme = excluded.cekilme");
    usort($liste, fn ($x, $y) => strcmp((string) $x['tarih'], (string) $y['tarih']));
    $yeni = 0;
    $gorulen = [];
    db()->beginTransaction();
    foreach ($liste as $y) {
        $gorulen[$y['id']] = true;
        $sira = null;
        if (!isset($mevcut[$y['id']])) {
            $yeni++;
            // Panelde sıralama yapıldıysa yeni yorum en üste konur; yapılmadıysa tarih sırası zaten en üste koyar
            if ($enUst !== null && $enUst !== false) {
                $enUst = (int) $enUst - 1;
                $sira = $enUst;
            }
            $mevcut[$y['id']] = true;
        }
        $ekle->execute([$y['id'], mb_substr((string) $y['yazar'], 0, 120), (string) ($y['yazar_url'] ?? ''), (string) ($y['yazar_foto'] ?? ''), max(0, min(5, (int) $y['puan'])),
            trim((string) $y['metin']), (string) $y['tarih'], $simdi, $kaynak, $sira]);
    }
    if ($tam && $liste) {
        $sil = db()->prepare('DELETE FROM google_yorumlar WHERE kaynak = ? AND id = ?');
        foreach (array_diff_key($mevcut, $gorulen) as $id => $_) {
            $sil->execute([$kaynak, $id]);
        }
    }
    db()->commit();
    return $yeni;
}

/**
 * SerpApi (serpapi.com) ile Google Haritalar'daki yorumların hepsi: data/config.php → serpapi_anahtari.
 * İlk çekimde tüm sayfalar gezilir (ilk sayfa 8, sonrakiler 20 yorum); sonraki yenilemelerde en yeniden
 * başlanır ve bilinen yorumlara ulaşınca durulur (çoğu zaman tek istek). Ücretsiz plan ayda 250 istek.
 */
function serpIstek(array $p): array
{
    global $config;
    $taban = rtrim((string) ($config['serpapi_taban'] ?? 'https://serpapi.com'), '/');
    $ch = curl_init($taban . '/search.json?' . http_build_query($p + ['api_key' => $config['serpapi_anahtari'] ?? '']));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 40]);
    $yanit = curl_exec($ch);
    $kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $veri = is_string($yanit) ? json_decode($yanit, true) : null;
    if ($kod !== 200 || !is_array($veri) || isset($veri['error'])) {
        throw new RuntimeException(is_array($veri) ? (string) ($veri['error'] ?? "HTTP $kod") : 'SerpApi’ye bağlanılamadı');
    }
    return $veri;
}

const KURS_CID = '11573994367863899538';

function serpYorumlariCek(): array
{
    global $config;
    @set_time_limit(180);
    // İşletmenin Haritalar kimliği bir kez bulunur ve saklanır
    $kimlik = (string) ayarGetir('serp_data_id', '');
    if ($kimlik === '') {
        $d = serpIstek(['engine' => 'google_maps', 'type' => 'search', 'hl' => 'tr', 'll' => '@37.0295,35.3093,15z',
            'q' => (string) ($config['google_arama'] ?? 'Alparslan Ceylan Sürücü Kursu')]);
        $adaylar = isset($d['place_results']) ? [$d['place_results']] : ($d['local_results'] ?? []);
        foreach ($adaylar as $a) {
            if ((string) ($a['data_cid'] ?? '') === KURS_CID || ($kimlik === '' && stripos((string) ($a['title'] ?? ''), 'Ceylan') !== false)) {
                $kimlik = (string) ($a['data_id'] ?? '');
            }
        }
        if ($kimlik === '') {
            throw new RuntimeException('İşletme Google Haritalar’da bulunamadı.');
        }
        ayarKaydet('serp_data_id', $kimlik);
    }
    $tamCekildi = (bool) ayarGetir('serp_tam', false);
    $bilinen = array_flip(db()->query("SELECT id FROM google_yorumlar WHERE kaynak = 'serp'")->fetchAll(PDO::FETCH_COLUMN));
    $liste = [];
    $ozet = null;
    $sayfa = '';
    $istek = 0;
    do {
        $d = serpIstek(array_filter(['engine' => 'google_maps_reviews', 'data_id' => $kimlik, 'hl' => 'tr', 'sort_by' => 'newestFirst',
            'next_page_token' => $sayfa, 'num' => $sayfa !== '' ? 20 : null]));
        $istek++;
        $ozet ??= isset($d['place_info']['rating']) ? ['ortalama' => round((float) $d['place_info']['rating'], 1), 'toplam' => (int) ($d['place_info']['reviews'] ?? 0)] : null;
        $hepsiBiliniyor = true;
        foreach ($d['reviews'] ?? [] as $y) {
            $id = 'serp-' . (string) ($y['review_id'] ?? '');
            if ($id === 'serp-') {
                continue;
            }
            $hepsiBiliniyor = $hepsiBiliniyor && isset($bilinen[$id]);
            $liste[] = [
                'id' => $id,
                'yazar' => (string) ($y['user']['name'] ?? 'Google kullanıcısı'),
                'yazar_url' => (string) ($y['user']['link'] ?? ''),
                'yazar_foto' => str_starts_with((string) ($y['user']['thumbnail'] ?? ''), 'https://') ? (string) $y['user']['thumbnail'] : '',
                'puan' => (int) round((float) ($y['rating'] ?? 0)),
                'metin' => (string) ($y['extracted_snippet']['original'] ?? $y['snippet'] ?? ''),
                'tarih' => (string) ($y['iso_date'] ?? date('c')),
            ];
        }
        $sayfa = (string) ($d['serpapi_pagination']['next_page_token'] ?? '');
        // Daha önce hepsi çekildiyse, bilinen yorumlara ulaşınca durulur
    } while ($sayfa !== '' && $istek < 40 && !($tamCekildi && $hepsiBiliniyor));
    $yeni = yorumlariKaydet($liste, 'serp');
    if ($sayfa === '' || $tamCekildi) {
        ayarKaydet('serp_tam', true);
    }
    if ($ozet) {
        ayarKaydet('google_ozet', $ozet + ['guncelleme' => date('c')]);
    }
    return ['ok' => true, 'yeni' => $yeni, 'gelen' => count($liste), 'istek' => $istek];
}

function googleIstek(string $yontem, string $yol, string $alanlar, ?array $govde = null): array
{
    global $config;
    $taban = rtrim((string) ($config['google_places_taban'] ?? 'https://places.googleapis.com/v1'), '/');
    $ch = curl_init($taban . $yol);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $yontem,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => array_filter([
            'X-Goog-Api-Key: ' . ($config['google_places_anahtari'] ?? ''),
            'X-Goog-FieldMask: ' . $alanlar,
            $govde !== null ? 'Content-Type: application/json' : null,
        ]),
        CURLOPT_POSTFIELDS => $govde !== null ? json_encode($govde, JSON_UNESCAPED_UNICODE) : null,
    ]);
    $yanit = curl_exec($ch);
    $kod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $veri = is_string($yanit) ? json_decode($yanit, true) : null;
    if ($kod !== 200 || !is_array($veri)) {
        $mesaj = is_array($veri) ? ($veri['error']['message'] ?? "HTTP $kod") : 'Google’a bağlanılamadı';
        throw new RuntimeException($mesaj);
    }
    return $veri;
}

/** Google'dan çeker ve kaydeder. Döner: ['ok' => bool, 'yeni' => n, 'hata' => ?] */
function yorumlariGuncelle(): array
{
    global $config;
    yorumTablosu();
    ayarKaydet('google_son_deneme', time());
    if (!yorumKaynagiVar()) {
        return ['ok' => false, 'hata' => 'Google bağlantısı kurulmadı.'];
    }
    try {
        if (gbpBaglanti() || !empty($config['serpapi_anahtari'])) {
            $sonuc = gbpBaglanti() ? gbpYorumlariCek() : serpYorumlariCek();
            ayarKaydet('google_hata', null);
            return $sonuc;
        }
        // Yer kimliği bir kez bulunur ve saklanır (Google kuralları yer kimliğinin saklanmasına izin verir)
        $yer = (string) ($config['google_place_id'] ?? '') ?: (string) ayarGetir('google_place_id', '');
        if ($yer === '') {
            $bul = googleIstek('POST', '/places:searchText', 'places.id,places.displayName',
                ['textQuery' => (string) ($config['google_arama'] ?? 'Alparslan Ceylan Sürücü Kursu Seyhan Adana'), 'languageCode' => 'tr']);
            $yer = (string) ($bul['places'][0]['id'] ?? '');
            if ($yer === '') {
                throw new RuntimeException('İşletme Google’da bulunamadı; data/config.php → google_place_id yazın.');
            }
            ayarKaydet('google_place_id', $yer);
        }
        $d = googleIstek('GET', '/places/' . rawurlencode($yer) . '?languageCode=tr', 'rating,userRatingCount,reviews');
        $simdi = date('c');
        $yeni = 0;
        $ekle = db()->prepare('INSERT INTO google_yorumlar (id, yazar, yazar_url, puan, metin, tarih, cekilme) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET yazar = excluded.yazar, yazar_url = excluded.yazar_url, puan = excluded.puan,
            metin = excluded.metin, tarih = excluded.tarih, cekilme = excluded.cekilme');
        $var = db()->prepare('SELECT 1 FROM google_yorumlar WHERE id = ?');
        foreach ($d['reviews'] ?? [] as $y) {
            $id = (string) ($y['name'] ?? '');
            if ($id === '') {
                continue;
            }
            $var->execute([$id]);
            $yeni += $var->fetchColumn() ? 0 : 1;
            $ekle->execute([
                $id,
                mb_substr((string) ($y['authorAttribution']['displayName'] ?? 'Google kullanıcısı'), 0, 120),
                (string) ($y['authorAttribution']['uri'] ?? ''),
                (int) round((float) ($y['rating'] ?? 0)),
                trim((string) ($y['originalText']['text'] ?? $y['text']['text'] ?? '')),
                (string) ($y['publishTime'] ?? $simdi),
                $simdi,
            ]);
        }
        // Elle eklenen yorumlar bu kurala girmez
        db()->prepare("DELETE FROM google_yorumlar WHERE kaynak = 'google' AND cekilme < ?")->execute([date('c', strtotime('-' . YORUM_SAKLAMA_GUN . ' days'))]);
        if (isset($d['rating'])) {
            ayarKaydet('google_ozet', ['ortalama' => (float) $d['rating'], 'toplam' => (int) ($d['userRatingCount'] ?? 0), 'guncelleme' => $simdi]);
        }
        ayarKaydet('google_hata', null);
        return ['ok' => true, 'yeni' => $yeni, 'gelen' => count($d['reviews'] ?? [])];
    } catch (Throwable $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        error_log('Google yorumları alınamadı: ' . $e->getMessage());
        ayarKaydet('google_hata', ['mesaj' => $e->getMessage(), 't' => date('c')]);
        // Hata olursa 6 saat sonra yeniden denenir
        ayarKaydet('google_son_deneme', time() - (YORUM_YENILEME_GUN * 86400) + 6 * 3600);
        return ['ok' => false, 'hata' => $e->getMessage()];
    }
}

/**
 * Haftalık otomatik yenileme: sayfa ziyaretçiye gönderildikten sonra arka planda çalışır,
 * ziyaretçiyi bekletmez. Ayrı bir zamanlanmış görev (cron) gerekmez.
 */
function yorumlarVaktiGeldiyse(): void
{
    global $config;
    if (!yorumKaynagiVar()) {
        return;
    }
    try {
        if (time() - (int) ayarGetir('google_son_deneme', 0) < YORUM_YENILEME_GUN * 86400) {
            return;
        }
        // Aynı anda gelen ziyaretçilerden yalnız biri yeniler (dış API kotası boşa harcanmasın)
        $kilit = fopen(VERI . '/yorum-yenileme.kilit', 'c');
        if (!$kilit || !flock($kilit, LOCK_EX | LOCK_NB)) {
            return;
        }
        if (time() - (int) ayarGetir('google_son_deneme', 0) < YORUM_YENILEME_GUN * 86400) {
            return;
        }
        ayarKaydet('google_son_deneme', time());
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        yorumlariGuncelle();
    } catch (Throwable $e) {
        error_log('Google yorum yenileme: ' . $e->getMessage());
    }
}
