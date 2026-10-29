// Blog yönetim paneli
import './admin.css';
import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Placeholder } from '@tiptap/extensions';
import { Selection } from '@tiptap/pm/state';

const API = '/api/blog.php';
const app = document.getElementById('app');

async function api(islem, { method = 'GET', body, params = '' } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (method === 'POST') {
    opts.headers['X-Istek'] = '1';
    if (body instanceof FormData) opts.body = body;
    else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API}?islem=${islem}${params}`, opts);
  const data = await res.json().catch(() => ({ ok: false, hata: 'Sunucuya ulaşılamadı.' }));
  if (res.status === 401 && islem !== 'giris') {
    // Panel açıkken oturum kapandıysa ekran değişmez; giriş penceresinden sonra istek tekrarlanır
    if (!app.querySelector('.shell')) { girisEkrani(); throw new Error('oturum'); }
    await yenidenGiris();
    return api(islem, { method, body, params });
  }
  if (!data.ok) throw new Error(data.hata || 'Bir hata oluştu.');
  return data;
}

const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function bildir(text, tur = 'ok') {
  const el = h(`<div class="toast toast--${tur}">${esc(text)}</div>`);
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('is-in'), 10);
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, 2600);
}

function slugYap(s) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i', I: 'i' };
  return s.replace(/[çğıöşüİI]/g, (c) => map[c] || c).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// Instagram gönderisi: editörde kart olarak görünür, sitede resmi gömme koduyla açılır
const Instagram = Node.create({
  name: 'instagram',
  group: 'block',
  atom: true,
  addAttributes() {
    return { url: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'div[data-instagram]', getAttrs: (el) => ({ url: el.getAttribute('data-instagram') }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-instagram': HTMLAttributes.url, class: 'ig-card' }),
      ['span', { class: 'ig-card__icon' }, 'IG'],
      ['span', { class: 'ig-card__text' }, 'Instagram gönderisi', ['small', {}, HTMLAttributes.url || '']]];
  },
});

const INSTA_RE = /^https:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_.]+\/)?(p|reel|tv)\/[A-Za-z0-9_-]+/;

async function gorselYukle(dosya) {
  const fd = new FormData();
  fd.append('dosya', dosya);
  const { url } = await api('yukle', { method: 'POST', body: fd });
  return url;
}

function dosyaSec(accept = 'image/jpeg,image/png,image/webp,image/gif') {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

/* ---------- Giriş ---------- */
const girisFormu = (baslik, aciklama = '') => `
  <form class="login__card">
    <img src="/img/logo.png" alt="" width="46" height="56">
    <h1>${baslik}</h1>${aciklama ? `<p class="login__not">${aciklama}</p>` : ''}
    <label>Kullanıcı adı<input name="kullanici" autocomplete="username" required></label>
    <label>Şifre<input name="sifre" type="password" autocomplete="current-password" required></label>
    <button class="btn btn--primary" type="submit">Giriş yap</button>
    <p class="login__err" role="alert"></p>
  </form>`;

function girisiBagla(form, basarili) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('.login__err');
    const btn = form.querySelector('button');
    err.textContent = '';
    btn.disabled = true;
    try {
      await api('giris', { method: 'POST', body: { kullanici: form.kullanici.value, sifre: form.sifre.value } });
      basarili();
    } catch (ex) {
      err.textContent = ex.message;
      form.sifre.value = '';
    }
    btn.disabled = false;
  });
}

function girisEkrani() {
  app.replaceChildren(h(`<div class="login">${girisFormu('Yönetim Paneli')}</div>`));
  girisiBagla(app.querySelector('form'), () => ozetEkrani());
}

let girisBekleniyor = null;
function yenidenGiris() {
  girisBekleniyor ??= new Promise((resolve) => {
    const kutu = h(`<div class="relogin" role="dialog" aria-modal="true">${girisFormu('Oturum kapandı', 'Uzun süre işlem yapılmadığı için oturum kapandı. Tekrar giriş yap; ekrandaki değişikliklerin kaybolmaz.')}</div>`);
    document.body.appendChild(kutu);
    kutu.querySelector('input').focus();
    girisiBagla(kutu.querySelector('form'), () => { kutu.remove(); girisBekleniyor = null; resolve(); });
  });
  return girisBekleniyor;
}

/* ---------- Üst menü ---------- */
const BOLUMLER = [
  ['ozet', 'Özet', () => ozetEkrani()],
  ['yazilar', 'Yazılar', () => listeEkrani()],
  ['randevular', 'Randevular', () => randevuEkrani()],
  ['yorumlar', 'Yorumlar', () => yorumlarEkrani()],
  ['medya', 'Medya', () => medyaEkrani()],
  ['metinler', 'Sayfa yazıları', () => metinlerEkrani()],
  ['icerik', 'Site içeriği', () => icerikEkrani()],
  ['kullanim', 'Kullanım', () => kullanimEkrani()],
];
function kabuk(aktif, govde) {
  app.replaceChildren(h(`
    <div class="shell">
      <header class="top">
        <a href="/" class="top__brand"><img src="/img/logo.png" alt="" width="28" height="34"><span>Yönetim</span></a>
        <nav class="tabs">${BOLUMLER.map(([k, ad]) => `<button class="tab${k === aktif ? ' is-on' : ''}" data-bolum="${k}">${ad}</button>`).join('')}</nav>
        <div class="top__actions">
          <a class="btn btn--ghost" href="/" target="_blank">Siteyi gör</a>
          <button class="btn btn--ghost" data-cikis>Çıkış</button>
        </div>
      </header>
      ${govde}
    </div>`));
  app.querySelectorAll('[data-bolum]').forEach((b) => { b.onclick = () => { if (sekmeDegisebilir()) BOLUMLER.find(([k]) => k === b.dataset.bolum)[2](); }; });
  // Telegram bildirimi yok: yaklaşan randevu sayısı sekmede rozet olarak görünür
  api('ben').then(({ yaklasan }) => {
    const sekme = app.querySelector('[data-bolum="randevular"]');
    if (sekme && yaklasan) sekme.insertAdjacentHTML('beforeend', ` <span class="rozet">${yaklasan}</span>`);
  }).catch(() => {});
  app.querySelector('[data-cikis]').onclick = async () => { await api('cikis', { method: 'POST' }); girisEkrani(); };
}

/* ---------- Sayfalama ---------- */
// Sayfa düğmeleri: 1 … 4 5 6 … 12 (git(n) ile sayfa değişir)
function sayfalama(toplam, sayfa, boyut, git) {
  const adet = Math.ceil(toplam / boyut);
  const nav = h('<nav class="sayfalar" aria-label="Sayfalar"></nav>');
  if (adet < 2) return nav;
  const dugme = (n, yazi = n, etkin = true) => {
    const b = h(`<button type="button" class="${n === sayfa && yazi === n ? 'is-on' : ''}">${yazi}</button>`);
    b.disabled = !etkin;
    b.onclick = () => git(n);
    nav.appendChild(b);
  };
  dugme(sayfa - 1, '‹', sayfa > 1);
  let onceki = 0;
  for (let n = 1; n <= adet; n++) {
    if (n !== 1 && n !== adet && Math.abs(n - sayfa) > 1) continue;
    if (n - onceki > 1) nav.appendChild(h('<span>…</span>'));
    dugme(n);
    onceki = n;
  }
  dugme(sayfa + 1, '›', sayfa < adet);
  return nav;
}

/* ---------- Liste ---------- */
// Arama, filtre ve sayfa, düzenleyiciden dönünce korunur
const liste = { ara: '', durum: '', kategori: '', sayfa: 1 };
const LISTE_BOYUT = 12;
async function listeEkrani() {
  kabuk('yazilar', `
      <main class="list list--wide">
        <div class="list__head">
          <h1>Yazılar</h1>
          <div class="list__arac">
            <button class="btn btn--ghost" data-kategori-ac>Kategoriler</button>
            <button class="btn btn--primary" data-yeni>+ Yeni yazı</button>
          </div>
        </div>
        <section class="panel yeni-yorum" data-kategori-kutu hidden></section>
        <div class="list__body">Yükleniyor…</div>
      </main>`);
  app.querySelector('[data-yeni]').onclick = () => editorEkrani();
  const katKutu = app.querySelector('[data-kategori-kutu]');
  app.querySelector('[data-kategori-ac]').onclick = () => { katKutu.hidden = !katKutu.hidden; if (!katKutu.hidden) kategoriYonetimi(katKutu); };

  const [{ yazilar }] = await Promise.all([api('liste'), kategorileriYukle()]);
  const body = app.querySelector('.list__body');
  if (!yazilar.length) {
    body.replaceChildren(h('<div class="empty"><p>Henüz yazı yok.</p><p>İlk yazını yazmak için “Yeni yazı”ya tıkla.</p></div>'));
    return;
  }
  const say = (d) => yazilar.filter((y) => !d || y.durum === d).length;
  body.replaceChildren(h(`
    <div>
      <div class="filtre">
        <input type="search" placeholder="Başlıkta ara…" value="${esc(liste.ara)}" data-ara>
        <div class="donem">${[['', 'Tümü'], ['yayinda', 'Yayında'], ['taslak', 'Taslak']].map(([k, ad]) => `<button type="button" data-filtre="${k}" class="${liste.durum === k ? 'is-on' : ''}">${ad} <small>${say(k)}</small></button>`).join('')}</div>
        <select class="ara-kucuk" data-kat-filtre><option value="">Tüm kategoriler</option>${kategoriListesi.map((k) => `<option value="${k.id}" ${String(liste.kategori) === String(k.id) ? 'selected' : ''}>${esc(k.ad)} (${k.sayi})</option>`).join('')}<option value="yok" ${liste.kategori === 'yok' ? 'selected' : ''}>Kategorisiz</option></select>
      </div>
      <div data-kartlar></div>
    </div>`));
  const kutu = body.querySelector('[data-kartlar]');

  const ciz = () => {
    const ara = liste.ara.toLocaleLowerCase('tr');
    const katUyar = (y) => !liste.kategori || (liste.kategori === 'yok' ? !y.kategori_id : String(y.kategori_id) === String(liste.kategori));
    const secili = yazilar.filter((y) => (!liste.durum || y.durum === liste.durum) && katUyar(y) && (!ara || y.baslik.toLocaleLowerCase('tr').includes(ara)));
    liste.sayfa = Math.min(liste.sayfa, Math.max(1, Math.ceil(secili.length / LISTE_BOYUT)));
    if (!secili.length) {
      kutu.replaceChildren(h('<div class="empty"><p>Bu aramaya uyan yazı yok.</p></div>'));
      return;
    }
    const grid = h('<ul class="kartlar"></ul>');
    secili.slice((liste.sayfa - 1) * LISTE_BOYUT, liste.sayfa * LISTE_BOYUT).forEach((y) => {
      const tarih = new Date(y.guncelleme).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
      const li = h(`
        <li class="kart">
          <button class="kart__ana" data-duzenle title="Düzenle">
            ${y.kapak ? `<img src="${esc(y.kapak)}" alt="" loading="lazy">` : '<span class="kart__bos"></span>'}
            <span class="kart__ust"><span class="badge badge--${y.durum}">${y.durum === 'yayinda' ? 'Yayında' : 'Taslak'}</span>${y.kategori ? `<small>${esc(y.kategori)}</small>` : ''}</span>
            <strong>${esc(y.baslik)}</strong>
            <small class="muted">Son düzenleme: ${tarih}</small>
          </button>
          <div class="kart__alt">
            <a class="btn btn--ghost btn--sm" href="/blog/${esc(y.slug)}" target="_blank">Gör</a>
            <button class="btn btn--ghost btn--sm btn--danger" data-sil>Sil</button>
          </div>
        </li>`);
      li.querySelector('[data-duzenle]').onclick = () => editorEkrani(y.id);
      li.querySelector('[data-sil]').onclick = async () => {
        if (!confirm(`“${y.baslik}” silinsin mi? Bu işlem geri alınamaz.`)) return;
        await api('sil', { method: 'POST', body: { id: y.id } });
        bildir('Yazı silindi');
        listeEkrani();
      };
      grid.appendChild(li);
    });
    kutu.replaceChildren(grid, sayfalama(secili.length, liste.sayfa, LISTE_BOYUT, (n) => {
      liste.sayfa = n;
      ciz();
      app.querySelector('.list__head').scrollIntoView({ behavior: 'smooth' });
    }));
  };
  body.querySelector('[data-ara]').oninput = (e) => { liste.ara = e.target.value.trim(); liste.sayfa = 1; ciz(); };
  body.querySelector('[data-kat-filtre]').onchange = (e) => { liste.kategori = e.target.value; liste.sayfa = 1; ciz(); };
  body.querySelectorAll('[data-filtre]').forEach((b) => {
    b.onclick = () => {
      liste.durum = b.dataset.filtre;
      liste.sayfa = 1;
      body.querySelectorAll('[data-filtre]').forEach((x) => x.classList.toggle('is-on', x === b));
      ciz();
    };
  });
  ciz();
}

/* ---------- Kategori yönetimi ---------- */
async function kategoriYonetimi(kutu) {
  const liste = await kategorileriYukle();
  kutu.innerHTML = `
    <div class="panel__head"><h2>Kategoriler</h2><button type="button" class="kapat" data-kat-kapat title="Kapat">✕</button></div>
    <p class="muted">Adını değiştirdiğin kategori bütün yazılarda kendiliğinden değişir. Silinen kategorinin yazıları silinmez, kategorisiz kalır. Blogdaki kategori düğmeleri bu sırayla görünür.</p>
    <form class="kat-ekle" data-kat-ekle><input name="ad" maxlength="60" placeholder="Yeni kategori adı" required><button class="btn btn--primary" type="submit">Ekle</button></form>
    <ul class="kat-liste">${liste.map((k, i) => `
      <li data-id="${k.id}">
        <input value="${esc(k.ad)}" maxlength="60" data-kat-ad aria-label="Kategori adı">
        <small class="muted">${Number(k.sayi)} yazı</small>
        <button type="button" class="btn btn--ghost btn--sm" data-kat-kaydet hidden>Kaydet</button>
        <button type="button" class="btn btn--ghost btn--sm" data-kat-yukari ${i ? '' : 'disabled'} title="Yukarı">↑</button>
        <button type="button" class="btn btn--ghost btn--sm" data-kat-asagi ${i < liste.length - 1 ? '' : 'disabled'} title="Aşağı">↓</button>
        <button type="button" class="btn btn--ghost btn--sm btn--danger" data-kat-sil>Sil</button>
      </li>`).join('') || '<li class="muted">Henüz kategori yok.</li>'}</ul>`;
  const yenile = () => kategoriYonetimi(kutu);
  const hata = (ex) => { if (ex.message !== 'oturum') bildir(ex.message, 'err'); };
  kutu.querySelector('[data-kat-kapat]').onclick = () => { kutu.hidden = true; listeEkrani(); };
  kutu.querySelector('[data-kat-ekle]').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('kategori-kaydet', { method: 'POST', body: { ad: e.target.ad.value } }); bildir('Kategori eklendi'); yenile(); } catch (ex) { hata(ex); }
  };
  const idler = liste.map((k) => k.id);
  kutu.querySelectorAll('.kat-liste li[data-id]').forEach((li) => {
    const id = Number(li.dataset.id);
    const ad = li.querySelector('[data-kat-ad]');
    const kaydet = li.querySelector('[data-kat-kaydet]');
    ad.oninput = () => { kaydet.hidden = ad.value.trim() === ad.defaultValue; };
    ad.onkeydown = (e) => { if (e.key === 'Enter') kaydet.click(); };
    kaydet.onclick = async () => {
      try { await api('kategori-kaydet', { method: 'POST', body: { id, ad: ad.value } }); bildir('Kategori adı değişti'); yenile(); } catch (ex) { hata(ex); }
    };
    const tasi = async (yon) => {
      const i = idler.indexOf(id);
      [idler[i], idler[i + yon]] = [idler[i + yon], idler[i]];
      await api('kategori-sira', { method: 'POST', body: { idler } });
      yenile();
    };
    li.querySelector('[data-kat-yukari]').onclick = () => tasi(-1);
    li.querySelector('[data-kat-asagi]').onclick = () => tasi(1);
    li.querySelector('[data-kat-sil]').onclick = async () => {
      const k = liste.find((x) => x.id === id);
      if (!confirm(`“${k.ad}” silinsin mi? ${Number(k.sayi) ? `${k.sayi} yazı kategorisiz kalacak.` : ''}`)) return;
      await api('kategori-sil', { method: 'POST', body: { id } });
      bildir('Kategori silindi');
      yenile();
    };
  });
}

/* ---------- Yapay zekâ komutları ---------- */
// Kategoriler panelden yönetilir (Yazılar → Kategoriler); yazı kategoriye kimliğiyle bağlıdır
let kategoriListesi = [];
let KATEGORILER = [];
async function kategorileriYukle() {
  kategoriListesi = (await api('kategoriler')).kategoriler;
  KATEGORILER = kategoriListesi.map((k) => k.ad);
  return kategoriListesi;
}
const KURS_BILGISI = `## Kurs hakkında doğru bilgiler (yalnız bunları kullan)
- Alparslan Ceylan Sürücü Kursu, Yeşilyurt Mah. 70081 Sok. No:2, Doğanlar Apartmanı zemin kat, Seyhan / Adana. Telefon 0545 359 51 55. 40 yıllık kurum.
- Ehliyet sınıfları: A, A1, A2, B, B (otomatik), C.
- Kursta yapay zekâ destekli, VR gözlüklü bir sürüş simülatörü ("Sanal Sürüş Alanı") var. B manuel ehliyet isteyen ve hiç araç kullanmamış adaylara araç içi ekipmanları, düz sürüşü, duruşu, kalkışı ve şerit değiştirmeyi sıfırdan öğretir. Park, sınav manevraları ve trafikte sürüş eğitmenle gerçek araçta çalışılır; bunların VR'da yapıldığını yazma.`;

// 1. adım: yazının kendisi (başlık, özet, metin)
function yaziKomutu({ konu, baslik, ozet, icerik, digerleri }) {
  return `Sen Adana'daki "Alparslan Ceylan Sürücü Kursu"nun blog yazarısın. Ehliyet almak isteyen adaylar için bir blog yazısı yaz.

${KURS_BILGISI}

## Kurallar
- Türkçe yaz; sade, samimi ve güven veren bir dil kullan.
- Fiyat, ücret, başarı oranı, çalışma saati ya da "Türkiye'de ilk/tek" gibi iddiaları uydurma. Ücret/süre gerekiyorsa "güncel bilgi için kursu arayın" de.
- Sınav kuralları, ders saatleri ve belgeler için yalnız güncel resmî kaynaklara dayan (MEB, mevzuat.gov.tr, e-Devlet). Emin değilsen genel yaz.
- En az 800 kelime. En az 3 <h2> alt başlık; en az biri soru biçiminde ("…?") ve hemen altında 40–60 kelimelik net bir cevap paragrafı.
- İlk paragraf konuyu 2–3 cümlede özetlesin. Metinde "Alparslan Ceylan" ve "Adana" doğal biçimde geçsin.
- En az bir madde listesi (<ul> ya da <ol>) olsun.
- En az bir site içi bağlantı ver (aşağıdaki yazılardan konuyla ilgili olanlara ya da randevu için /#randevu) ve en az bir güvenilir dış kaynağa bağlantı ver (meb.gov.tr, mevzuat.gov.tr, turkiye.gov.tr).
- Sona "İlgili yazılar" listesi ekleme (site önerileri kendisi gösterir). Sonda "Kaynaklar" başlığı altında kullandığın resmî kaynakları listele; ondan önce okuru ücretsiz sanal sürüş denemesi ya da bilgi için /#randevu sayfasına davet eden kısa bir paragraf olsun.

## Yazı
${konu ? `Konu: ${konu}` : 'Konu: (mevcut başlığa göre)'}
${baslik ? `Mevcut başlık: ${baslik}` : ''}
${ozet ? `Mevcut özet: ${ozet}` : ''}
${icerik ? `Mevcut metin (HTML) — geliştir, eksikleri tamamla, anlamını koru:${'\n'}${icerik}` : 'Mevcut metin yok; yazıyı baştan yaz.'}

${digerleri.length ? `## Sitedeki diğer yazılar (site içi bağlantı için)${'\n'}${digerleri.slice(0, 60).map((y) => `- ${y.baslik}: /blog/${y.slug}`).join('\n')}` : ''}

## Cevap biçimi
Cevabının TAMAMINI tek bir kod bloğu (\`\`\`) içinde, tam olarak aşağıdaki köşeli parantezli başlıklarla ver. Kod bloğunun dışına hiçbir şey yazma. Yazıyı Markdown ile yaz (## alt başlık, ### ara başlık, - madde, 1. sıralı madde, **kalın**, [bağlantı metni](/blog/adres)).

[BAŞLIK]
Yazının başlığı (60 karakterden kısa)

[ÖZET]
Listede görünen 1–2 cümlelik özet (en fazla 250 karakter)

[KATEGORİ]
Şunlardan biri: ${KATEGORILER.join(', ')}

[YAZI]
Yazının tamamı (Markdown; başlığı tekrar etme)`;
}

// 2. adım: yazı hazırken yalnız SEO / GEO / AEO alanları (metne dokunmaz)
function seoKomutu({ baslik, ozet, metin }) {
  return `Sen Adana'daki "Alparslan Ceylan Sürücü Kursu"nun SEO uzmanısın. Aşağıdaki blog yazısı için Google (SEO), yapay zekâ asistanları (GEO) ve cevap kutuları (AEO) alanlarını hazırla. Yazının metnini değiştirme.

${KURS_BILGISI}

## Kurallar
- Türkçe yaz. Yazıda olmayan bilgi ekleme; fiyat, başarı oranı, çalışma saati uydurma.
- Odak anahtar kelime, Adana'da bu konuyu arayan birinin Google'a yazacağı doğal bir arama olsun (örn. "adana direksiyon sınavı").
- SEO başlığı 45–65, açıklama 120–160 karakter olsun ve ikisi de anahtar kelimeyi içersin.
- Sık sorulan sorular yazının içeriğinden çıksın; cevaplar 40–60 kelime, net ve tek başına anlaşılır olsun.

## Yazı
Başlık: ${baslik}
${ozet ? `Özet: ${ozet}` : ''}
Metin:
${metin}

## Cevap biçimi
Cevabının TAMAMINI tek bir kod bloğu (\`\`\`) içinde, tam olarak aşağıdaki köşeli parantezli başlıklarla ver. Kod bloğunun dışına hiçbir şey yazma.

[ANAHTAR KELİME]
odak anahtar kelime

[SEO BAŞLIĞI]
Google başlığı (45–65 karakter)

[AÇIKLAMA]
Meta açıklama (120–160 karakter)

[ADRES]
kucuk-harf-tireli-adres (Türkçe karakter yok, anahtar kelimeyi içersin)

[KATEGORİ]
Şunlardan biri: ${KATEGORILER.join(', ')}

[SORULAR]
S: Birinci soru?
C: 40–60 kelimelik net cevap
S: İkinci soru?
C: Cevap
(3–5 soru)`;
}

/* Yapay zekâ cevabını okuma: önce [BAŞLIK] gibi bölümler, olmazsa JSON (bozuk olsa da alan alan) */
const YZ_ALANLARI = {
  baslik: 'baslik', ozet: 'ozet', kategori: 'kategori', yazi: 'icerik', icerik: 'icerik', metin: 'icerik',
  'anahtar kelime': 'anahtar_kelime', 'odak anahtar kelime': 'anahtar_kelime', 'seo basligi': 'seo_baslik',
  aciklama: 'seo_aciklama', 'meta aciklama': 'seo_aciklama', adres: 'slug', slug: 'slug', sorular: 'sss', sss: 'sss',
  'sik sorulan sorular': 'sss',
};
const sade = (t) => t.toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' }[c])).replace(/[^a-z ]/g, '').trim();

function yzCevabi(yanit) {
  let metin = String(yanit || '').replace(/\r/g, '');
  // Kod bloğu varsa yalnız en uzun bloğun içi alınır (öncesi/sonrasındaki açıklamalar atlanır)
  const bloklar = [...metin.matchAll(/```[a-z]*\n([\s\S]*?)```/gi)].map((m) => m[1]);
  if (bloklar.length) metin = bloklar.sort((x, y) => y.length - x.length)[0];
  const v = bolumleriOku(metin);
  if (Object.keys(v).length) return v;
  return jsonOku(metin);
}

function bolumleriOku(metin) {
  const v = {};
  let alan = null;
  let satirlar = [];
  const bitir = () => { if (alan) v[alan] = satirlar.join('\n').trim(); };
  for (const satir of metin.split('\n')) {
    const m = satir.match(/^\s*[*#]*\s*\[\s*([^\]]{2,30})\s*\]\s*[*:]*\s*(.*)$/);
    const anahtar = m && YZ_ALANLARI[sade(m[1])];
    if (anahtar) {
      bitir();
      alan = anahtar;
      satirlar = m[2] ? [m[2]] : [];
    } else if (alan) satirlar.push(satir);
  }
  bitir();
  if (v.icerik) { v.icerik_html = /<(p|h2|h3|ul|ol)[\s>]/i.test(v.icerik) ? v.icerik : mdHtml(v.icerik); delete v.icerik; }
  if (typeof v.sss === 'string') v.sss = sorulariOku(v.sss);
  if (v.kategori) v.kategori = v.kategori.split('\n')[0].trim();
  ['baslik', 'seo_baslik', 'anahtar_kelime', 'slug'].forEach((k) => { if (v[k]) v[k] = v[k].split('\n')[0].replace(/^["“]|["”]$/g, '').trim(); });
  ['ozet', 'seo_aciklama'].forEach((k) => { if (v[k]) v[k] = v[k].replace(/\s*\n\s*/g, ' ').replace(/^["“]|["”]$/g, '').trim(); });
  return v;
}

/** "S: … / C: …" ya da "Soru? / cevap" satırlarından soru-cevap çiftleri */
function sorulariOku(metin) {
  const sss = [];
  for (const satir of metin.split('\n').map((x) => x.replace(/^\s*[-*\d.)]+\s*/, '').trim()).filter(Boolean)) {
    const s = satir.match(/^(?:\*\*)?(?:S|Soru)\s*\d*\s*[:：]\s*(?:\*\*)?\s*(.+)$/i);
    const c = satir.match(/^(?:\*\*)?(?:C|Cevap)\s*\d*\s*[:：]\s*(?:\*\*)?\s*(.+)$/i);
    if (s) sss.push({ soru: s[1].replace(/\*\*/g, '').trim(), cevap: '' });
    else if (c && sss.length) sss[sss.length - 1].cevap += (sss[sss.length - 1].cevap ? ' ' : '') + c[1].trim();
    else if (/\?\s*$/.test(satir) && !/[:：]/.test(satir.slice(0, 3))) sss.push({ soru: satir.replace(/\*\*/g, ''), cevap: '' });
    else if (sss.length) sss[sss.length - 1].cevap += (sss[sss.length - 1].cevap ? ' ' : '') + satir;
  }
  return sss.filter((q) => q.soru && q.cevap);
}

/** JSON: önce olduğu gibi, olmazsa onarıp, o da olmazsa her alanı ayrı ayrı arayarak */
function jsonOku(metin) {
  const bas = metin.indexOf('{');
  const son = metin.lastIndexOf('}');
  if (bas < 0 || son < bas) return null;
  let ham = metin.slice(bas, son + 1);
  try { return JSON.parse(ham); } catch { /* onarmayı dene */ }
  ham = ham.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(ham); } catch { /* alan alan */ }
  const v = {};
  const anahtarlar = ['baslik', 'ozet', 'slug', 'seo_baslik', 'seo_aciklama', 'anahtar_kelime', 'kategori', 'icerik_html'];
  anahtarlar.forEach((k) => {
    // Değer, bir sonraki "alan": ya da kapanış süslü parantezine kadar (içindeki tırnaklar kaçışsız olsa da)
    const m = ham.match(new RegExp(`"${k}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"(?:${[...anahtarlar, 'sss'].join('|')})"\\s*:|\\s*}\\s*$)`));
    if (m) v[k] = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/');
  });
  const sss = [...ham.matchAll(/"soru"\s*:\s*"([\s\S]*?)"\s*,\s*"cevap"\s*:\s*"([\s\S]*?)"\s*}/g)].map((m) => ({ soru: m[1], cevap: m[2] }));
  if (sss.length) v.sss = sss;
  return Object.keys(v).length ? v : null;
}

/** Basit Markdown → HTML (başlık, paragraf, liste, alıntı, kalın, italik, bağlantı) */
function mdHtml(md) {
  const satirIci = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (_, y, u) => `<a href="${u.replace(/&amp;/g, '&')}">${y}</a>`);
  const html = [];
  let liste = null;
  let paragraf = [];
  const paragrafBitir = () => { if (paragraf.length) { html.push(`<p>${satirIci(paragraf.join(' '))}</p>`); paragraf = []; } };
  const listeBitir = () => { if (liste) { html.push(`<${liste.tur}>${liste.ogeler.map((o) => `<li><p>${satirIci(o)}</p></li>`).join('')}</${liste.tur}>`); liste = null; } };
  for (const ham of md.split('\n')) {
    const satir = ham.trim();
    let m;
    if (!satir) { paragrafBitir(); listeBitir(); continue; }
    if ((m = satir.match(/^(#{1,6})\s+(.+)$/))) {
      paragrafBitir(); listeBitir();
      const seviye = m[1].length <= 2 ? 2 : 3;
      html.push(`<h${seviye}>${satirIci(m[2].replace(/#+$/, '').trim())}</h${seviye}>`);
    } else if ((m = satir.match(/^[-*+•]\s+(.+)$/)) || (m = satir.match(/^\d+[.)]\s+(.+)$/))) {
      paragrafBitir();
      const tur = /^\d/.test(satir) ? 'ol' : 'ul';
      if (liste && liste.tur !== tur) listeBitir();
      liste ??= { tur, ogeler: [] };
      liste.ogeler.push(m[1]);
    } else if ((m = satir.match(/^>\s?(.*)$/))) {
      paragrafBitir(); listeBitir();
      html.push(`<blockquote><p>${satirIci(m[1])}</p></blockquote>`);
    } else {
      listeBitir();
      paragraf.push(satir);
    }
  }
  paragrafBitir(); listeBitir();
  return html.join('');
}

/* ---------- Editör ---------- */
let editor = null;
let degisti = false;
window.addEventListener('beforeunload', (e) => { if (degisti) e.preventDefault(); });

const ARACLAR = [
  ['bold', '<b>B</b>', 'Kalın (Ctrl+B)'],
  ['italic', '<i>I</i>', 'İtalik (Ctrl+I)'],
  ['underline', '<u>U</u>', 'Altı çizili'],
  ['|'],
  ['h2', 'H2', 'Başlık'],
  ['h3', 'H3', 'Alt başlık'],
  ['quote', '“', 'Alıntı'],
  ['ul', '•', 'Madde listesi'],
  ['ol', '1.', 'Numaralı liste'],
  ['|'],
  ['link', '🔗', 'Bağlantı'],
  ['image', '🖼', 'Fotoğraf ekle (açıklamasını değiştirmek için fotoğrafa çift tıkla)'],
  ['youtube', '▶', 'YouTube videosu'],
  ['instagram', 'IG', 'Instagram gönderisi'],
  ['hr', '—', 'Ayraç'],
  ['|'],
  ['undo', '↶', 'Geri al'],
  ['redo', '↷', 'Yinele'],
];

async function editorEkrani(id = null) {
  let yazi = { id: null, baslik: '', slug: '', ozet: '', kapak: '', durum: 'taslak', icerik: { type: 'doc', content: [] }, seo_baslik: '', seo_aciklama: '', anahtar_kelime: '', kategori: '', sss: [] };
  const [getirilen] = await Promise.all([id ? api('getir', { params: `&id=${id}` }) : null, kategorileriYukle()]);
  if (getirilen) yazi = getirilen.yazi;
  degisti = false;
  let slugElle = Boolean(yazi.slug);

  app.replaceChildren(h(`
    <div class="shell">
      <header class="top">
        <button class="btn btn--ghost" data-geri>← Yazılar</button>
        <div class="top__actions">
          <span class="status" data-status></span>
          <button class="btn btn--ghost adim-dugme" data-yaz-ac title="Konuyu yaz, yapay zekâya yazdır, cevabı yapıştır"><span class="adim-no">1</span>Yapay zekâ ile yaz</button>
          <button class="btn btn--ghost seo-dugme adim-dugme" data-cekmece-ac title="Yazı bitince: SEO ayarları, yapay zekâ ile doldurma ve kontrol listesi"><span class="adim-no">2</span>SEO <span class="seo-dugme__puan" data-puan-ozet></span></button>
          <a class="btn btn--ghost" data-onizle target="_blank" hidden>Önizle</a>
          <button class="btn btn--ghost" data-taslak>Taslak kaydet</button>
          <button class="btn btn--primary" data-yayinla></button>
        </div>
      </header>
      <aside class="cekmece" data-cekmece aria-label="SEO" hidden>
        <div class="cekmece__ust">
          <h2><span class="adim-no">2</span>SEO</h2>
          <div class="seo__scores" data-puanlar></div>
          <button type="button" class="kapat" data-cekmece-kapat title="Kapat">✕</button>
        </div>
        <nav class="cekmece__sekmeler">
          <button type="button" data-sekme="ayar" class="is-on">Elle doldur</button>
          <button type="button" data-sekme="yz">Yapay zekâ ile doldur</button>
          <button type="button" data-sekme="kontrol">Kontrol listesi</button>
        </nav>
        <div class="cekmece__govde">
          <section data-bolum-seo="ayar">
            <p class="muted">Alanları kendin doldur ya da “Yapay zekâ ile doldur” sekmesini kullan. Boş bıraktıkların otomatik dolar: SEO başlığı yazının başlığından, açıklama özetten, adres başlıktan.</p>
            <label class="fld">Adres<span class="adres"><small>/blog/</small><input data-slug placeholder="yazi-adresi"></span></label>
            <label class="fld"><span>SEO başlığı <small data-say="seo_baslik"></small></span><input data-seo="seo_baslik" maxlength="120"></label>
            <label class="fld"><span>Açıklama <small data-say="seo_aciklama"></small></span><textarea data-seo="seo_aciklama" rows="3" maxlength="300"></textarea></label>
            <label class="fld">Anahtar kelime<input data-seo="anahtar_kelime" maxlength="80" placeholder="örn. adana direksiyon sınavı"></label>
            <label class="fld">Kategori<select data-kategori><option value="">Kategorisiz</option>${kategoriListesi.map((k) => `<option value="${k.id}">${esc(k.ad)}</option>`).join('')}</select></label>
            <div class="fld"><span>Sık sorulan sorular <small class="muted">(Google ve yapay zekâ cevapları için)</small></span>
              <div class="sss" data-sss></div>
              <button type="button" class="btn btn--ghost btn--sm" data-sss-ekle>+ Soru ekle</button>
            </div>
          </section>
          <section data-bolum-seo="yz" hidden>
            <p class="muted">Yazı bittikten sonra kullan: yapay zekâ yazını okuyup yalnız SEO alanlarını (anahtar kelime, SEO başlığı, açıklama, adres, kategori, sık sorulan sorular) doldurur. Yazının metnine dokunmaz.</p>
            <ol class="yz__adimlar">
              <li><b>Komutu kopyala</b>'ya bas.</li>
              <li>ChatGPT, Gemini ya da Claude'a yapıştır.</li>
              <li>Cevabın tamamını aşağıya yapıştırıp <b>Uygula</b>'ya bas.</li>
            </ol>
            <button type="button" class="btn btn--primary btn--tam" data-seo-kopyala>Komutu kopyala</button>
            <textarea class="cekmece__giris" data-seo-cevap rows="6" placeholder="Yapay zekânın cevabını buraya yapıştır"></textarea>
            <button type="button" class="btn btn--primary btn--tam" data-seo-uygula>Uygula</button>
          </section>
          <section data-bolum-seo="kontrol" hidden>
            <ul class="seo__liste" data-kontroller></ul>
          </section>
        </div>
      </aside>
      <div class="modal" data-yaz-modal hidden>
        <div class="modal__kutu" role="dialog" aria-modal="true" aria-labelledby="yazBaslik">
          <div class="panel__head"><h2 id="yazBaslik"><span class="adim-no">1</span>Yazıyı yapay zekâ ile yaz</h2><button type="button" class="kapat" data-yaz-kapat title="Kapat">✕</button></div>
          <ol class="yz__adimlar">
            <li>Konuyu yaz, <b>Komutu kopyala</b>'ya bas.</li>
            <li>ChatGPT, Gemini ya da Claude'a yapıştır.</li>
            <li>Verdiği cevabın tamamını aşağıya yapıştır, <b>Uygula</b>'ya bas: başlık, kısa özet, kategori ve yazının tamamı dolar.</li>
          </ol>
          <input class="cekmece__giris" data-yz-konu maxlength="300" placeholder="Konu (örn. Adana'da direksiyon sınavında sık yapılan hatalar)">
          <button type="button" class="btn btn--primary btn--tam" data-yz-kopyala>Komutu kopyala</button>
          <textarea class="cekmece__giris" data-yz-cevap rows="7" placeholder="Yapay zekânın cevabını buraya yapıştır"></textarea>
          <button type="button" class="btn btn--primary btn--tam" data-yz-uygula>Uygula</button>
          <p class="muted">Sonra yazıyı oku; fiyat, süre, tarih gibi bilgileri kontrol et. Yazı bitince <b>2. adım</b>: sağ üstteki <b>SEO</b> düğmesi.</p>
          <button type="button" class="btn btn--ghost btn--tam" data-kendim>Yapay zekâ kullanmadan kendim yazacağım</button>
        </div>
      </div>
      <main class="write">
        <section class="secim" data-secim hidden>
          <h2>Bu yazıyı nasıl hazırlamak istersin?</h2>
          <div class="secim__dugmeler">
            <button type="button" data-kendim><b>✍️ Kendim yazacağım</b><span>Başlığı, özeti ve yazıyı aşağıya kendin yaz. SEO alanlarını da “SEO” düğmesinden elle doldurursun.</span></button>
            <button type="button" data-yaz-sec><b>✨ Yapay zekâ ile yaz</b><span>Konuyu ver; ChatGPT, Gemini ya da Claude yazsın, cevabını yapıştır, her şey dolsun.</span></button>
          </div>
        </section>
        <button class="cover" data-kapak type="button"></button>
        <textarea class="title" rows="1" placeholder="Başlık" maxlength="200"></textarea>
        <textarea class="lead" rows="1" placeholder="Kısa özet (listede ve Google'da görünür)" maxlength="300"></textarea>
        <div class="toolbar" role="toolbar"></div>
        <div class="editor"></div>
      </main>
    </div>`));

  const $ = (s) => app.querySelector(s);
  const title = $('.title');
  const lead = $('.lead');
  const slugInp = $('[data-slug]');
  const kapakBtn = $('[data-kapak]');
  title.value = yazi.baslik;
  lead.value = yazi.ozet;
  slugInp.value = yazi.slug;
  const kategoriSec = $('[data-kategori]');
  kategoriSec.value = yazi.kategori_id ? String(yazi.kategori_id) : '';
  kategoriSec.onchange = () => { degisti = true; };
  // Yapay zekânın yazdığı kategori adı listedeki kategoriye eşlenir
  const kategoriAdla = (ad) => {
    if (typeof ad !== 'string' || !ad.trim()) return;
    const k = kategoriListesi.find((x) => sade(ad).includes(sade(x.ad))) || kategoriListesi.find((x) => sade(x.ad).includes(sade(ad)));
    if (k) kategoriSec.value = String(k.id);
  };
  app.querySelectorAll('[data-seo]').forEach((el) => { el.value = yazi[el.dataset.seo] || ''; el.addEventListener('input', () => { degisti = true; analizEt(); }); });
  // SEO çekmecesi: sağdan açılır; sekmeler
  const cekmece = $('[data-cekmece]');
  $('[data-cekmece-ac]').onclick = () => { cekmece.hidden = !cekmece.hidden; };
  $('[data-cekmece-kapat]').onclick = () => { cekmece.hidden = true; };
  app.querySelectorAll('[data-sekme]').forEach((b) => {
    b.onclick = () => {
      app.querySelectorAll('[data-sekme]').forEach((x) => x.classList.toggle('is-on', x === b));
      app.querySelectorAll('[data-bolum-seo]').forEach((x) => { x.hidden = x.dataset.bolumSeo !== b.dataset.sekme; });
    };
  });
  // Boş SEO alanlarında, otomatik kullanılacak değer gri olarak görünür
  const yerTutucular = () => {
    $('[data-seo="seo_baslik"]').placeholder = title.value.trim() ? `${title.value.trim()} | Alparslan Ceylan Sürücü Kursu` : 'Başlıktan otomatik';
    $('[data-seo="seo_aciklama"]').placeholder = lead.value.trim() || 'Özetten otomatik';
  };
  [title, lead].forEach((el) => el.addEventListener('input', yerTutucular));
  yerTutucular();
  const sssKutu = $('[data-sss]');
  const sssSatir = (q = {}) => {
    const el = h(`<div class="sss__satir"><input data-soru maxlength="200" placeholder="Soru (örn. Direksiyon sınavı kaç dakika sürer?)"><textarea data-cevap rows="2" maxlength="1200" placeholder="40–60 kelimelik net cevap"></textarea><button type="button" class="btn btn--ghost btn--sm btn--danger" title="Sil">✕</button></div>`);
    el.querySelector('[data-soru]').value = q.soru || '';
    el.querySelector('[data-cevap]').value = q.cevap || '';
    el.querySelector('button').onclick = () => { el.remove(); degisti = true; analizEt(); };
    el.addEventListener('input', () => { degisti = true; analizEt(); });
    sssKutu.appendChild(el);
  };
  (yazi.sss || []).forEach(sssSatir);
  $('[data-sss-ekle]').onclick = () => sssSatir();
  const sssOku = () => [...sssKutu.children].map((el) => ({ soru: el.querySelector('[data-soru]').value.trim(), cevap: el.querySelector('[data-cevap]').value.trim() })).filter((q) => q.soru && q.cevap);

  const boyutla = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  [title, lead].forEach((ta) => { ta.addEventListener('input', () => { boyutla(ta); degisti = true; }); requestAnimationFrame(() => boyutla(ta)); });
  title.addEventListener('input', () => { if (!slugElle) slugInp.value = slugYap(title.value); });
  slugInp.addEventListener('input', () => { slugElle = true; degisti = true; });

  const kapakCiz = () => {
    kapakBtn.classList.toggle('has-img', Boolean(yazi.kapak));
    kapakBtn.innerHTML = yazi.kapak
      ? `<img src="${esc(yazi.kapak)}" alt=""><span class="cover__x" title="Kapağı kaldır">✕</span>`
      : '<span>+ Kapak fotoğrafı ekle</span>';
  };
  kapakCiz();
  kapakBtn.onclick = async (e) => {
    if (e.target.closest('.cover__x')) { yazi.kapak = ''; degisti = true; kapakCiz(); return; }
    const f = await dosyaSec();
    if (!f) return;
    kapakBtn.classList.add('is-loading');
    try { yazi.kapak = await gorselYukle(f); degisti = true; kapakCiz(); } catch (ex) { bildir(ex.message, 'err'); }
    kapakBtn.classList.remove('is-loading');
  };

  editor?.destroy();
  let analizZamani;
  editor = new Editor({
    element: $('.editor'),
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, link: { openOnClick: false, autolink: true } }),
      Image.configure({ HTMLAttributes: { loading: 'lazy' } }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Instagram,
      Placeholder.configure({ placeholder: 'Hikâyeni anlat… (YouTube linki yapıştırırsan video olarak eklenir)' }),
    ],
    content: yazi.icerik,
    onUpdate: () => { degisti = true; clearTimeout(analizZamani); analizZamani = setTimeout(analizEt, 300); },
    editorProps: {
      handleDoubleClickOn: (view, pos, node, nodePos) => {
        if (node.type.name !== 'image') return false;
        const alt = prompt('Fotoğrafın açıklaması (alternatif metin):', node.attrs.alt || '');
        if (alt !== null) view.dispatch(view.state.tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, alt: alt.trim() }));
        return true;
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain')?.trim() || '';
        if (INSTA_RE.test(text)) {
          ekleZinciri().insertContent({ type: 'instagram', attrs: { url: text } }).run();
          return true;
        }
        const img = [...(event.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
        if (img) { resimEkle(img); return true; }
        return false;
      },
      handleDrop: (view, event) => {
        const img = [...(event.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));
        if (img) { event.preventDefault(); resimEkle(img); return true; }
        return false;
      },
    },
  });

  // Seçili bir fotoğraf/video varken eklenen yeni öğe onun yerine geçmesin: imleç öğenin arkasına alınır
  const ekleZinciri = () => editor.chain().focus().command(({ tr }) => {
    if (tr.selection.node) tr.setSelection(Selection.near(tr.doc.resolve(tr.selection.to)));
    return true;
  });

  // Yapay zekâ: komut panoya kopyalanır; kopyalanamazsa cevap kutusuna yazılır
  const kopyala = async (komut, kutu) => {
    try {
      await navigator.clipboard.writeText(komut);
      bildir('Komut kopyalandı. Şimdi yapay zekâya yapıştır.');
    } catch {
      kutu.value = komut;
      bildir('Kopyalanamadı; komut kutuda, oradan kopyala.', 'err');
    }
  };
  const yaz = (el, deger) => { if (typeof deger === 'string' && deger.trim()) el.value = deger.trim(); };

  // 1) Yapay zekâ ile yaz: başlık, özet, kategori ve metin
  const yazModal = $('[data-yaz-modal]');
  $('[data-yaz-ac]').onclick = () => { yazModal.hidden = false; $('[data-yz-konu]').focus(); };
  $('[data-yaz-kapat]').onclick = () => { yazModal.hidden = true; };
  // Yeni ve boş yazıda nasıl başlanacağı sorulur (kendim / yapay zekâ)
  const secim = $('[data-secim]');
  secim.hidden = Boolean(yazi.id || yazi.baslik || (yazi.icerik.content || []).length);
  app.querySelectorAll('[data-kendim]').forEach((b) => { b.onclick = () => { secim.hidden = true; yazModal.hidden = true; title.focus(); }; });
  $('[data-yaz-sec]').onclick = () => { secim.hidden = true; yazModal.hidden = false; $('[data-yz-konu]').focus(); };
  yazModal.onclick = (e) => { if (e.target === yazModal) yazModal.hidden = true; };
  $('[data-yz-kopyala]').onclick = async () => {
    let digerleri = [];
    try { digerleri = (await api('liste')).yazilar.filter((y) => y.durum === 'yayinda' && y.id !== yazi.id); } catch { /* listesiz de çalışsın */ }
    kopyala(yaziKomutu({
      konu: $('[data-yz-konu]').value.trim(),
      baslik: title.value.trim(),
      ozet: lead.value.trim(),
      icerik: editor.getText().trim() ? editor.getHTML() : '',
      digerleri,
    }), $('[data-yz-cevap]'));
  };
  $('[data-yz-uygula]').onclick = () => {
    const v = yzCevabi($('[data-yz-cevap]').value);
    if (!v || !(v.baslik || v.icerik_html)) { bildir('Cevapta başlık ya da yazı bulunamadı. Yapay zekânın kod bloğundaki cevabın tamamını kopyalayıp yapıştır.', 'err'); return; }
    if (v.icerik_html && editor.getText().trim() && !confirm('Yazının mevcut metni yapay zekânın yazdığıyla değiştirilsin mi?')) v.icerik_html = '';
    yaz(title, v.baslik);
    yaz(lead, v.ozet);
    kategoriAdla(v.kategori);
    if (!slugElle) slugInp.value = slugYap(title.value);
    if (typeof v.icerik_html === 'string' && v.icerik_html.trim()) editor.commands.setContent(v.icerik_html);
    [title, lead].forEach(boyutla);
    yerTutucular();
    $('[data-yz-cevap]').value = '';
    yazModal.hidden = true;
    secim.hidden = true;
    degisti = true;
    analizEt();
    bildir('Yazı dolduruldu. Okuyup kontrol et; sonra SEO düğmesinden SEO alanlarını doldurabilirsin.');
  };

  // 2) SEO alanları: yazı hazırken yapay zekâ yalnız SEO / GEO / AEO alanlarını doldurur
  $('[data-seo-kopyala]').onclick = () => {
    if (editor.getText().trim().split(/\s+/).length < 100) { bildir('Önce yazıyı yaz (ya da “Yapay zekâ ile yaz”ı kullan); SEO alanları yazıya göre hazırlanır.', 'err'); return; }
    kopyala(seoKomutu({ baslik: title.value.trim(), ozet: lead.value.trim(), metin: editor.getText().trim() }), $('[data-seo-cevap]'));
  };
  $('[data-seo-uygula]').onclick = () => {
    const v = yzCevabi($('[data-seo-cevap]').value);
    if (!v || !['seo_baslik', 'seo_aciklama', 'anahtar_kelime', 'sss'].some((k) => v[k]?.length)) { bildir('Cevapta SEO alanları bulunamadı. Yapay zekânın kod bloğundaki cevabın tamamını kopyalayıp yapıştır.', 'err'); return; }
    ['seo_baslik', 'seo_aciklama', 'anahtar_kelime'].forEach((k) => yaz($(`[data-seo="${k}"]`), v[k]));
    kategoriAdla(v.kategori);
    if (typeof v.slug === 'string' && v.slug.trim()) { slugInp.value = slugYap(v.slug); slugElle = true; }
    if (Array.isArray(v.sss) && v.sss.length) {
      sssKutu.replaceChildren();
      v.sss.filter((q) => q?.soru && q?.cevap).slice(0, 8).forEach((q) => sssSatir({ soru: String(q.soru), cevap: String(q.cevap) }));
    }
    $('[data-seo-cevap]').value = '';
    degisti = true;
    analizEt();
    app.querySelector('[data-sekme="ayar"]').click();
    bildir('SEO alanları dolduruldu. Ayarlar sekmesinden kontrol et.');
  };

  // Canlı SEO / GEO / AEO kontrolü (kriterler: docs/SEO-REHBERI.md)
  function analizEt() {
    if (!editor) return;
    const kucuk = (t) => (t || '').toLocaleLowerCase('tr');
    const seoBaslik = $('[data-seo="seo_baslik"]').value.trim() || title.value.trim();
    const meta = $('[data-seo="seo_aciklama"]').value.trim() || lead.value.trim();
    const kw = kucuk($('[data-seo="anahtar_kelime"]').value.trim());
    const doc = editor.getJSON();
    const metin = editor.getText();
    const kelime = metin.split(/\s+/).filter(Boolean).length;
    const dugumMetni = (n) => (n.content || []).map((c) => c.text || dugumMetni(c)).join('');
    const bloklar = doc.content || [];
    const basliklar = bloklar.filter((n) => n.type === 'heading').map(dugumMetni);
    const ilkParagraf = dugumMetni(bloklar.find((n) => n.type === 'paragraph') || {});
    const linkler = [];
    const gorseller = [];
    const gez = (n) => { if (n.type === 'image') gorseller.push(n); (n.marks || []).forEach((m) => { if (m.type === 'link') linkler.push(m.attrs.href || ''); }); (n.content || []).forEach(gez); };
    gez(doc);
    const soruBasligi = basliklar.filter((b) => b.trim().endsWith('?'));
    // Soru başlığından hemen sonraki paragraf kısa ve net mi?
    let kisaCevap = false;
    bloklar.forEach((n, i) => {
      if (n.type === 'heading' && dugumMetni(n).trim().endsWith('?')) {
        const sonraki = bloklar[i + 1];
        const k = sonraki?.type === 'paragraph' ? dugumMetni(sonraki).split(/\s+/).filter(Boolean).length : 0;
        if (k >= 20 && k <= 70) kisaCevap = true;
      }
    });
    const slugKelimeler = kw.split(/\s+/).filter((w) => w.length > 2).map((w) => slugYap(w));
    const sss = sssOku();
    const say = (el, n, a, b) => { el.textContent = `${n} karakter`; el.className = n >= a && n <= b ? 'ok' : n ? 'uyari' : ''; };
    say(app.querySelector('[data-say="seo_baslik"]'), seoBaslik.length, 45, 65);
    say(app.querySelector('[data-say="seo_aciklama"]'), meta.length, 120, 160);

    const K = [
      ['SEO', seoBaslik.length >= 45 && seoBaslik.length <= 65, 'SEO başlığı 45–65 karakter'],
      ['SEO', meta.length >= 120 && meta.length <= 160, 'Meta açıklama 120–160 karakter'],
      ['SEO', Boolean(kw), 'Odak anahtar kelime girildi'],
      ['SEO', Boolean(kw) && kucuk(seoBaslik).includes(kw), 'Anahtar kelime başlıkta'],
      ['SEO', Boolean(kw) && kucuk(meta).includes(kw), 'Anahtar kelime meta açıklamada'],
      ['SEO', Boolean(kw) && kucuk(ilkParagraf).includes(kw), 'Anahtar kelime ilk paragrafta'],
      ['SEO', slugKelimeler.length > 0 && slugKelimeler.every((w) => slugInp.value.includes(w)), 'Anahtar kelime adreste (slug)'],
      ['SEO', basliklar.length >= 2, 'En az 2 alt başlık'],
      ['SEO', kelime >= 600, `En az 600 kelime (şu an ${kelime})`],
      ['SEO', Boolean(yazi.kapak), 'Kapak görseli'],
      ['SEO', gorseller.every((g) => (g.attrs.alt || '').trim()), 'Görsellerin alternatif metni var'],
      ['SEO', linkler.some((l) => l.startsWith('/')), 'En az 1 site içi bağlantı'],
      ['GEO', kucuk(metin).includes('alparslan ceylan'), 'Kurum adı metinde geçiyor'],
      ['GEO', kucuk(metin).includes('adana'), 'Konum (Adana) metinde geçiyor'],
      ['GEO', linkler.some((l) => /^https?:/.test(l)), 'Güvenilir dış kaynağa bağlantı (MEB, mevzuat vb.)'],
      ['GEO', (metin.match(/\d+/g) || []).length >= 3, 'Somut bilgi: rakam / süre / sayı içeriyor'],
      ['GEO', ilkParagraf.split(/\s+/).filter(Boolean).length >= 25, 'İlk paragraf konuyu net özetliyor'],
      ['AEO', soruBasligi.length >= 1, 'En az 1 soru biçiminde başlık ("…?")'],
      ['AEO', kisaCevap, 'Soru başlığının altında kısa, net cevap (20–70 kelime)'],
      ['AEO', bloklar.some((n) => n.type === 'bulletList' || n.type === 'orderedList'), 'Madde veya adım listesi'],
      ['AEO', sss.length >= 2, `En az 2 SSS sorusu (şu an ${sss.length})`],
    ];
    const puan = (grup) => { const g = K.filter((k) => k[0] === grup); return Math.round((g.filter((k) => k[1]).length / g.length) * 10); };
    app.querySelector('[data-puanlar]').innerHTML = ['SEO', 'GEO', 'AEO'].map((gr) => {
      const p = puan(gr);
      return `<span class="puan puan--${p >= 8 ? 'iyi' : p >= 5 ? 'orta' : 'zayif'}">${gr} ${p}/10</span>`;
    }).join('');
    const ort = Math.round((puan('SEO') + puan('GEO') + puan('AEO')) / 3);
    const ozet = app.querySelector('[data-puan-ozet]');
    ozet.textContent = `${ort}/10`;
    ozet.className = `seo-dugme__puan puan--${ort >= 8 ? 'iyi' : ort >= 5 ? 'orta' : 'zayif'}`;
    app.querySelector('[data-kontroller]').innerHTML = K.map(([gr, ok, ad]) => `<li class="${ok ? 'ok' : ''}"><b>${gr}</b>${esc(ad)}</li>`).join('');
  }

  async function resimEkle(dosya) {
    bildir('Fotoğraf yükleniyor…');
    try {
      const url = await gorselYukle(dosya);
      const alt = prompt('Fotoğrafı kısaca anlat (Google ve ekran okuyucular için, örn. "Direksiyon başında öğrenci"):', '') || '';
      ekleZinciri().setImage({ src: url, alt: alt.trim() }).run();
    } catch (ex) { bildir(ex.message, 'err'); }
  }

  // Araç çubuğu
  const tb = $('.toolbar');
  const komut = {
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    quote: () => editor.chain().focus().toggleBlockquote().run(),
    ul: () => editor.chain().focus().toggleBulletList().run(),
    ol: () => editor.chain().focus().toggleOrderedList().run(),
    hr: () => ekleZinciri().setHorizontalRule().run(),
    undo: () => editor.chain().focus().undo().run(),
    redo: () => editor.chain().focus().redo().run(),
    link: () => {
      const once = editor.getAttributes('link').href || '';
      const url = prompt('Bağlantı adresi (boş bırakırsan kaldırılır):', once);
      if (url === null) return;
      if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run();
      else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    },
    image: async () => { const f = await dosyaSec(); if (f) resimEkle(f); },
    youtube: () => {
      const url = prompt('YouTube video linki:');
      if (!url) return;
      if (!ekleZinciri().setYoutubeVideo({ src: url.trim() }).run()) bildir('Geçerli bir YouTube linki değil', 'err');
    },
    instagram: () => {
      const url = prompt('Instagram gönderi veya reels linki:');
      if (!url) return;
      if (!INSTA_RE.test(url.trim())) { bildir('Geçerli bir Instagram linki değil', 'err'); return; }
      ekleZinciri().insertContent({ type: 'instagram', attrs: { url: url.trim() } }).run();
    },
  };
  const aktif = {
    bold: () => editor.isActive('bold'), italic: () => editor.isActive('italic'), underline: () => editor.isActive('underline'),
    h2: () => editor.isActive('heading', { level: 2 }), h3: () => editor.isActive('heading', { level: 3 }),
    quote: () => editor.isActive('blockquote'), ul: () => editor.isActive('bulletList'), ol: () => editor.isActive('orderedList'),
    link: () => editor.isActive('link'),
  };
  ARACLAR.forEach(([ad, ikon, ipucu]) => {
    if (ad === '|') { tb.appendChild(h('<span class="toolbar__sep"></span>')); return; }
    const b = h(`<button type="button" class="tool" title="${ipucu}" aria-label="${ipucu}" data-arac="${ad}">${ikon}</button>`);
    b.onmousedown = (e) => e.preventDefault();
    b.onclick = () => komut[ad]();
    tb.appendChild(b);
  });
  const aracGuncelle = () => tb.querySelectorAll('[data-arac]').forEach((b) => b.classList.toggle('is-on', aktif[b.dataset.arac]?.() || false));
  editor.on('selectionUpdate', aracGuncelle);
  editor.on('transaction', aracGuncelle);

  // Kaydet / yayınla
  const statusEl = $('[data-status]');
  const yayinBtn = $('[data-yayinla]');
  const onizle = $('[data-onizle]');
  const durumCiz = () => {
    statusEl.textContent = yazi.durum === 'yayinda' ? 'Yayında' : 'Taslak';
    statusEl.className = `status badge badge--${yazi.durum}`;
    yayinBtn.textContent = yazi.durum === 'yayinda' ? 'Güncelle' : 'Yayınla';
    if (yazi.slug) { onizle.href = `/blog/${yazi.slug}`; onizle.hidden = false; }
  };
  durumCiz();

  async function kaydet(durum) {
    if (!title.value.trim()) { bildir('Önce bir başlık yaz', 'err'); title.focus(); return; }
    try {
      const r = await api('kaydet', {
        method: 'POST',
        body: {
          id: yazi.id, baslik: title.value.trim(), slug: slugInp.value.trim(), ozet: lead.value.trim(), kapak: yazi.kapak, icerik: editor.getJSON(), durum,
          seo_baslik: $('[data-seo="seo_baslik"]').value.trim(), seo_aciklama: $('[data-seo="seo_aciklama"]').value.trim(),
          anahtar_kelime: $('[data-seo="anahtar_kelime"]').value.trim(), kategori_id: Number(kategoriSec.value) || null, sss: sssOku(),
        },
      });
      yazi.id = r.id; yazi.slug = r.slug; yazi.durum = r.durum;
      slugInp.value = r.slug; slugElle = true; degisti = false;
      durumCiz();
      bildir(durum === 'yayinda' ? 'Yazı yayında 🎉' : 'Taslak kaydedildi');
    } catch (ex) {
      if (ex.message !== 'oturum') bildir(ex.message, 'err');
    }
  }
  $('[data-taslak]').onclick = () => kaydet('taslak');
  yayinBtn.onclick = () => kaydet('yayinda');
  $('[data-geri]').onclick = () => { if (!degisti || confirm('Kaydedilmemiş değişiklikler var. Çıkılsın mı?')) { degisti = false; listeEkrani(); } };
  document.onkeydown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); kaydet(yazi.durum); } };

  [title, lead, slugInp].forEach((el) => el.addEventListener('input', () => analizEt()));
  analizEt();
  if (!id) title.focus();
}

/* ---------- Site içeriği: iletişim, duyuru bandı, KURSUM-APP ---------- */
async function icerikEkrani() {
  kabuk('icerik', '<main class="list"><p>Yükleniyor…</p></main>');
  const { duyuru, iletisim, kursum } = await api('ayarlar');
  kabuk('icerik', `
    <main class="list">
      <div class="list__head"><h1>Site içeriği</h1><button class="btn btn--primary" data-kaydet>Kaydet</button></div>
      <section class="panel">
        <h2>İletişim bilgileri</h2>
        <p class="muted">Sitenin her yerinde (ana sayfa, blog, alt bilgi, Google için yapılandırılmış veri) bu bilgiler gösterilir.</p>
        <div class="alanlar">
          <label class="fld">Telefon<input data-il="telefon" inputmode="tel" placeholder="0545 359 51 55"></label>
          <label class="fld">WhatsApp numarası<input data-il="whatsapp" inputmode="tel" placeholder="Boşsa telefonla aynı"></label>
          <label class="fld">E-posta<input data-il="eposta" type="email"></label>
          <label class="fld">Instagram kullanıcı adı<input data-il="instagram" placeholder="alparslanceylansurucukursu"></label>
        </div>
      </section>
      <section class="panel">
        <h2>Duyuru bandı</h2>
        <p class="muted">Ana sayfanın en üstünde kırmızı şerit olarak görünür. Örn. “Kayıtlar devam ediyor – son gün 10 Kasım”.</p>
        <label class="check"><input type="checkbox" data-d-aktif> Duyuruyu göster</label>
        <label class="fld">Metin<input data-d-metin maxlength="160" placeholder="Kısa duyuru metni"></label>
        <label class="fld">Link (isteğe bağlı)<input data-d-link placeholder="/#randevu ya da https://…"></label>
      </section>
      <section class="panel">
        <h2>Fotoğraflar, videolar ve yazılar</h2>
        <p class="muted">Ana sayfadaki fotoğraf ve videolar <b>Medya</b> sekmesinden, başlık ve açıklamalar ile sık sorulan sorular <b>Sayfa yazıları</b> sekmesinden değişir.</p>
      </section>
      <section class="panel">
        <h2>KURSUM-APP (e-sınav)</h2>
        <p class="muted">Kayıtlı adayların e-sınav çalıştığı uygulamanın bağlantısı. Girilince ana sayfadaki “Ehliyete giden yol” bölümünde “KURSUM-APP'e git” kutusu görünür; boş bırakılırsa gizlenir.</p>
        <label class="fld">Bağlantı<input data-kursum placeholder="https://…"></label>
      </section>
    </main>`);
  const $ = (q) => app.querySelector(q);
  $('[data-d-aktif]').checked = Boolean(duyuru.aktif);
  $('[data-d-metin]').value = duyuru.metin || '';
  $('[data-d-link]').value = duyuru.link || '';
  const telYaz = (t) => (t ? `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}` : '');
  app.querySelectorAll('[data-il]').forEach((el) => {
    const v = iletisim[el.dataset.il] || '';
    el.value = ['telefon', 'whatsapp'].includes(el.dataset.il) ? telYaz(v) : v;
  });
  $('[data-kursum]').value = kursum || '';
  $('[data-kaydet]').onclick = async () => {
    try {
      const il = Object.fromEntries([...app.querySelectorAll('[data-il]')].map((el) => [el.dataset.il, el.value.trim()]));
      await api('ayarlar', { method: 'POST', body: { duyuru: { aktif: $('[data-d-aktif]').checked, metin: $('[data-d-metin]').value, link: $('[data-d-link]').value }, iletisim: il, kursum: $('[data-kursum]').value.trim() } });
      bildir('Kaydedildi. Ana sayfada 1 dakika içinde görünür.');
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  };
}

/* ---------- Medya: ana sayfadaki fotoğraf, YouTube, Instagram ve video alanları ---------- */
const MEDYA_TIP_ADI = { gorsel: 'Fotoğraf', youtube: 'YouTube', instagram: 'Instagram', video: 'Video' };
const VIDEO_EN_FAZLA_MB = 60;

// Fotoğrafı alanın oranında kırpar: sürükle, yakınlaştır; sonuç JPEG dosyası olarak döner (sunucu WebP'ye çevirir)
function kirp(dosya, oran) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(dosya);
    const kutu = h(`
      <div class="modal kirp">
        <div class="modal__kutu kirp__kutu">
          <div class="panel__head"><h2>Fotoğrafı kırp</h2><button type="button" class="kapat" data-vazgec aria-label="Kapat">✕</button></div>
          <p class="muted">Sürükleyerek konumla, çubukla yakınlaştır. Çerçeve, fotoğrafın sitede görüneceği alanın oranında.</p>
          <div class="kirp__cerceve"><img alt="" draggable="false"></div>
          <label class="kirp__zoom">Yakınlaştır <input type="range" min="1" max="4" step="0.01" value="1"></label>
          <div class="kirp__btn">
            <button type="button" class="btn btn--ghost" data-oldugu>Kırpmadan yükle</button>
            <button type="button" class="btn btn--primary" data-kirp>Kırp ve yükle</button>
          </div>
        </div>
      </div>`);
    document.body.append(kutu);
    const cer = kutu.querySelector('.kirp__cerceve');
    const img = cer.querySelector('img');
    const zoom = kutu.querySelector('input[type=range]');
    let fw; let fh; let nw; let nh; let taban; let olcek; let x = 0; let y = 0;
    const sinirla = () => {
      x = Math.min(0, Math.max(fw - nw * olcek, x));
      y = Math.min(0, Math.max(fh - nh * olcek, y));
      img.style.transform = `translate(${x}px, ${y}px) scale(${olcek})`;
    };
    const yakinlas = (z, mx = fw / 2, my = fh / 2) => {
      const yeni = taban * z;
      x = mx - ((mx - x) * yeni) / olcek;
      y = my - ((my - y) * yeni) / olcek;
      olcek = yeni;
      sinirla();
    };
    const bitir = (sonuc) => { URL.revokeObjectURL(url); kutu.remove(); resolve(sonuc); };
    img.onload = () => {
      nw = img.naturalWidth; nh = img.naturalHeight;
      fw = Math.min(520, innerWidth - 80);
      fh = fw / oran;
      if (fh > innerHeight * 0.55) { fh = innerHeight * 0.55; fw = fh * oran; }
      cer.style.width = `${fw}px`;
      cer.style.height = `${fh}px`;
      taban = Math.max(fw / nw, fh / nh);
      olcek = taban;
      x = (fw - nw * olcek) / 2;
      y = (fh - nh * olcek) / 2;
      sinirla();
    };
    img.onerror = () => { bildir('Fotoğraf açılamadı.', 'err'); bitir(null); };
    img.src = url;
    let surukle = null;
    cer.addEventListener('pointerdown', (e) => { surukle = { px: e.clientX, py: e.clientY, x, y }; cer.setPointerCapture(e.pointerId); });
    cer.addEventListener('pointermove', (e) => {
      if (!surukle) return;
      x = surukle.x + e.clientX - surukle.px;
      y = surukle.y + e.clientY - surukle.py;
      sinirla();
    });
    cer.addEventListener('pointerup', () => { surukle = null; });
    cer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const z = Math.min(4, Math.max(1, Number(zoom.value) * (e.deltaY < 0 ? 1.08 : 0.93)));
      zoom.value = z;
      const r = cer.getBoundingClientRect();
      yakinlas(z, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    zoom.oninput = () => yakinlas(Number(zoom.value));
    kutu.querySelector('[data-vazgec]').onclick = () => bitir(null);
    kutu.querySelector('[data-oldugu]').onclick = () => bitir(dosya);
    kutu.querySelector('[data-kirp]').onclick = () => {
      const sw = fw / olcek; const sh = fh / olcek;
      const k = Math.min(1, 1600 / Math.max(sw, sh));
      const c = document.createElement('canvas');
      c.width = Math.round(sw * k);
      c.height = Math.round(sh * k);
      c.getContext('2d').drawImage(img, -x / olcek, -y / olcek, sw, sh, 0, 0, c.width, c.height);
      c.toBlob((b) => bitir(b ? new File([b], 'kirpilmis.jpg', { type: 'image/jpeg' }) : null), 'image/jpeg', 0.9);
    };
  });
}

// Videonun tarayıcıda açıldığını denetler ve kapağını (1. saniyeden kare) üretir
function videoKapagi(dosya) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(dosya);
    const hata = () => { URL.revokeObjectURL(url); reject(new Error('Bu video tarayıcıda açılamadı. Telefonda kaydederken “En Uyumlu” (H.264) biçimi seç ya da MP4 olarak dışa aktar.')); };
    const sure = setTimeout(hata, 20000);
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onerror = () => { clearTimeout(sure); hata(); };
    v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3); };
    v.onseeked = () => {
      clearTimeout(sure);
      if (!v.videoWidth) { hata(); return; }
      const k = Math.min(1, 1280 / v.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * k);
      c.height = Math.round(v.videoHeight * k);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(new File([b], 'kapak.jpg', { type: 'image/jpeg' })) : reject(new Error('Kapak üretilemedi.'))), 'image/jpeg', 0.85);
    };
    v.src = url;
  });
}

// İlerlemesi görünen yükleme (video büyük olabilir)
function ilerlemeliYukle(islem, dosya, ilerleme) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${API}?islem=${islem}`);
    x.setRequestHeader('X-Istek', '1');
    x.setRequestHeader('Accept', 'application/json');
    x.upload.onprogress = (e) => { if (e.lengthComputable) ilerleme(e.loaded / e.total); };
    x.onload = () => {
      let d = null;
      try { d = JSON.parse(x.responseText); } catch { /* boş */ }
      if (x.status === 401) reject(new Error('Oturum kapandı; sayfayı yenileyip tekrar giriş yap.'));
      else if (x.status === 413) reject(new Error(`Video en fazla ${VIDEO_EN_FAZLA_MB} MB olabilir.`));
      else if (!d?.ok) reject(new Error(d?.hata || 'Video yüklenemedi.'));
      else resolve(d.url);
    };
    x.onerror = () => reject(new Error('Bağlantı koptu, video yüklenemedi.'));
    const fd = new FormData();
    fd.append('dosya', dosya);
    x.send(fd);
  });
}

// Panelde kullanılan küçük simgeler (satır içi SVG; CSP yalnız betikleri kısıtlar)
const SIMGE = {
  sol: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  sag: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  sil: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  resim: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  video: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="M16 10l5-3v10l-5-3"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9l5 3-5 3z" class="dolu"/></svg>',
  instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="dolu"/></svg>',
  tut: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.3" class="dolu"/><circle cx="15" cy="6" r="1.3" class="dolu"/><circle cx="9" cy="12" r="1.3" class="dolu"/><circle cx="15" cy="12" r="1.3" class="dolu"/><circle cx="9" cy="18" r="1.3" class="dolu"/><circle cx="15" cy="18" r="1.3" class="dolu"/></svg>',
  oynat: '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" class="dolu"/></svg>',
  ara: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  geri: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/></svg>',
};
const simge = (ad) => `<span class="simge">${SIMGE[ad]}</span>`;
const ORAN_ADI = (o) => [[16 / 9, '16:9'], [4 / 3, '4:3'], [3 / 4, '3:4'], [4 / 5, '4:5'], [3 / 5, '3:5'], [9 / 14, '9:14'], [1, '1:1']].find(([d]) => Math.abs(d - o) < 0.01)?.[1] || o.toFixed(2);
const youtubeKimligi = (v) => v.match(/^[A-Za-z0-9_-]{11}$/)?.[0] || v.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || null;

// Değişiklik varken altta sabit kaydet çubuğu; kaydetmeden sekme değiştirme ya da sayfadan çıkma uyarır
let kaydedilmemis = false;
addEventListener('beforeunload', (e) => { if (kaydedilmemis) { e.preventDefault(); e.returnValue = ''; } });
function kaydetCubugu({ kaydet, vazgec }) {
  const cubuk = h(`
    <div class="kcubuk" hidden>
      <div class="kcubuk__ic">
        <span class="kcubuk__nokta"></span><span class="kcubuk__yazi">Kaydedilmemiş değişiklik var</span>
        <button type="button" class="btn btn--ghost" data-vazgec>Vazgeç</button>
        <button type="button" class="btn btn--primary" data-kaydet-cubuk>Kaydet</button>
      </div>
    </div>`);
  app.querySelector('.shell').append(cubuk);
  const yazi = cubuk.querySelector('.kcubuk__yazi');
  const btn = cubuk.querySelector('[data-kaydet-cubuk]');
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor…';
    try { await kaydet(); } finally { btn.disabled = false; btn.textContent = 'Kaydet'; }
  };
  cubuk.querySelector('[data-vazgec]').onclick = () => { if (confirm('Değişiklikler silinsin mi?')) { kaydedilmemis = false; vazgec(); } };
  return (mesaj) => {
    kaydedilmemis = Boolean(mesaj);
    cubuk.hidden = !mesaj;
    if (mesaj) yazi.textContent = mesaj;
  };
}
// Sekme değiştirirken kaydedilmemiş değişiklik uyarısı (kabuk() düğmeleri bunu çağırır)
function sekmeDegisebilir() {
  if (!kaydedilmemis) return true;
  if (!confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?')) return false;
  kaydedilmemis = false;
  return true;
}

// Sol menü: bölümler ve alanlar; tıklanınca alana kayar, kaydırdıkça bulunduğun yer işaretlenir
function yanMenuBagla(menu) {
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.getAttribute('href').slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const baglantilar = [...menu.querySelectorAll('a[href^="#"]')];
  const io = new IntersectionObserver((girdiler) => {
    girdiler.forEach((g) => {
      if (!g.isIntersecting) return;
      baglantilar.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === `#${g.target.id}`));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  baglantilar.forEach((a) => { const hedef = document.getElementById(a.getAttribute('href').slice(1)); if (hedef) io.observe(hedef); });
}

async function medyaEkrani() {
  kabuk('medya', '<main class="list list--wide"><p>Yükleniyor…</p></main>');
  const { alanlar, kayit, varsayilan, enFazla } = await api('medya');
  const durum = {};
  const degisti = new Set();
  const sifirla = new Set();
  alanlar.forEach((a) => {
    durum[a.ad] = structuredClone(kayit[a.ad] ?? varsayilan[a.ad] ?? []);
    // Eski kayıtlarda YouTube linki tam adres olabilir: kimliğe çevrilir
    durum[a.ad].forEach((o) => { if (o.tip === 'youtube') o.src = youtubeKimligi(o.src) || o.src; });
  });
  const bolumler = [...new Set(alanlar.map((a) => a.bolum))];
  const bolumId = (b) => `b-${slugYap(b)}`;
  kabuk('medya', `
    <div class="duzen">
      <aside class="yan">
        <nav class="yan__menu" aria-label="Medya alanları">
          ${bolumler.map((b) => `<a href="#${bolumId(b)}" class="yan__bolum">${esc(b)}</a>${alanlar.filter((a) => a.bolum === b).map((a) => `
            <a href="#alan-${a.ad}" class="yan__alan" data-yan="${a.ad}"><span>${esc(a.baslik.replace(/\s*\(.*\)$/, ''))}</span><b data-yan-sayi></b></a>`).join('')}`).join('')}
        </nav>
      </aside>
      <main class="duzen__govde">
        <div class="list__head">
          <div><h1>Medya</h1><span class="muted">Ana sayfadaki fotoğraf ve videolar. Bir alana birden fazla öğe eklersen sitede kendiliğinden kayan galeri olur (fare üstündeyken durur).</span></div>
          <a class="btn btn--ghost" href="/" target="_blank">Siteyi aç</a>
        </div>
        <div class="bilgi-seridi">
          <span>${simge('resim')}<b>Fotoğraf</b> JPG, PNG, WEBP · 12 MB · alanın oranında kırpılır</span>
          <span>${simge('video')}<b>Video</b> MP4, WebM · ${VIDEO_EN_FAZLA_MB} MB · sitede sessiz oynar</span>
          <span>${simge('youtube')}<b>YouTube</b> video ya da Shorts linki</span>
          <span>${simge('instagram')}<b>Instagram</b> gönderi ya da reels linki</span>
        </div>
        ${bolumler.map((b) => `
          <h2 class="medya-bolum" id="${bolumId(b)}">${esc(b)}</h2>
          ${alanlar.filter((a) => a.bolum === b).map((a) => `
            <section class="panel malan" id="alan-${a.ad}" data-alan="${a.ad}">
              <div class="malan__ust">
                <div>
                  <h3>${esc(a.baslik)}</h3>
                  <div class="malan__bilgi"><span class="cip" data-durum></span><span class="cip cip--soluk">Oran ${ORAN_ADI(a.oran)}</span><span class="muted" data-sayi></span></div>
                </div>
                <button type="button" class="baglanti" data-varsayilan>${simge('geri')} Varsayılana dön</button>
              </div>
              <div class="mliste" style="--oran:${a.oran}"></div>
              <div class="mlink" hidden>
                <span class="mlink__simge"></span>
                <input data-link-giris>
                <button type="button" class="btn btn--primary btn--sm" data-link-ekle>Ekle</button>
                <button type="button" class="btn btn--ghost btn--sm" data-link-vazgec>Vazgeç</button>
              </div>
              <div class="mdurum" hidden><span></span><i><b></b></i></div>
            </section>`).join('')}`).join('')}
      </main>
    </div>`);
  yanMenuBagla(app.querySelector('.yan__menu'));
  const cubukGoster = kaydetCubugu({ kaydet: kaydetHepsi, vazgec: () => medyaEkrani() });
  const isaretle = (ad) => {
    degisti.add(ad);
    cubukGoster(`${degisti.size} alanda kaydedilmemiş değişiklik var`);
  };

  alanlar.forEach((a) => {
    const el = app.querySelector(`.malan[data-alan="${a.ad}"]`);
    const liste = el.querySelector('.mliste');
    const linkKutu = el.querySelector('.mlink');
    const linkGiris = el.querySelector('[data-link-giris]');
    const durumKutu = el.querySelector('.mdurum');
    const yanSayi = app.querySelector(`[data-yan="${a.ad}"] [data-yan-sayi]`);
    let linkTipi = null;
    let surukle = null;
    const onizleme = (o) => {
      const kapak = o.kapak || (o.tip === 'gorsel' ? o.src : o.tip === 'youtube' ? `https://i.ytimg.com/vi/${youtubeKimligi(o.src)}/hqdefault.jpg` : '');
      if (kapak) return `<img src="${esc(kapak)}" alt="" loading="lazy">`;
      if (o.tip === 'video') return `<video src="${esc(o.src)}" muted preload="metadata"></video>`;
      return `<span class="moge__bos">${simge('instagram')}</span>`;
    };
    const ciz = () => {
      const ogeler = durum[a.ad];
      const dolu = ogeler.length >= enFazla;
      liste.innerHTML = ogeler.map((o, i) => `
        <div class="moge" data-i="${i}" draggable="true">
          <div class="moge__on">
            ${onizleme(o)}
            ${o.tip !== 'gorsel' ? `<span class="moge__oynat">${simge('oynat')}</span>` : ''}
            <span class="moge__tip moge__tip--${o.tip}">${simge(o.tip === 'gorsel' ? 'resim' : o.tip)}${MEDYA_TIP_ADI[o.tip]}</span>
            ${ogeler.length > 1 ? `<span class="moge__no">${i + 1}</span>` : ''}
            <div class="moge__araclar">
              ${ogeler.length > 1 ? `<span class="moge__tut" title="Sürükleyerek sırala">${simge('tut')}</span>` : ''}
              <button type="button" data-sola title="Öne al" ${i === 0 ? 'disabled' : ''}>${simge('sol')}</button>
              <button type="button" data-saga title="Sona al" ${i === ogeler.length - 1 ? 'disabled' : ''}>${simge('sag')}</button>
              ${o.tip !== 'gorsel' ? `<button type="button" data-kapak title="Kapak görseli seç">${simge('resim')}</button>` : ''}
              <button type="button" data-sil class="sil" title="Kaldır">${simge('sil')}</button>
            </div>
          </div>
          <input data-baslik maxlength="90" placeholder="${a.liste ? 'Kart başlığı' : 'Başlık (isteğe bağlı)'}" value="${esc(o.baslik || '')}">
        </div>`).join('') + `
        <div class="mekle${dolu ? ' is-dolu' : ''}">
          ${dolu ? `<span class="muted">En fazla ${enFazla} öğe</span>` : `
          <span class="mekle__baslik">${ogeler.length ? 'Öğe ekle' : 'Bu alan boş, sitede görünmez. Ekle:'}</span>
          <div class="mekle__secenek">
            <button type="button" data-ekle="gorsel">${simge('resim')}Fotoğraf</button>
            <button type="button" data-ekle="video">${simge('video')}Video</button>
            <button type="button" data-ekle="youtube">${simge('youtube')}YouTube</button>
            <button type="button" data-ekle="instagram">${simge('instagram')}Instagram</button>
          </div>`}
        </div>`;
      const varsayilanda = (!kayit[a.ad] && !degisti.has(a.ad)) || sifirla.has(a.ad);
      const cip = el.querySelector('[data-durum]');
      cip.textContent = varsayilanda ? 'Varsayılan' : 'Özel';
      cip.classList.toggle('cip--ozel', !varsayilanda);
      el.querySelector('[data-sayi]').textContent = `${ogeler.length} öğe${!a.liste && ogeler.length > 1 ? ' · kayan galeri' : ''}`;
      el.querySelector('[data-varsayilan]').hidden = varsayilanda;
      el.classList.toggle('is-degisti', degisti.has(a.ad));
      yanSayi.textContent = ogeler.length || '–';
      app.querySelector(`[data-yan="${a.ad}"]`).classList.toggle('is-degisti', degisti.has(a.ad));
    };
    ciz();
    const degis = () => { sifirla.delete(a.ad); isaretle(a.ad); ciz(); };
    liste.addEventListener('input', (e) => {
      const kart = e.target.closest('.moge');
      if (!kart || !e.target.matches('[data-baslik]')) return;
      durum[a.ad][kart.dataset.i].baslik = e.target.value;
      sifirla.delete(a.ad);
      isaretle(a.ad);
      el.classList.add('is-degisti');
    });
    // Sürükle bırak ile sıralama
    liste.addEventListener('dragstart', (e) => {
      const kart = e.target.closest('.moge');
      if (!kart || e.target.matches('input')) return;
      surukle = Number(kart.dataset.i);
      kart.classList.add('is-surukleniyor');
      e.dataTransfer.effectAllowed = 'move';
    });
    liste.addEventListener('dragover', (e) => {
      const kart = e.target.closest('.moge');
      if (surukle === null || !kart) return;
      e.preventDefault();
      liste.querySelectorAll('.is-hedef').forEach((k) => k.classList.remove('is-hedef'));
      if (Number(kart.dataset.i) !== surukle) kart.classList.add('is-hedef');
    });
    liste.addEventListener('drop', (e) => {
      const kart = e.target.closest('.moge');
      if (surukle === null || !kart) return;
      e.preventDefault();
      const hedef = Number(kart.dataset.i);
      if (hedef !== surukle) { const [o] = durum[a.ad].splice(surukle, 1); durum[a.ad].splice(hedef, 0, o); degis(); }
    });
    liste.addEventListener('dragend', () => { surukle = null; liste.querySelectorAll('.is-surukleniyor, .is-hedef').forEach((k) => k.classList.remove('is-surukleniyor', 'is-hedef')); });

    const ilerlemeGoster = (yazi, oran = null) => {
      durumKutu.hidden = yazi === null;
      if (yazi === null) return;
      durumKutu.querySelector('span').textContent = yazi;
      durumKutu.querySelector('b').style.width = oran === null ? '100%' : `${Math.round(oran * 100)}%`;
      durumKutu.classList.toggle('is-belirsiz', oran === null);
    };
    const ekle = async (tip) => {
      if (tip === 'youtube' || tip === 'instagram') {
        linkTipi = tip;
        el.querySelector('.mlink__simge').innerHTML = simge(tip);
        linkGiris.placeholder = tip === 'youtube' ? 'YouTube linkini yapıştır (youtube.com/watch?v=…, youtu.be/…, shorts/…)' : 'Instagram linkini yapıştır (instagram.com/reel/… ya da /p/…)';
        linkGiris.value = '';
        linkKutu.hidden = false;
        linkGiris.focus();
        return;
      }
      if (tip === 'gorsel') {
        const f = await dosyaSec();
        if (!f) return;
        const kirpik = await kirp(f, a.oran);
        if (!kirpik) return;
        ilerlemeGoster('Fotoğraf yükleniyor…');
        try { durum[a.ad].push({ tip, src: await gorselYukle(kirpik), kapak: '', baslik: '' }); degis(); } catch (ex) { bildir(ex.message, 'err'); }
        ilerlemeGoster(null);
        return;
      }
      const f = await dosyaSec('video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm');
      if (!f) return;
      if (f.size > VIDEO_EN_FAZLA_MB * 1024 * 1024) { bildir(`Video en fazla ${VIDEO_EN_FAZLA_MB} MB olabilir (bu ${Math.round(f.size / 1048576)} MB).`, 'err'); return; }
      try {
        ilerlemeGoster('Video denetleniyor…');
        const kapakDosya = await videoKapagi(f);
        const src = await ilerlemeliYukle('video-yukle', f, (o) => ilerlemeGoster(`Video yükleniyor… %${Math.round(o * 100)}`, o));
        ilerlemeGoster('Kapak hazırlanıyor…');
        const kapak = await gorselYukle(kapakDosya);
        durum[a.ad].push({ tip: 'video', src, kapak, baslik: '' });
        degis();
      } catch (ex) { bildir(ex.message, 'err'); }
      ilerlemeGoster(null);
    };
    liste.addEventListener('click', async (e) => {
      const ekleBtn = e.target.closest('[data-ekle]');
      if (ekleBtn) { ekle(ekleBtn.dataset.ekle); return; }
      const kart = e.target.closest('.moge');
      if (!kart) return;
      const i = Number(kart.dataset.i);
      const ogeler = durum[a.ad];
      if (e.target.closest('[data-sil]')) {
        if (ogeler.length === 1 && !confirm('Alandaki son öğe kaldırılsın mı? Alan sitede görünmez olur.')) return;
        ogeler.splice(i, 1); degis();
      } else if (e.target.closest('[data-sola]') && i > 0) { [ogeler[i - 1], ogeler[i]] = [ogeler[i], ogeler[i - 1]]; degis(); }
      else if (e.target.closest('[data-saga]') && i < ogeler.length - 1) { [ogeler[i + 1], ogeler[i]] = [ogeler[i], ogeler[i + 1]]; degis(); }
      else if (e.target.closest('[data-kapak]')) {
        const f = await dosyaSec();
        if (!f) return;
        const kirpik = await kirp(f, a.oran);
        if (!kirpik) return;
        try { ogeler[i].kapak = await gorselYukle(kirpik); degis(); } catch (ex) { bildir(ex.message, 'err'); }
      }
    });
    const linkEkle = () => {
      const v = linkGiris.value.trim();
      const id = linkTipi === 'youtube' ? youtubeKimligi(v) : null;
      if (linkTipi === 'youtube' ? !id : !INSTA_RE.test(v)) { bildir(linkTipi === 'youtube' ? 'YouTube video linki tanınmadı.' : 'Instagram gönderi ya da reels linki tanınmadı.', 'err'); return; }
      durum[a.ad].push({ tip: linkTipi, src: id || v, kapak: '', baslik: '' });
      linkKutu.hidden = true;
      degis();
    };
    el.querySelector('[data-link-ekle]').onclick = linkEkle;
    linkGiris.addEventListener('keydown', (e) => { if (e.key === 'Enter') linkEkle(); if (e.key === 'Escape') linkKutu.hidden = true; });
    el.querySelector('[data-link-vazgec]').onclick = () => { linkKutu.hidden = true; };
    el.querySelector('[data-varsayilan]').onclick = () => {
      durum[a.ad] = structuredClone(varsayilan[a.ad] ?? []);
      sifirla.add(a.ad);
      isaretle(a.ad);
      ciz();
    };
  });

  async function kaydetHepsi() {
    const medya = {};
    degisti.forEach((ad) => { medya[ad] = sifirla.has(ad) ? null : durum[ad]; });
    try {
      await api('medya', { method: 'POST', body: { medya } });
      cubukGoster(null);
      bildir('Kaydedildi. Ana sayfada hemen görünür.');
      const y = scrollY;
      await medyaEkrani();
      scrollTo(0, y);
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  }
}

/* ---------- Sayfa yazıları ve sık sorulan sorular ---------- */
const YAZI_BOLUMLERI = {
  sahne: 'Açılış ve 3D sürüş sahnesi', serit: 'Öne çıkanlar şeridi', vr: 'Sanal Sürüş Alanı', sinav: 'Direksiyon sınavı',
  siniflar: 'Ehliyet sınıfları', kurum: 'Kurumumuz', surec: 'Ehliyete giden yol', belgeler: 'Kayıt belgeleri', videolar: 'Videolar',
  blog: 'Blog bölümü', yorumlar: 'Google yorumları', randevu: 'Randevu', sss: 'SSS bölüm başlığı', iletisim: 'İletişim',
};
function yaziEtiketi(a) {
  if (a.sinif.includes('eyebrow')) return 'Üst etiket';
  if (a.sinif.includes('card__badge') || a.sinif.includes('tek')) return 'Rozet';
  if (a.sinif.includes('panel__step')) return 'Adım etiketi';
  return { h1: 'Ana başlık', h2: 'Başlık', h3: 'Alt başlık', p: 'Açıklama', li: 'Madde', strong: 'Kalın yazı', small: 'Küçük yazı', em: 'Etiket', span: 'Düğme / rozet yazısı' }[a.etiket] || 'Yazı';
}
const sadeAra = (t) => t.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

async function metinlerEkrani() {
  kabuk('metinler', '<main class="list list--wide"><p>Yükleniyor…</p></main>');
  const { alanlar, kayit, sss, sssVarsayilan, sssSinir } = await api('metinler');
  const gruplar = [...new Set(alanlar.map((a) => a.anahtar.split('.')[0]))];
  kabuk('metinler', `
    <div class="duzen">
      <aside class="yan">
        <nav class="yan__menu" aria-label="Sayfa bölümleri">
          <a href="#y-sorular" class="yan__bolum">Sık sorulan sorular</a>
          <span class="yan__ayrac">Sayfa bölümleri</span>
          ${gruplar.map((g) => `<a href="#y-${g}" class="yan__alan" data-yan="${g}"><span>${esc(YAZI_BOLUMLERI[g] || g)}</span><b data-yan-sayi></b></a>`).join('')}
        </nav>
      </aside>
      <main class="duzen__govde">
        <div class="list__head">
          <div><h1>Sayfa yazıları</h1><span class="muted">Ana sayfadaki başlık, açıklama, madde ve düğme yazıları. Her alanın en fazla karakteri, tasarım bozulmasın diye sınırlı.</span></div>
          <a class="btn btn--ghost" href="/" target="_blank">Siteyi aç</a>
        </div>
        <label class="arama">${simge('ara')}<input type="search" data-ara placeholder="Yazılarda ara (ör. “ücretsiz”, “B sınıfı”)"><span class="muted" data-ara-sonuc></span></label>
        <div class="bilgi-seridi bilgi-seridi--yazi">
          <span><b>*kelime*</b> başlıkta kırmızı altı çizili vurgu</span>
          <span><b>Enter</b> çok satırlı alanlarda alt satır</span>
          <span>${simge('geri')}<b>Varsayılan</b> ilk yazıya döner</span>
        </div>
        <section class="panel ygrup" id="y-sorular">
          <div class="ygrup__ust">
            <div><h2>Sık sorulan sorular</h2><span class="muted">Sayfada ve Google'a verilen SSS bilgisinde aynen görünür · en fazla ${sssSinir.adet} soru · sürükleyerek sırala</span></div>
            <span class="ygrup__btn"><button type="button" class="baglanti" data-sss-varsayilan ${sssVarsayilan ? 'hidden' : ''}>${simge('geri')} Varsayılan sorular</button>
            <button type="button" class="btn btn--primary btn--sm" data-sss-ekle>+ Soru ekle</button></span>
          </div>
          <div class="sss-liste" data-sss></div>
        </section>
        ${gruplar.map((g) => `
          <section class="panel ygrup" id="y-${g}" data-grup="${g}">
            <div class="ygrup__ust"><div><h2>${esc(YAZI_BOLUMLERI[g] || g)}</h2><span class="muted" data-grup-sayi></span></div></div>
            <div class="yalanlar">
            ${alanlar.filter((a) => a.anahtar.startsWith(`${g}.`)).map((a) => `
              <div class="yalan${a.cok_satir ? ' yalan--genis' : ''}" data-anahtar="${a.anahtar}">
                <div class="yalan__ust"><b>${yaziEtiketi(a)}</b>${a.vurgu ? '<span class="cip cip--soluk">*vurgu*</span>' : ''}<span class="yalan__sayac" data-sayac></span><button type="button" class="baglanti" data-varsayilan hidden title="İlk yazıya dön">${simge('geri')}</button></div>
                ${a.cok_satir ? `<textarea rows="${Math.min(5, Math.ceil(a.en_fazla / 110) + 1)}" maxlength="${a.en_fazla}"></textarea>` : `<input maxlength="${a.en_fazla}">`}
              </div>`).join('')}
            </div>
          </section>`).join('')}
        <p class="muted ara-bos" hidden>Aramaya uyan yazı yok.</p>
      </main>
    </div>`);
  yanMenuBagla(app.querySelector('.yan__menu'));
  const cubukGoster = kaydetCubugu({ kaydet: kaydetHepsi, vazgec: () => metinlerEkrani() });
  let sssDegisti = false;
  const alanHaritasi = Object.fromEntries(alanlar.map((a) => [a.anahtar, a]));
  const ozet = () => {
    let n = 0;
    gruplar.forEach((g) => {
      const kutu = app.querySelector(`[data-grup="${g}"]`);
      const toplam = kutu.querySelectorAll('.yalan').length;
      const degisen = kutu.querySelectorAll('.yalan.is-degisti').length;
      n += kutu.querySelectorAll('.yalan.is-kirli').length;
      kutu.querySelector('[data-grup-sayi]').textContent = `${toplam} yazı${degisen ? ` · ${degisen} değiştirilmiş` : ''}`;
      app.querySelector(`[data-yan="${g}"] [data-yan-sayi]`).textContent = degisen || '';
    });
    const parcalar = [n ? `${n} yazıda` : '', sssDegisti ? 'SSS\'de' : ''].filter(Boolean);
    cubukGoster(parcalar.length ? `${parcalar.join(' ve ')} kaydedilmemiş değişiklik var` : null);
  };
  app.querySelectorAll('.yalan').forEach((el) => {
    const a = alanHaritasi[el.dataset.anahtar];
    const giris = el.querySelector('input, textarea');
    const sayac = el.querySelector('[data-sayac]');
    const sifirBtn = el.querySelector('[data-varsayilan]');
    const ilk = kayit[a.anahtar] ?? a.varsayilan;
    giris.placeholder = a.varsayilan;
    giris.value = ilk;
    const guncelle = () => {
      const n = giris.value.replace(/\*/g, '').length;
      sayac.textContent = `${n}/${a.en_fazla}`;
      sayac.classList.toggle('is-sinirda', n > a.en_fazla * 0.9);
      const deger = giris.value.trim();
      sifirBtn.hidden = deger === a.varsayilan || deger === '';
      el.classList.toggle('is-degisti', !sifirBtn.hidden);
      el.classList.toggle('is-kirli', deger !== ilk.trim());
    };
    guncelle();
    giris.addEventListener('input', () => { guncelle(); ozet(); });
    sifirBtn.onclick = () => { giris.value = a.varsayilan; guncelle(); ozet(); };
  });

  // Arama: yazının kendisinde, varsayılanında ya da etiketinde geçen alanlar kalır
  const araKutu = app.querySelector('[data-ara]');
  araKutu.addEventListener('input', () => {
    const q = sadeAra(araKutu.value.trim());
    let bulunan = 0;
    app.querySelectorAll('.yalan').forEach((el) => {
      const a = alanHaritasi[el.dataset.anahtar];
      const uyar = !q || sadeAra(`${el.querySelector('input, textarea').value} ${a.varsayilan} ${yaziEtiketi(a)}`).includes(q);
      el.hidden = !uyar;
      if (uyar) bulunan++;
    });
    app.querySelectorAll('[data-grup]').forEach((g) => { g.hidden = Boolean(q) && !g.querySelector('.yalan:not([hidden])'); });
    app.querySelector("#y-sorular").hidden = Boolean(q);
    app.querySelector('[data-ara-sonuc]').textContent = q ? `${bulunan} yazı` : '';
    app.querySelector('.ara-bos').hidden = !q || bulunan > 0;
  });

  const sssKutu = app.querySelector('[data-sss]');
  const numarala = () => [...sssKutu.children].forEach((el, i) => { el.querySelector('.sss-oge__no').textContent = i + 1; });
  const sssDegis = () => { sssDegisti = true; numarala(); ozet(); };
  let suruklenen = null;
  const sssSatir = (q = { soru: '', cevap: '' }) => {
    const el = h(`
      <div class="sss-oge" draggable="true">
        <span class="sss-oge__tut" title="Sürükleyerek sırala">${simge('tut')}<b class="sss-oge__no"></b></span>
        <div class="sss-oge__alan">
          <input data-soru maxlength="${sssSinir.soru}" placeholder="Soru">
          <textarea data-cevap rows="3" maxlength="${sssSinir.cevap}" placeholder="Cevap"></textarea>
        </div>
        <div class="sss-oge__btn">
          <button type="button" data-yukari title="Yukarı">${simge('sol')}</button>
          <button type="button" data-asagi title="Aşağı">${simge('sag')}</button>
          <button type="button" data-sil class="sil" title="Sil">${simge('sil')}</button>
        </div>
      </div>`);
    el.querySelector('[data-soru]').value = q.soru;
    el.querySelector('[data-cevap]').value = q.cevap;
    el.querySelector('[data-sil]').onclick = () => { if (confirm('Bu soru silinsin mi?')) { el.remove(); sssDegis(); } };
    el.querySelector('[data-yukari]').onclick = () => { if (el.previousElementSibling) { sssKutu.insertBefore(el, el.previousElementSibling); sssDegis(); } };
    el.querySelector('[data-asagi]').onclick = () => { if (el.nextElementSibling) { sssKutu.insertBefore(el.nextElementSibling, el); sssDegis(); } };
    el.addEventListener('input', sssDegis);
    el.addEventListener('dragstart', (e) => { if (e.target.matches('input, textarea')) { e.preventDefault(); return; } suruklenen = el; el.classList.add('is-surukleniyor'); });
    el.addEventListener('dragend', () => { suruklenen = null; el.classList.remove('is-surukleniyor'); });
    el.addEventListener('dragover', (e) => {
      if (!suruklenen || suruklenen === el) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      sssKutu.insertBefore(suruklenen, e.clientY > r.top + r.height / 2 ? el.nextElementSibling : el);
    });
    el.addEventListener('drop', (e) => { e.preventDefault(); sssDegis(); });
    sssKutu.appendChild(el);
    return el;
  };
  sss.forEach((q) => sssSatir(q));
  numarala();
  app.querySelector('[data-sss-ekle]').onclick = () => {
    if (sssKutu.children.length >= sssSinir.adet) { bildir(`En fazla ${sssSinir.adet} soru eklenebilir.`, 'err'); return; }
    const el = sssSatir();
    sssDegis();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('[data-soru]').focus();
  };
  function degisenMetinler() {
    const m = {};
    app.querySelectorAll('.yalan').forEach((el) => {
      const a = alanHaritasi[el.dataset.anahtar];
      const v = el.querySelector('input, textarea').value.trim();
      if (v && v !== a.varsayilan) m[a.anahtar] = v;
    });
    return m;
  }
  app.querySelector('[data-sss-varsayilan]').onclick = async () => {
    if (!confirm('Sorular ilk hâline dönsün mü? Eklediğin sorular silinir.')) return;
    try { await api('metinler', { method: 'POST', body: { metinler: degisenMetinler(), sss: null } }); kaydedilmemis = false; bildir('Varsayılan sorulara dönüldü.'); metinlerEkrani(); } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  };
  async function kaydetHepsi() {
    const sorular = [...sssKutu.children].map((el) => ({ soru: el.querySelector('[data-soru]').value.trim(), cevap: el.querySelector('[data-cevap]').value.trim() }))
      .filter((q) => q.soru || q.cevap);
    try {
      await api('metinler', { method: 'POST', body: { metinler: degisenMetinler(), sss: sorular } });
      cubukGoster(null);
      bildir('Kaydedildi. Ana sayfada hemen görünür.');
      const y = scrollY;
      await metinlerEkrani();
      scrollTo(0, y);
    } catch (ex) {
      if (ex.message === 'oturum') return;
      bildir(ex.message, 'err');
      // Hatalı alanı göster
      const bas = ex.message.match(/^“(.+?)…”/)?.[1];
      const hedef = bas && [...app.querySelectorAll('.yalan')].find((el) => alanHaritasi[el.dataset.anahtar].varsayilan.startsWith(bas));
      if (hedef) { hedef.classList.add('is-hata'); hedef.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => hedef.classList.remove('is-hata'), 4000); }
    }
  }
  ozet();
}

/* ---------- Kullanım: panelin anlatıldığı video (yalnız girişli kullanıcıya verilir) ---------- */
const KULLANIM_BOLUMLERI = [
  [3, 'Giriş', 'Panele giriş, şifre güvenliği'], [24, 'Menü', 'Sekmeler arasında gezinme'],
  [36, 'Özet', 'Ziyaretçi sayıları, nereden gelindiği, randevular'], [87, 'Yazılar', 'Blog yazısı ekleme, düzenleme, SEO, yayınlama'],
  [207, 'Randevular', 'Randevuları görme, ekleme, silme, saat ayarları'], [244, 'Yorumlar', 'Google yorumlarını gösterme, gizleme, sıralama'],
  [270, 'Medya', 'Fotoğraf, video, YouTube ve Instagram ekleme, kırpma, galeri'], [351, 'Sayfa yazıları', 'Ana sayfa yazıları ve sık sorulan sorular'],
  [423, 'Site içeriği', 'İletişim bilgileri, duyuru bandı, KURSUM-APP'],
];
async function kullanimEkrani() {
  kabuk('kullanim', '<main class="list list--wide"><p>Yükleniyor…</p></main>');
  const { video } = await api('kullanim');
  const sure = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  kabuk('kullanim', `
    <main class="list list--wide">
      <div class="list__head"><div><h1>Kullanım</h1><span class="muted">Panelin her bölümünü anlatan sesli ve altyazılı video (yaklaşık 8 dakika). Bir bölüme tıklayınca video oradan başlar.</span></div></div>
      ${video ? `<div class="kullanim__video"><video controls preload="metadata" playsinline src="${API}?islem=kullanim-video"></video></div>` : '<section class="panel"><p class="muted">Kullanım videosu henüz yüklenmedi.</p></section>'}
      <section class="panel">
        <h2>Bölümler</h2>
        <ol class="kullanim__liste">${KULLANIM_BOLUMLERI.map(([t, ad, aciklama]) => `
          <li><button type="button" data-zaman="${t}" ${video ? '' : 'disabled'}><b>${sure(t)}</b><span><strong>${ad}</strong><small>${aciklama}</small></span></button></li>`).join('')}
        </ol>
      </section>
      <section class="panel"><p class="muted">Takıldığınız bir yer olursa geliştiriciyle iletişime geçin. Panelin adresini ve şifrenizi kimseyle paylaşmayın.</p></section>
    </main>`);
  const v = app.querySelector('.kullanim__video video');
  // Sekmeye tıklanınca video kendiliğinden başlar (tıklama kullanıcı hareketi sayıldığı için sesli oynar)
  v?.play().catch(() => {});
  app.querySelectorAll('[data-zaman]').forEach((b) => {
    b.onclick = () => {
      if (!v) return;
      v.currentTime = Number(b.dataset.zaman);
      v.play().catch(() => {});
      v.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  });
}

/* ---------- Özet (gösterge paneli) ---------- */
const DONEMLER = [[1, 'Bugün'], [7, 'Son 7 gün'], [30, 'Son 30 gün'], [0, 'Tüm zamanlar']];
const BLOG_SIRALARI = [
  ['cok', 'En çok okunan', (a, b) => b.donem.toplam - a.donem.toplam || b.tum.toplam - a.tum.toplam],
  ['az', 'En az okunan', (a, b) => a.donem.toplam - b.donem.toplam || a.tum.toplam - b.tum.toplam],
  ['yeni', 'En yeni yazı', (a, b) => String(b.yayinIso).localeCompare(String(a.yayinIso))],
  ['eski', 'En eski yazı', (a, b) => String(a.yayinIso).localeCompare(String(b.yayinIso))],
  ['tum', 'Tüm zamanlarda en çok', (a, b) => b.tum.toplam - a.tum.toplam],
];
let blogSirasi = 'cok';
let ozetDonemi = 30;
const sayi = (n) => Number(n || 0).toLocaleString('tr-TR');
const tarihYaz = (iso, saatli = false) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', ...(saatli ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short' }) });

// Yatay çubuklar: kaynaklar, cihazlar
function cubuklar(liste) {
  const enCok = Math.max(1, ...liste.map((x) => x.tekil));
  const dolu = liste.filter((x) => x.tekil);
  if (!dolu.length) return '<p class="muted">Bu dönemde henüz veri yok.</p>';
  return `<ul class="hbar">${dolu.map((x) => `<li><span>${esc(x.etiket)}</span><b style="--w:${(x.tekil / enCok) * 100}%"></b><strong>${sayi(x.tekil)}</strong></li>`).join('')}</ul>`;
}

async function ozetEkrani(gun = ozetDonemi) {
  ozetDonemi = gun;
  kabuk('ozet', '<main class="list list--wide"><p>Yükleniyor…</p></main>');
  const d = await api('istatistik', { params: `&gun=${gun}` });
  const donemAdi = DONEMLER.find(([g]) => g === gun)[1].toLocaleLowerCase('tr');
  const olay = Object.fromEntries(d.olaylar.map((o) => [o.ad, o]));
  const kart = (baslik, v, alt = '') => `<div class="stat"><span>${baslik}</span><strong>${sayi(v)}</strong>${alt ? `<small>${alt}</small>` : ''}</div>`;
  const enCok = Math.max(1, ...d.gunluk.map((g) => g.toplam));
  const turAdi = { giris: 'Giriş', 'yeni-cihaz': 'Yeni cihazdan giriş', kilit: 'Panel kilitlendi (çok sayıda hatalı deneme)' };
  const randevuTur = { vr: 'Ücretsiz sanal sürüş', bilgi: 'Kayıt / bilgi' };
  const yapilan = d.olaylar.filter((o) => o.toplam).sort((a, b) => b.tekil - a.tekil || b.toplam - a.toplam);
  const yapilmayan = d.olaylar.filter((o) => !o.toplam);
  kabuk('ozet', `
    <main class="list list--wide">
      <div class="list__head">
        <h1>Özet</h1>
        <div class="donem" role="group" aria-label="Dönem">${DONEMLER.map(([g, ad]) => `<button type="button" data-gun="${g}" class="${g === gun ? 'is-on' : ''}">${ad}</button>`).join('')}</div>
      </div>
      <div class="stats">
        ${kart('Tekil ziyaretçi', d.ziyaret.tekil, `${sayi(d.ziyaret.toplam)} sayfa görüntüleme`)}
        ${kart('Randevu talebi', d.randevu.donem, donemAdi)}
        ${kart('Yaklaşan randevu', d.randevu.yaklasanSayi, 'bugün ve sonrası')}
        ${kart('Sınav simülasyonu', olay['olay:sinav-basladi'].tekil, `kişi başladı · ${sayi(olay['olay:sinav-bitti'].tekil)} bitirdi · ${sayi(olay['olay:sinav-gecti'].tekil)} geçti`)}
      </div>
      <section class="panel">
        <h2>Günlük ziyaret <small class="muted">son ${d.gunluk.length} gün</small></h2>
        <div class="bars">${d.gunluk.map((g) => `<div class="bar" title="${tarihYaz(g.gun)}: ${g.toplam} görüntüleme, ${g.tekil} tekil ziyaretçi"><span style="height:${(g.toplam / enCok) * 100}%"></span><i style="height:${(g.tekil / enCok) * 100}%"></i></div>`).join('')}</div>
        <p class="muted legend"><b class="lg lg--t"></b> sayfa görüntüleme <b class="lg lg--u"></b> tekil ziyaretçi</p>
      </section>
      <div class="grid2">
        <section class="panel">
          <h2>Ziyaretçiler nereden geldi?</h2>
          ${cubuklar(d.kaynaklar)}
          <details class="utm">
            <summary>Kendi paylaştığın bağlantıyı takip et</summary>
            <p class="muted">Instagram biyografisi, WhatsApp durumu, broşürdeki QR kod gibi yerlerde paylaşacağın bağlantıya bir ad ver; o bağlantıdan gelenler burada o adla ayrı görünür. ChatGPT'den gelenler kendiliğinden “ChatGPT” olarak sayılır.</p>
            <div class="utm__satir">
              <input data-utm-ad maxlength="30" placeholder="örn. instagram-bio, brosur, whatsapp-durum">
              <select data-utm-sayfa><option value="/">Ana sayfa</option><option value="/#randevu">Randevu formu</option><option value="/sinav-deneyimi/">Sınav simülasyonu</option><option value="/blog/">Blog</option></select>
            </div>
            <div class="utm__sonuc" hidden><code data-utm-link></code><button type="button" class="btn btn--primary btn--sm" data-utm-kopyala>Kopyala</button></div>
          </details>
        </section>
        <section class="panel"><h2>Hangi cihazla?</h2>${cubuklar(d.cihazlar)}</section>
      </div>
      <section class="panel">
        <h2>Ziyaretçiler ne yaptı?</h2>
        <ul class="etkiler">${yapilan.map((o) => `<li><span>${esc(o.etiket)}</span><strong>${sayi(o.tekil)}</strong><small>kişi · toplam ${sayi(o.toplam)} kez</small></li>`).join('') || '<li class="muted">Bu dönemde henüz etkileşim yok.</li>'}</ul>
        ${yapilmayan.length ? `<p class="muted etkiler__bos">Bu dönemde kimse yapmadı: ${yapilmayan.map((o) => esc(o.etiket)).join(', ')}</p>` : ''}
      </section>
      <section class="panel">
        <h2>Yapay zekâ ve arama botları siteyi okudu <small class="muted">${donemAdi}</small></h2>
        <p class="muted">ChatGPT, Claude, Perplexity gibi asistanlar bir soruyu cevaplarken sitenizi açtığında burada sayılır. “Kullanıcının sorusu için” satırları, birinin yapay zekâya sorduğu soruda sitenizin kaynak olarak okunduğunu gösterir.</p>
        ${d.yzBotlari.some((b) => b.toplam) ? `<ul class="hbar">${d.yzBotlari.filter((b) => b.toplam).map((b) => `<li><span>${esc(b.etiket)}</span><b style="--w:${(b.toplam / Math.max(...d.yzBotlari.map((x) => x.toplam))) * 100}%"></b><strong>${sayi(b.toplam)}</strong></li>`).join('')}</ul>` : '<p class="muted">Bu dönemde henüz kayıt yok.</p>'}
        ${d.yzSayfalar.length ? `<h3 class="alt-baslik">Yapay zekânın kullanıcı sorusu için açtığı sayfalar</h3><ul class="kisa">${d.yzSayfalar.map((s) => `<li><b><a href="${esc(s.yol)}" target="_blank">${esc(s.yol)}</a></b><small>${sayi(s.toplam)} kez</small></li>`).join('')}</ul>` : ''}
      </section>
      <section class="panel">
        <h2>Sayfalar</h2>
        <table class="tbl tbl--sayi">
          <thead><tr><th>Sayfa</th><th>Kişi <small>tekil</small></th><th>Görüntüleme</th></tr></thead>
          <tbody>${d.sayfalar.map((x) => `<tr><td><a href="${esc(x.yol)}" target="_blank">${esc(x.ad)}</a></td><td>${sayi(x.tekil)}</td><td>${sayi(x.toplam)}</td></tr>`).join('')}</tbody>
        </table>
      </section>
      <section class="panel">
        <div class="panel__head"><h2>Blog yazıları</h2><div class="blog-arac"><select class="ara-kucuk" data-blog-sira>${BLOG_SIRALARI.map(([k, ad]) => `<option value="${k}">${ad}</option>`).join('')}</select><input type="search" class="ara-kucuk" placeholder="Yazı ara…" data-blog-ara></div></div>
        <div data-blog></div>
      </section>
      <div class="grid2">
        <section class="panel">
          <div class="panel__head"><h2>Yaklaşan randevular</h2><button type="button" class="btn btn--ghost btn--sm" data-tum-randevu>Tümü</button></div>
          ${d.randevu.yaklasan.length ? `<ul class="kisa">${d.randevu.yaklasan.map((r) => `<li><b>${esc(tarihYaz(r.tarih))} ${esc(r.saat)}</b><span>${esc(r.ad)} · <a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a></span><small>${esc(randevuTur[r.tur] || r.tur)} · ${esc(r.sinif)}</small></li>`).join('')}</ul>` : '<p class="muted">Yaklaşan randevu yok.</p>'}
        </section>
        <section class="panel">
          <h2>Panel girişleri</h2>
          ${d.girisler.length ? `<ul class="kisa">${d.girisler.map((g) => `<li class="${g.tur === 'kilit' ? 'is-uyari' : ''}"><b>${esc(turAdi[g.tur] || g.tur)}</b><span>${esc(tarihYaz(g.t, true))} · ${esc(g.tarayici)}</span><small>IP: ${esc(g.ip)}</small></li>`).join('')}</ul>` : '<p class="muted">Henüz kayıt yok.</p>'}
          <p class="muted">Tanımadığın bir giriş görürsen şifreyi hemen değiştir.</p>
        </section>
      </div>
      <p class="muted not">Tekil: aynı kişi aynı gün kaç kez gelirse gelsin 1 sayılır; farklı günlerde gelirse her gün ayrı sayılır. Çerez kullanılmaz, IP adresi saklanmaz. Senin ziyaretlerin (panele giriş yapmış tarayıcı) sayılmaz.</p>
    </main>`);
  app.querySelectorAll('[data-gun]').forEach((b) => { b.onclick = () => ozetEkrani(Number(b.dataset.gun)); });
  app.querySelector('[data-tum-randevu]').onclick = () => randevuEkrani();

  // Blog okumaları: 10'arlı sayfalar ve arama (yazı sayısı arttıkça sayfa uzamasın)
  const blogKutu = app.querySelector('[data-blog]');
  const enCokOkuma = Math.max(1, ...d.yazilar.map((y) => y.donem.tekil));
  let blogSayfa = 1;
  let blogAra = '';
  const blogSiraSec = app.querySelector('[data-blog-sira]');
  blogSiraSec.value = blogSirasi;
  const blogCiz = () => {
    const ara = blogAra.toLocaleLowerCase('tr');
    const sirali = [...d.yazilar].sort(BLOG_SIRALARI.find(([k]) => k === blogSirasi)[2]);
    const secili = sirali.map((y, i) => ({ ...y, sira: i + 1 })).filter((y) => !ara || y.baslik.toLocaleLowerCase('tr').includes(ara));
    if (!secili.length) {
      blogKutu.replaceChildren(h(`<p class="muted">${d.yazilar.length ? 'Bu aramaya uyan yazı yok.' : 'Yayında yazı yok.'}</p>`));
      return;
    }
    const ul = h(`<ol class="okumalar">${secili.slice((blogSayfa - 1) * 10, blogSayfa * 10).map((y) => `
      <li>
        <span class="okumalar__sira">${y.sira}</span>
        <div class="okumalar__yazi">
          <a href="/blog/${esc(y.slug)}" target="_blank">${esc(y.baslik)}</a>
          <span class="okumalar__cubuk"><b style="--w:${(y.donem.tekil / enCokOkuma) * 100}%"></b></span>
        </div>
        <div class="okumalar__sayi"><strong>${sayi(y.donem.tekil)}</strong><small>kişi · ${sayi(y.donem.toplam)} okuma</small></div>
        <div class="okumalar__sayi okumalar__tum"><strong>${sayi(y.tum.tekil)}</strong><small>tüm zamanlar</small></div>
      </li>`).join('')}</ol>`);
    blogKutu.replaceChildren(ul, sayfalama(secili.length, blogSayfa, 10, (n) => { blogSayfa = n; blogCiz(); }));
  };
  app.querySelector('[data-blog-ara]').oninput = (e) => { blogAra = e.target.value.trim(); blogSayfa = 1; blogCiz(); };
  blogSiraSec.onchange = () => { blogSirasi = blogSiraSec.value; blogSayfa = 1; blogCiz(); };
  blogCiz();

  // Takip bağlantısı: utm_source ile gelenler "Ziyaretçiler nereden geldi?" listesinde ayrı görünür
  const utmAd = app.querySelector('[data-utm-ad]');
  const utmSayfa = app.querySelector('[data-utm-sayfa]');
  const utmCiz = () => {
    const ad = slugYap(utmAd.value);
    app.querySelector('.utm__sonuc').hidden = !ad;
    const [yol, hash = ''] = utmSayfa.value.split('#');
    app.querySelector('[data-utm-link]').textContent = `${location.origin}${yol}?utm_source=${ad}${hash ? `#${hash}` : ''}`;
  };
  utmAd.oninput = utmCiz;
  utmSayfa.onchange = utmCiz;
  app.querySelector('[data-utm-kopyala]').onclick = async () => {
    await navigator.clipboard.writeText(app.querySelector('[data-utm-link]').textContent);
    bildir('Bağlantı kopyalandı');
  };
}

/* ---------- Google yorumları ---------- */
const DURUMLAR = [['oto', 'Otomatik'], ['goster', 'Göster'], ['gizle', 'Gizle']];
const YORUM_FILTRELERI = [
  ['', 'Tümü', () => true],
  ['sitede', 'Sitede', (y) => Number(y.gorunur)],
  ['gizli', 'Gizli', (y) => !Number(y.gorunur)],
  ['dusuk', '4 yıldız ve altı', (y) => Number(y.puan) < 5],
  ['metinsiz', 'Metinsiz', (y) => !y.metin.trim()],
];
const YORUM_BOYUT = 20;
const yorumListe = { ara: '', filtre: '', sayfa: 1 };
async function yorumlarEkrani() {
  kabuk('yorumlar', '<main class="list list--wide"><p>Yükleniyor…</p></main>');
  const d = await api('yorumlar');
  const yildiz = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const gorunen = d.yorumlar.filter((y) => Number(y.gorunur)).length;
  kabuk('yorumlar', `
    <main class="list list--wide">
      <div class="list__head">
        <h1>Google yorumları</h1>
        <div class="list__arac">
          <button class="btn btn--ghost" data-yorum-ac>+ Yorum ekle</button>
          ${d.anahtarVar ? '<button class="btn btn--primary" data-yenile>Şimdi yenile</button>' : ''}
        </div>
      </div>
      ${d.anahtarVar ? '' : `<section class="panel baglanti">
        <div class="panel__head">
          <div>
            <h2>Google bağlantısı</h2>
            <p class="muted">${d.gbpAyarli
              ? 'İşletmenin sahibi olan Google hesabıyla bir kez bağlan; yorumların hepsi buraya gelir ve sitede neyin görüneceğini sen seçersin.'
              : 'Google bağlantısı kurulmadı. Yorumları “+ Yorum ekle” ile elle ekleyebilirsin.'}</p>
          </div>
          ${d.gbpAyarli ? '<a class="btn btn--primary" href="/api/blog.php?islem=google-baglan">Google ile bağlan</a>' : ''}
        </div>
      </section>`}
      ${d.hata ? `<section class="panel uyari"><h2>Son yenileme başarısız</h2><p>${esc(d.hata.mesaj)}</p><small class="muted">${esc(tarihYaz(d.hata.t, true))}</small></section>` : ''}
      <div class="stats stats--3">
        <div class="stat"><span>Google puanı</span><strong>${d.ozet ? Number(d.ozet.ortalama).toFixed(1).replace('.', ',') : '—'}</strong><small>${d.ozet ? `${sayi(d.ozet.toplam)} yorum` : 'henüz yok'}</small></div>
        <div class="stat"><span>Sitede görünen</span><strong>${sayi(gorunen)}</strong><small>${sayi(d.yorumlar.length)} yorumdan</small></div>
        <div class="stat"><span>Son yenileme</span><strong class="stat__kucuk">${d.ozet ? esc(tarihYaz(d.ozet.guncelleme, true)) : '—'}</strong><small>${d.anahtarVar ? 'otomatik: haftada bir' : 'elle'}</small></div>
      </div>
      <section class="panel yeni-yorum" data-yorum-kutu hidden>
        <div class="panel__head"><h2>Yeni yorum</h2><button type="button" class="kapat" data-yorum-kapat title="Kapat">✕</button></div>
        <form data-yorum-ekle>
          <div class="yeni-yorum__ust">
            <button type="button" class="yorum-foto" data-foto title="Fotoğraf seç (isteğe bağlı)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
              <span>Fotoğraf</span>
            </button>
            <div class="yeni-yorum__bilgi">
              <label class="fld">Ad Soyad<input name="yazar" maxlength="120" required placeholder="Yorumu yazan kişi"></label>
              <div class="yeni-yorum__satir">
                <div class="fld">Puan
                  <div class="yildiz-sec" data-yildiz role="radiogroup" aria-label="Puan">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" class="is-on" aria-label="${n} yıldız">★</button>`).join('')}</div>
                </div>
                <label class="fld">Tarih<input name="tarih" type="date" required value="${new Date().toISOString().slice(0, 10)}" max="${new Date().toISOString().slice(0, 10)}"></label>
              </div>
            </div>
          </div>
          <label class="fld">Yorum<textarea name="metin" rows="4" maxlength="2000" required placeholder="Google'daki yorumun metni"></textarea></label>
          <div class="yeni-yorum__alt">
            <button class="btn btn--ghost" type="button" data-yorum-kapat>Vazgeç</button>
            <button class="btn btn--primary" type="submit">Yorumu ekle</button>
          </div>
        </form>
      </section>
      ${d.anahtarVar ? '' : `<section class="panel">
        <h2>Google puanı</h2>
        <p class="muted">Google'daki işletme sayfanda görünen puanı ve yorum sayısını yaz; sitenin üstünde gösterilir.</p>
        <form class="yorum-ekle" data-ozet>
          <div class="alanlar">
            <label class="fld">Puan (ör. 4,9)<input name="ortalama" inputmode="decimal" value="${d.ozet ? String(d.ozet.ortalama).replace('.', ',') : ''}"></label>
            <label class="fld">Yorum sayısı<input name="toplam" type="number" min="1" value="${d.ozet ? d.ozet.toplam : ''}"></label>
          </div>
          <div class="yeni-yorum__alt"><button class="btn btn--ghost" type="button" data-ozet-temizle>Gösterme</button><button class="btn btn--primary" type="submit">Kaydet</button></div>
        </form>
      </section>`}
      <section class="panel">
        <p class="muted"><b>Otomatik</b>: 5 yıldızlı ve metni olan yorumlar sitede görünür; yalnız yıldız verilmiş (metinsiz) yorumlar hiç gösterilmez. Liste en yeniden eskiye sıralıdır. İstediğin yorumu <b>Göster</b> ya da <b>Gizle</b> diye sabitleyebilir, oklarla sırasını değiştirebilirsin (⤒ en üste taşır). Sitede bu sırayla ilk 24 yorum gösterilir.</p>
        <div class="filtre">
          <input type="search" placeholder="Yazarda veya yorumda ara…" value="${esc(yorumListe.ara)}" data-ara>
          <div class="donem">${YORUM_FILTRELERI.map(([k, ad, f]) => `<button type="button" data-filtre="${k}" class="${yorumListe.filtre === k ? 'is-on' : ''}">${ad} <small>${d.yorumlar.filter(f).length}</small></button>`).join('')}</div>
        </div>
        <div data-liste></div>
      </section>
    </main>`);
  if (d.bpMesaj) bildir(d.bpMesaj, d.bpMesaj.includes('kuruldu,') ? 'ok' : 'err');
  const kopar = app.querySelector('[data-kopar]');
  if (kopar) kopar.onclick = async () => {
    if (!confirm('Google bağlantısı kaldırılsın mı? Mevcut yorumlar silinmez, yalnız yenileri gelmez.')) return;
    await api('google-kopar', { method: 'POST' });
    yorumlarEkrani();
  };
  const idler = d.yorumlar.map((y) => y.id);
  const kutu = app.querySelector('[data-liste]');
  const tasi = async (id, hedef) => {
    idler.splice(idler.indexOf(id), 1);
    idler.splice(Math.max(0, hedef), 0, id);
    await api('yorum-sira', { method: 'POST', body: { idler } });
    yorumlarEkrani();
  };
  const ciz = () => {
    const ara = yorumListe.ara.toLocaleLowerCase('tr');
    const f = YORUM_FILTRELERI.find(([k]) => k === yorumListe.filtre)[2];
    const secili = d.yorumlar.filter((y) => f(y) && (!ara || `${y.yazar} ${y.metin}`.toLocaleLowerCase('tr').includes(ara)));
    yorumListe.sayfa = Math.min(yorumListe.sayfa, Math.max(1, Math.ceil(secili.length / YORUM_BOYUT)));
    if (!secili.length) {
      kutu.replaceChildren(h(`<p class="muted">${d.yorumlar.length ? 'Bu seçime uyan yorum yok.' : 'Henüz yorum yok.'}</p>`));
      return;
    }
    const ul = h('<ul class="yorumlar"></ul>');
    secili.slice((yorumListe.sayfa - 1) * YORUM_BOYUT, yorumListe.sayfa * YORUM_BOYUT).forEach((y) => {
      const i = idler.indexOf(y.id);
      const li = h(`
          <li class="yorum ${Number(y.gorunur) ? 'is-gorunur' : ''}">
            <div class="yorum__ust"><span class="yorum__sira">${i + 1}</span>${y.yazar_foto ? `<img class="yorum__foto" src="${esc(y.yazar_foto)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="yorum__yildiz">${yildiz(Number(y.puan))}</span><b>${esc(y.yazar)}</b><small>${esc(tarihYaz(y.tarih))}</small>
              ${y.kaynak === 'elle' ? '<span class="badge">Elle eklendi</span>' : ''}<span class="badge ${Number(y.gorunur) ? 'badge--yayinda' : 'badge--taslak'}">${Number(y.gorunur) ? 'Sitede' : 'Gizli'}</span></div>
            <p>${esc(y.metin) || '<em class="muted">Metin yok</em>'}</p>
            <div class="yorum__alt">
              ${y.metin.trim() ? `<div class="donem">${DURUMLAR.map(([k, ad]) => `<button type="button" data-durum="${k}" class="${y.durum === k ? 'is-on' : ''}">${ad}</button>`).join('')}</div>` : '<small class="muted">Yalnız yıldız verilmiş; metni olmadığı için sitede gösterilmez.</small>'}
              <button type="button" class="btn btn--ghost btn--sm" data-en-ust ${i ? '' : 'disabled'} title="En üste taşı">⤒</button>
              <button type="button" class="btn btn--ghost btn--sm" data-yukari ${i ? '' : 'disabled'} title="Yukarı">↑</button>
              <button type="button" class="btn btn--ghost btn--sm" data-asagi ${i < idler.length - 1 ? '' : 'disabled'} title="Aşağı">↓</button>
              ${y.kaynak === 'elle' ? '<button type="button" class="btn btn--ghost btn--sm btn--danger" data-yorum-sil>Sil</button>' : ''}
            </div>
          </li>`);
      li.querySelectorAll('[data-durum]').forEach((b) => {
        b.onclick = async () => { await api('yorum', { method: 'POST', body: { id: y.id, durum: b.dataset.durum } }); yorumlarEkrani(); };
      });
      li.querySelector('[data-en-ust]').onclick = () => tasi(y.id, 0);
      li.querySelector('[data-yukari]').onclick = () => tasi(y.id, i - 1);
      li.querySelector('[data-asagi]').onclick = () => tasi(y.id, i + 1);
      const sil = li.querySelector('[data-yorum-sil]');
      if (sil) sil.onclick = async () => { if (!confirm('Bu yorum silinsin mi?')) return; await api('yorum-sil', { method: 'POST', body: { id: y.id } }); yorumlarEkrani(); };
      ul.appendChild(li);
    });
    kutu.replaceChildren(ul, sayfalama(secili.length, yorumListe.sayfa, YORUM_BOYUT, (n) => {
      yorumListe.sayfa = n;
      ciz();
      kutu.previousElementSibling.scrollIntoView({ behavior: 'smooth' });
    }));
  };
  app.querySelector('[data-ara]').oninput = (e) => { yorumListe.ara = e.target.value.trim(); yorumListe.sayfa = 1; ciz(); };
  app.querySelectorAll('[data-filtre]').forEach((b) => {
    b.onclick = () => {
      yorumListe.filtre = b.dataset.filtre;
      yorumListe.sayfa = 1;
      app.querySelectorAll('[data-filtre]').forEach((x) => x.classList.toggle('is-on', x === b));
      ciz();
    };
  });
  ciz();
  const kutuYorum = app.querySelector('[data-yorum-kutu]');
  app.querySelector('[data-yorum-ac]').onclick = () => { kutuYorum.hidden = false; kutuYorum.querySelector('[name="yazar"]').focus(); };
  app.querySelectorAll('[data-yorum-kapat]').forEach((b) => { b.onclick = () => { kutuYorum.hidden = true; }; });
  let puanSecili = 5;
  const yildizlar = [...app.querySelectorAll('[data-yildiz] button')];
  const yildizCiz = (n) => yildizlar.forEach((b) => b.classList.toggle('is-on', Number(b.dataset.n) <= n));
  yildizlar.forEach((b) => {
    b.onclick = () => { puanSecili = Number(b.dataset.n); yildizCiz(puanSecili); };
    b.onmouseenter = () => yildizCiz(Number(b.dataset.n));
  });
  app.querySelector('[data-yildiz]').onmouseleave = () => yildizCiz(puanSecili);
  const fotoBtn = app.querySelector('[data-foto]');
  fotoBtn.onclick = async () => {
    const dosya = await dosyaSec();
    if (!dosya) return;
    fotoBtn.classList.add('is-loading');
    try {
      const url = await gorselYukle(dosya);
      fotoBtn.closest('form').dataset.foto = url;
      fotoBtn.innerHTML = `<img src="${esc(url)}" alt=""><span class="yorum-foto__degistir">Değiştir</span>`;
    } catch (ex) { bildir(ex.message, 'err'); }
    fotoBtn.classList.remove('is-loading');
  };
  app.querySelector('[data-yorum-ekle]').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api('yorum-ekle', { method: 'POST', body: { yazar: f.yazar.value, puan: puanSecili, tarih: f.tarih.value, metin: f.metin.value, foto: f.dataset.foto || '' } });
      bildir('Yorum eklendi');
      yorumlarEkrani();
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  };
  const ozetForm = app.querySelector('[data-ozet]');
  if (ozetForm) ozetForm.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('google-ozet', { method: 'POST', body: { ortalama: ozetForm.ortalama.value, toplam: Number(ozetForm.toplam.value) } });
      bildir('Google puanı kaydedildi');
      yorumlarEkrani();
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  };
  const temizle = app.querySelector('[data-ozet-temizle]');
  if (temizle) temizle.onclick = async () => { await api('google-ozet', { method: 'POST', body: { temizle: true } }); bildir('Puan sitede gösterilmeyecek'); yorumlarEkrani(); };
  const yenileBtn = app.querySelector('[data-yenile]');
  if (yenileBtn) yenileBtn.onclick = async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Yenileniyor…';
    try {
      const r = await api('yorumlari-yenile', { method: 'POST' });
      bildir(r.yeni ? `${r.yeni} yeni yorum eklendi.` : 'Yeni yorum yok.');
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
    yorumlarEkrani();
  };
}

/* ---------- Randevular ---------- */
const GUN_ADLARI = [[1, 'Pazartesi'], [2, 'Salı'], [3, 'Çarşamba'], [4, 'Perşembe'], [5, 'Cuma'], [6, 'Cumartesi'], [0, 'Pazar']];
async function randevuEkrani() {
  kabuk('randevular', '<main class="list"><p>Yükleniyor…</p></main>');
  const [{ randevular }, { ayarlar: sa }] = await Promise.all([api('randevular'), api('randevu-saatleri')]);
  const bugun = new Date().toISOString().slice(0, 10);
  const tur = { vr: 'Ücretsiz sanal sürüş', bilgi: 'Kayıt / bilgi' };
  kabuk('randevular', `
    <main class="list list--wide">
      <div class="list__head"><div><h1>Randevular</h1><span class="muted">Son 7 gün ve gelecek</span></div><button class="btn btn--primary" data-randevu-ac>+ Randevu ekle</button></div>
      <section class="panel yeni-yorum" data-randevu-kutu hidden>
        <div class="panel__head"><h2>Yeni randevu</h2><button type="button" class="kapat" data-randevu-kapat title="Kapat">✕</button></div>
        <p class="muted">Telefonla ya da yüz yüze alınan randevuyu buraya yaz; sitedeki takvimde o saat dolu görünür.</p>
        <form data-randevu-form>
          <div class="alanlar">
            <label class="fld">Ad Soyad<input name="ad" maxlength="80" required placeholder="Adayın adı"></label>
            <label class="fld">Telefon<input name="telefon" type="tel" inputmode="tel" required placeholder="0532 123 45 67"></label>
          </div>
          <div class="fld">Randevu türü
            <div class="donem" data-r-tur>${Object.entries(tur).map(([k, ad], i) => `<button type="button" data-k="${k}" class="${i ? '' : 'is-on'}">${ad}</button>`).join('')}</div>
          </div>
          <div class="alanlar">
            <label class="fld">Ehliyet sınıfı<select name="sinif">${['B', 'B Otomatik', 'A1', 'A2', 'A', 'C', 'Karar vermedim'].map((s) => `<option>${s}</option>`).join('')}</select></label>
            <label class="fld">Tarih<input name="tarih" type="date" required value="${bugun}" min="${bugun}"></label>
          </div>
          <div class="fld">Saat
            <div class="saat-sec" data-saat-sec></div>
            <input name="saat" type="time" required class="saat-elle" aria-label="Saat">
          </div>
          <label class="fld"><span>Not <small class="muted">(isteğe bağlı)</small></span><input name="not" maxlength="300" placeholder="örn. Annesiyle gelecek, B otomatik soruyor"></label>
          <div class="yeni-yorum__alt">
            <button class="btn btn--ghost" type="button" data-randevu-kapat>Vazgeç</button>
            <button class="btn btn--primary" type="submit">Randevuyu kaydet</button>
          </div>
        </form>
      </section>
      <table class="tbl tbl--randevu">
        <thead><tr><th>Tarih</th><th>Ad</th><th>Telefon</th><th>Tür</th><th>Sınıf</th><th></th></tr></thead>
        <tbody>${randevular.map((r) => `<tr class="${r.tarih < bugun ? 'is-past' : ''}"><td><b>${esc(new Date(r.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }))}</b> ${esc(r.saat)}</td><td>${esc(r.ad)}${r.kaynak === 'panel' ? ' <span class="badge">Panelden</span>' : Date.now() - new Date(r.olusturma) < 864e5 ? ' <span class="badge badge--yeni">Yeni</span>' : ''}${r.not ? `<small class="randevu__not">${esc(r.not)}</small>` : ''}</td><td><a href="tel:${esc(r.telefon)}">${esc(r.telefon)}</a></td><td>${esc(tur[r.tur] || r.tur)}</td><td>${esc(r.sinif)}</td><td><button type="button" class="btn btn--ghost btn--sm btn--danger" data-randevu-sil="${esc(r.id)}" title="Randevuyu sil">Sil</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Henüz randevu yok.</td></tr>'}</tbody>
      </table>
      <details class="panel saatler">
        <summary><h2>Randevu saatleri ve tatil günleri</h2></summary>
        <p class="muted">Ana sayfadaki randevu formunda gösterilen saatler. "Son randevu" o gün verilecek en geç saattir.</p>
        <table class="tbl saatler__tbl">
          <thead><tr><th>Gün</th><th>Açık</th><th>İlk randevu</th><th>Son randevu</th></tr></thead>
          <tbody>${GUN_ADLARI.map(([i, ad]) => `<tr data-gun="${i}"><td>${ad}</td><td><input type="checkbox" data-acik ${sa.gunler[i].acik ? 'checked' : ''}></td><td><input type="time" data-bas value="${esc(sa.gunler[i].bas)}"></td><td><input type="time" data-bit value="${esc(sa.gunler[i].bit)}"></td></tr>`).join('')}</tbody>
        </table>
        <div class="alanlar">
          <label class="fld">Randevu aralığı<select data-aralik>${[15, 20, 30, 45, 60, 90, 120].map((d) => `<option value="${d}" ${d === Number(sa.aralik) ? 'selected' : ''}>${d} dakika</option>`).join('')}</select></label>
          <label class="fld">Aynı saate en fazla kaç kişi<input type="number" min="1" max="20" data-kapasite value="${Number(sa.kapasite)}"></label>
          <label class="fld">Kaç gün sonrasına kadar randevu alınabilir<input type="number" min="1" max="120" data-ileri value="${Number(sa.ileriGun)}"></label>
          <div class="fld">Tatil / kapalı günler
            <div class="tatil"><input type="date" data-tatil-yeni min="${bugun}"><button type="button" class="btn btn--ghost btn--sm" data-tatil-ekle>Ekle</button></div>
            <div class="tatil__liste" data-tatil></div>
          </div>
        </div>
        <button type="button" class="btn btn--primary" data-saat-kaydet>Saatleri kaydet</button>
      </details>
    </main>`);
  // Elle randevu: seçilen günün saatleri dolulukla gösterilir, istenirse başka saat yazılır
  const rKutu = app.querySelector('[data-randevu-kutu]');
  const rForm = app.querySelector('[data-randevu-form]');
  app.querySelector('[data-randevu-ac]').onclick = () => { rKutu.hidden = false; rForm.ad.focus(); };
  app.querySelectorAll('[data-randevu-kapat]').forEach((b) => { b.onclick = () => { rKutu.hidden = true; }; });
  let rTur = 'vr';
  rForm.querySelectorAll('[data-r-tur] button').forEach((b) => {
    b.onclick = () => {
      rTur = b.dataset.k;
      rForm.querySelectorAll('[data-r-tur] button').forEach((x) => x.classList.toggle('is-on', x === b));
      // Sanal sürüş yalnız B (manuel vites)
      if (rTur === 'vr') rForm.sinif.value = 'B';
      rForm.sinif.disabled = rTur === 'vr';
    };
  });
  rForm.sinif.disabled = true;
  const saatleriCiz = () => {
    const t = rForm.tarih.value;
    const gun = sa.gunler[new Date(`${t}T12:00`).getDay()];
    const dakika = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
    const saatler = [];
    if (gun?.acik && !sa.kapali.includes(t)) {
      for (let d = dakika(gun.bas); d <= dakika(gun.bit); d += Math.max(15, Number(sa.aralik))) saatler.push(`${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`);
    }
    const dolu = (s) => randevular.filter((r) => r.tarih === t && r.saat === s).length;
    const kutu = rForm.querySelector('[data-saat-sec]');
    kutu.innerHTML = saatler.length
      ? saatler.map((s) => `<button type="button" data-s="${s}" class="${dolu(s) >= Number(sa.kapasite) ? 'is-dolu' : ''} ${rForm.saat.value === s ? 'is-on' : ''}" title="${dolu(s) >= Number(sa.kapasite) ? 'Dolu' : 'Boş'}">${s}</button>`).join('')
      : '<span class="muted">Bu gün kurs kapalı; yine de aşağıya saat yazabilirsin.</span>';
    kutu.querySelectorAll('button').forEach((b) => {
      b.onclick = () => { rForm.saat.value = b.dataset.s; saatleriCiz(); };
    });
  };
  rForm.tarih.onchange = saatleriCiz;
  rForm.saat.oninput = saatleriCiz;
  saatleriCiz();
  rForm.onsubmit = async (e) => {
    e.preventDefault();
    const f = rForm;
    const doluMu = randevular.filter((r) => r.tarih === f.tarih.value && r.saat === f.saat.value).length >= Number(sa.kapasite);
    if (doluMu && !confirm('Bu saat dolu görünüyor. Yine de eklensin mi?')) return;
    try {
      await api('randevu-ekle', { method: 'POST', body: { ad: f.ad.value, telefon: f.telefon.value, tur: rTur, sinif: f.sinif.value, tarih: f.tarih.value, saat: f.saat.value, not: f.not.value } });
      bildir('Randevu kaydedildi');
      randevuEkrani();
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  };
  app.querySelectorAll('[data-randevu-sil]').forEach((b) => {
    b.onclick = async () => {
      if (!confirm('Bu randevu silinsin mi? (İptal edildiyse silebilirsin.)')) return;
      await api('randevu-sil', { method: 'POST', body: { id: b.dataset.randevuSil } });
      bildir('Randevu silindi');
      randevuEkrani();
    };
  });

  const kapali = [...sa.kapali];
  const tatilCiz = () => {
    app.querySelector('[data-tatil]').innerHTML = kapali.map((t) => `<span class="badge">${esc(new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' }))} <button type="button" data-sil-tatil="${t}" aria-label="Kaldır">✕</button></span>`).join('') || '<span class="muted">Yok</span>';
    app.querySelectorAll('[data-sil-tatil]').forEach((x) => { x.onclick = () => { kapali.splice(kapali.indexOf(x.dataset.silTatil), 1); tatilCiz(); }; });
  };
  tatilCiz();
  app.querySelector('[data-tatil-ekle]').onclick = () => {
    const t = app.querySelector('[data-tatil-yeni]').value;
    if (t && !kapali.includes(t)) { kapali.push(t); kapali.sort(); tatilCiz(); }
  };
  app.querySelector('[data-saat-kaydet]').onclick = async () => {
    const gunler = {};
    app.querySelectorAll('[data-gun]').forEach((tr) => {
      gunler[tr.dataset.gun] = { acik: tr.querySelector('[data-acik]').checked, bas: tr.querySelector('[data-bas]').value, bit: tr.querySelector('[data-bit]').value };
    });
    try {
      await api('randevu-saatleri', { method: 'POST', body: { gunler, aralik: Number(app.querySelector('[data-aralik]').value), kapasite: Number(app.querySelector('[data-kapasite]').value), ileriGun: Number(app.querySelector('[data-ileri]').value), kapali } });
      bildir('Randevu saatleri kaydedildi');
    } catch (ex) { if (ex.message !== 'oturum') bildir(ex.message, 'err'); }
  };
}

/* ---------- Başlangıç ---------- */
(async () => {
  try {
    const { admin } = await api('ben');
    // Google bağlantısından dönüşte doğrudan Yorumlar açılır
    if (admin && location.hash === '#yorumlar') { history.replaceState(null, '', location.pathname); yorumlarEkrani(); } else if (admin) ozetEkrani(); else girisEkrani();
  } catch {
    girisEkrani();
  }
})();
