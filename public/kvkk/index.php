<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/_inc/temel.php';
require_once dirname(__DIR__) . '/_inc/sablon.php';
require_once dirname(__DIR__) . '/_inc/sayac.php';

sayacKaydet('/kvkk/');

sayfaBasi(['baslik' => 'KVKK Aydınlatma Metni | Baylık Akademi', 'aciklama' => 'Baylık Akademi Spor Kulübü (Sincan, Ankara) randevu formunda toplanan kişisel verilerin işlenme amacı, saklama süresi ve KVKK kapsamındaki haklarınız.', 'yol' => '/kvkk/']);
?>
<main class="art">
  <header class="art__head">
    <p class="kicker">Yasal</p>
    <h1>KVKK Aydınlatma Metni</h1>
    <p class="art__lead">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, web sitemiz üzerinden paylaştığınız kişisel verilerin nasıl işlendiğini açıklıyoruz.</p>
  </header>
  <article class="prose">
    <!-- TODO: Metin örnek olarak uyarlandı; yayından önce kulübün hukuk danışmanına okutulmalı. -->
    <h2>Veri sorumlusu</h2>
    <p>Baylık Akademi Spor Kulübü<br>Malazgirt Mah. Buhara Cd. No:71/B, 06930 Sincan / Ankara<br>E-posta: <a href="mailto:baylikgokhun7@gmail.com">baylikgokhun7@gmail.com</a> · Telefon: <a href="tel:+905428980601">0542 898 06 01</a></p>

    <h2>Hangi verileri işliyoruz?</h2>
    <ul>
      <li>Online ön görüşme formunda yazdığınız ad soyad, cep telefonu numarası, ilgilendiğiniz branş (yüzme, taekwondo, kickboks), dersin kimin için olduğu, isteğe bağlı olarak yaş, gün ve saat.</li>
      <li>Kötüye kullanımı önlemek için IP adresinizin geri döndürülemez şekilde özetlenmiş hali (adresin kendisi saklanmaz).</li>
    </ul>
    <p>Çocuğunuz adına randevu alıyorsanız, çocuğunuza ait bilgileri (yaş gibi) veli olarak sizin paylaştığınızı kabul ederiz; yalnızca uygun grup ve ders planını belirlemek için kullanılır.</p>
    <p>Sitemizi kaç kişinin ziyaret ettiğini görmek için çerez kullanmayan bir sayaç kullanırız: IP adresiniz ve tarayıcı bilginiz, her gün değişen bir anahtarla geri döndürülemez şekilde özetlenir ve yalnızca o gün aynı kişinin iki kez sayılmaması için kullanılır. IP adresiniz kaydedilmez, bir gün sonra özet de silinir; sizi tanımlamak veya takip etmek mümkün değildir.</p>
    <p>Aynı sayaçla hangi sayfaların okunduğunu, hangi düğmelere tıklandığını (örneğin telefon ya da WhatsApp), ziyaretçilerin hangi siteden geldiğini (Google, Instagram gibi; adresin kendisi değil yalnızca türü) ve cihaz türünü yalnızca toplu sayılar olarak tutarız. Bu sayılar hiçbir kişiyle ilişkilendirilmez.</p>

    <h2>Çerezler</h2>
    <p>Sitemiz ziyaretçilere çerez bırakmaz; reklam ya da takip aracı kullanmaz. Yalnızca kulüp yetkililerinin giriş yaptığı yönetim panelinde, oturumun açık kalması için zorunlu bir oturum çerezi kullanılır. Google Haritalar bağlantıları siz tıklayınca Google'da açılır; orada Google'ın kendi gizlilik kuralları geçerlidir.</p>

    <h2>Google yorumları</h2>
    <p>Sitemizdeki yorumlar, Google’da herkese açık olarak yayımlanmış yorumlardır ve yazarın Google’daki adıyla gösterilir. Yorumunuzun sitemizde görünmesini istemiyorsanız bize yazmanız yeterlidir; yorumu sitemizde gizleriz.</p>

    <h2>Hangi amaçla ve hangi hukuki sebeple?</h2>
    <p>Verilerinizi; ön görüşme randevunuzu oluşturmak, sizi arayıp randevuyu teyit etmek ve dersler hakkında talep ettiğiniz bilgiyi vermek amacıyla işliyoruz. Hukuki sebebimiz, KVKK m.5/2-c uyarınca bir sözleşmenin kurulmasıyla doğrudan ilgili olması ve m.5/2-f uyarınca meşru menfaatimizdir.</p>

    <h2>Verileriniz kimlere aktarılır?</h2>
    <p>Randevu bilgileriniz yalnızca kulübümüzün yönetim panelinde, yetkili kişiler tarafından görülür. Üçüncü kişilerle paylaşılmaz, satılmaz, reklam amacıyla kullanılmaz.</p>
    <p>Sitemiz, güvenlik ve hız için Cloudflare altyapısı üzerinden sunulabilir; bu kapsamda bağlantı bilgileriniz (IP adresi gibi) Cloudflare tarafından işlenebilir. Randevu formunda, otomatik (bot) gönderimleri engellemek için Cloudflare Turnstile doğrulaması kullanılabilir.</p>

    <h2>Ne kadar süre saklanır?</h2>
    <p>Randevu kayıtları, randevu tarihinden itibaren 60 gün sonra sistemimizden otomatik olarak silinir. Kulübümüze kayıt olursanız, kayıt sürecindeki veriler ilgili mevzuatın öngördüğü süre boyunca saklanır.</p>

    <h2>Haklarınız</h2>
    <p>KVKK m.11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, silinmesini ya da yok edilmesini isteme, bu işlemlerin aktarılan kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuç doğmasına itiraz etme ve zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.</p>
    <p>Başvurularınızı yukarıdaki e-posta adresine ya da salon adresimize yazılı olarak iletebilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.</p>

    <p><em>Son güncelleme: <?= date('d.m.Y') ?></em></p>
  </article>
</main>
<?php sayfaSonu();
