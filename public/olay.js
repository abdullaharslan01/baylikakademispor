// Ziyaretçi etkileşimlerini çerezsiz sayaca bildirir (yalnız toplu sayı tutulur, kişi tanınmaz).
// İzinli adlar public/_inc/sayac.php içindeki OLAYLAR listesindedir.
(() => {
  if (!navigator.sendBeacon) return;
  const gonder = (ad) => navigator.sendBeacon('/api/sayac.php', JSON.stringify({ yol: `olay:${ad}` }));
  window.acskOlay = gonder;

  const blogda = location.pathname.startsWith('/blog/');
  // Sıra önemli: ilk eşleşen kural sayılır
  const KURALLAR = [
    ['.medya__ok, .medya__cubuk', () => null],
    ['[data-olay]', (el) => el.dataset.olay],
    ['a[href^="tel:"]', () => 'telefon'],
    ['a[href*="wa.me/"]', () => 'whatsapp'],
    ['a[href*="instagram.com"]', () => 'instagram'],
    ['a[href="/sinav-deneyimi/"]', () => 'sinavi-dene'],
    ['a[href="#randevu"], a[href="/#randevu"]', () => (blogda ? 'blog-randevu' : 'randevu-cta')],
    ['.vr__video .medya__oynat', () => 'simulator-video'],
    ['.medya__oynat', () => 'video'],
    ['[data-harita="sokak"]', () => 'sanal-tur'],
  ];
  document.addEventListener('click', (e) => {
    for (const [secici, ad] of KURALLAR) {
      const el = e.target.closest?.(secici);
      if (el) { const a = ad(el); if (a) gonder(a); return; }
    }
  }, { capture: true });
})();
