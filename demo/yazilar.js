// DEMO blog yazıları. TODO (panel): yayında /api/blog.php'den gelir; her yazı /blog/slug adresinde sunucuda üretilir.
// Alanlar panelin yazı yapısıyla aynı: slug, baslik, ozet, kategori, tarih, dakika, govde (HTML).

export const KATEGORILER = ['Yüzme', 'Taekwondo', 'Kickboks', 'Sağlık'];

export const YAZILAR = [
  {
    slug: 'su-korkusu-nasil-yenilir',
    kategori: 'Yüzme', tarih: '24 Ekim 2026', dakika: 5,
    baslik: 'Su korkusu nasıl yenilir? 5 küçük adım',
    ozet: 'Su korkusu yetişkinlerde de çocuklarda da çok yaygın. İyi haber: doğru sırayla gidildiğinde birkaç derste büyük fark oluyor.',
    govde: `
      <p>Su korkusu çoğu zaman tek bir kötü deneyimden ya da hiç denememiş olmaktan gelir. Çocukken havuzda boğulur gibi olmak, denizde ayağın yere basmadığını fark etmek ya da sadece “ben yapamam” düşüncesi… Amaç korkuyu bastırmak değil, suyla güven ilişkisi kurmaktır.</p>
      <h2>1. Sığ yerde, ayağın yere basarken başla</h2>
      <p>İlk derslerde ayakların yere bastığı bölümde kalmak, “kontrol bende” hissini verir. Beden güvende olduğunu anladığında zihin de rahatlar.</p>
      <h2>2. Önce nefes</h2>
      <p>Ağızdan nefes alıp suyun içine burundan yavaşça vermek, paniğin en büyük nedeni olan nefessiz kalma hissini ortadan kaldırır. Bunu havuz kenarında, yüzün suyun içindeyken defalarca tekrar ederiz.</p>
      <h2>3. Suyun seni taşıdığını hisset</h2>
      <p>Eğitmen desteğiyle sırtüstü süzülmek, vücudun suda doğal olarak kaldığını gösterir. Bu an genellikle korkunun kırıldığı andır.</p>
      <h2>4. Küçük hedefler koy</h2>
      <p>“Bugün yüzümü suya sokacağım”, “bugün tutunmadan beş saniye süzüleceğim” gibi küçük hedefler, her dersi bir başarıya çevirir.</p>
      <h2>5. Acele etme</h2>
      <p>Herkesin temposu farklı. Birebir derste program tamamen size göre ilerler; kimse sizi bir grubun hızına yetişmeye zorlamaz.</p>
      <blockquote>Su korkusu olan öğrencilerimizin çoğu, sekiz derslik paketin sonunda havuzun bir ucundan öbür ucuna kendi başına yüzüyor.</blockquote>
      <p>Eryaman'daki havuzumuzda ön görüşme yapıp suyla ilk tanışmanızı birlikte planlayabiliriz.</p>`
  },
  {
    slug: 'cocuklar-kac-yasinda-yuzmeye-baslamali',
    kategori: 'Yüzme', tarih: '12 Ekim 2026', dakika: 4,
    baslik: 'Çocuklar kaç yaşında yüzmeye başlamalı?',
    ozet: 'Erken başlamak avantaj, ama asıl önemli olan çocuğun hazır olması. Ailelerin en çok sorduğu soruyu yanıtladık.',
    govde: `
      <p>Suyla tanışma için erken yaşlar idealdir; ancak teknik yüzme eğitimine genellikle 5–6 yaş civarında başlanır. Bu yaşlarda çocuk yönergeleri takip edebilir, koordinasyonu gelişmeye başlar ve ders süresince dikkatini toplayabilir.</p>
      <h2>Hazır olduğunu nasıl anlarsınız?</h2>
      <ul><li>Suyla oynamaktan keyif alıyorsa</li><li>Kısa yönergeleri takip edebiliyorsa</li><li>Yüzünü suya sokmaktan çok korkmuyorsa</li><li>45 dakika boyunca bir etkinliğe katılabiliyorsa</li></ul>
      <h2>Daha küçük yaşta ne yapılabilir?</h2>
      <p>3–5 yaş arasında amaç “yüzmeyi öğretmek” değil, suyu sevdirmektir. Oyunlarla suya alışma, nefes tutma ve kenara tutunma gibi güvenlik becerileri bu dönemde kazanılır.</p>
      <h2>Geç kalınır mı?</h2>
      <p>Hayır. Yüzme her yaşta öğrenilir; yetişkin öğrencilerimiz de birkaç ay içinde güvenle yüzebiliyor. Önemli olan doğru sırayla, acele etmeden ilerlemek.</p>
      <p>Ön görüşmede çocuğunuzu suda görüp size en doğru başlangıç planını önerebiliriz.</p>`
  },
  {
    slug: 'serbest-stilde-dogru-nefes',
    kategori: 'Yüzme', tarih: '5 Ekim 2026', dakika: 4,
    baslik: 'Serbest stilde doğru nefes nasıl alınır?',
    ozet: 'Serbest stilde yorulmanın en büyük nedeni yanlış nefes. Başı kaldırmadan, ritmi bozmadan nefes almanın püf noktaları.',
    govde: `
      <p>Serbest stilde amaç sadece hızlı yüzmek değil; doğru teknikle daha az enerji harcayarak daha verimli ilerlemektir. Bunun anahtarı da nefes.</p>
      <h2>Başı kaldırma, döndür</h2>
      <p>En sık yapılan hata nefes almak için başı yukarı kaldırmaktır. Bu kalçanın batmasına ve vücudun frenlenmesine neden olur. Doğrusu, kol çekişiyle birlikte başı yana döndürmek; bir göz suyun içinde kalacak kadar.</p>
      <h2>Su altında nefesini ver</h2>
      <p>Nefes alma anı çok kısadır. Eğer o anda hem nefes verip hem nefes almaya çalışırsanız yetişmez. Yüzünüz suyun içindeyken burun ve ağızdan yavaşça nefes verin; baş döndüğünde sadece nefes alın.</p>
      <h2>Ritim: her 2 ya da 3 kulaçta bir</h2>
      <p>Başlangıçta her 2 kulaçta bir nefes almak rahattır. İlerledikçe 3 kulaçta bir nefes almak, iki tarafa da nefes alabilmeyi ve daha dengeli bir stil kazanmayı sağlar.</p>
      <ul><li>Vücut suya paralel olmalı</li><li>Kollar uzun ve kontrollü çekiş yapmalı</li><li>Ayak vuruşu dizden değil, kalçadan başlamalı</li></ul>`
  },
  {
    slug: 'yetiskinler-icin-yuzme',
    kategori: 'Yüzme', tarih: '28 Eylül 2026', dakika: 3,
    baslik: '40 yaşında yüzme öğrenilir mi?',
    ozet: 'Yetişkin öğrencilerimizin en çok sorduğu soru. Kısa cevap: evet. Uzun cevap ve dikkat edilmesi gerekenler yazıda.',
    govde: `
      <p>Yetişkinlerin yüzme öğrenmesinin önündeki en büyük engel fiziksel değil, zihinseldir: “Bu yaştan sonra mı?” düşüncesi ve başkalarının önünde zorlanma kaygısı.</p>
      <h2>Birebir ders neden fark yaratır?</h2>
      <p>Birebir derste ne kalabalık bir grup ne de yetişmeniz gereken bir tempo vardır. Eğitmen tamamen sizinle ilgilenir; korkularınızı, hareket kısıtlarınızı ve hedeflerinizi bilir.</p>
      <h2>Ne kadar sürer?</h2>
      <p>Çoğu yetişkin öğrencimiz 8 derslik paketin sonunda kendi başına yüzebiliyor. Tekniği geliştirmek isteyenler için ikinci paket stil üzerine yoğunlaşır.</p>
      <h2>Sağlık açısından</h2>
      <p>Yüzme eklemlere yük bindirmeyen, tüm vücudu çalıştıran nadir sporlardandır. Bel ve boyun ağrısı yaşayanlar için de uygundur; yine de kronik bir rahatsızlığınız varsa başlamadan önce doktorunuza danışın.</p>`
  },
  {
    slug: 'taekwondo-cocuguma-ne-kazandirir',
    kategori: 'Taekwondo', tarih: '3 Ekim 2026', dakika: 4,
    baslik: 'Taekwondo çocuğuma ne kazandırır?',
    ozet: 'Tekme ve yumruktan çok daha fazlası: dikkat, saygı, sabır. Taekwondonun çocuk gelişimine katkılarını anlattık.',
    govde: `
      <p>Taekwondo derslerinin büyük kısmı disiplin ve tekrar üzerine kuruludur. Çocuk, bir hareketi doğru yapana kadar sabırla çalışmayı öğrenir. Bu alışkanlık okula ve hayatın geri kalanına da taşınır.</p>
      <h2>Öne çıkan kazanımlar</h2>
      <ul><li>Odaklanma ve dikkat süresi</li><li>Esneklik, denge ve koordinasyon</li><li>Kurallara ve arkadaşına saygı</li><li>Kendini koruma becerisi ve özgüven</li></ul>
      <h2>Hareketli çocuklar için</h2>
      <p>Enerjisi yüksek çocuklar, taekwondoda bu enerjiyi kontrollü ve kurallı bir şekilde kullanmayı öğrenir. Ailelerden en sık duyduğumuz geri bildirim: “Evde daha sakin, okulda daha dikkatli.”</p>
      <h2>Utangaç çocuklar için</h2>
      <p>Her yeni teknik ve her kuşak sınavı, çocuğa somut bir başarı hissi verir. Bu da zamanla kendine güveni artırır.</p>
      <blockquote>Sporla büyüyen çocuklar sadece fiziksel değil, zihinsel ve duygusal olarak da güçlenir.</blockquote>`
  },
  {
    slug: 'taekwondo-kusak-sistemi',
    kategori: 'Taekwondo', tarih: '21 Eylül 2026', dakika: 3,
    baslik: 'Taekwondo kuşak sistemi nasıl işler?',
    ozet: 'Beyazdan siyaha uzanan yolculuk: kuşaklar ne anlama gelir, sınavlarda neye bakılır, ne kadar sürer?',
    govde: `
      <p>Taekwondoda kuşaklar, öğrencinin teknik seviyesini ve emeğini gösterir. Her yeni kuşak, bir öncekinde öğrenilenlerin üzerine inşa edilir.</p>
      <h2>Renk kuşaklar</h2>
      <p>Beyaz kuşakla başlanır; ardından sarı, yeşil, mavi ve kırmızı kuşaklar gelir. Ara kademelerle birlikte her renk, belirli teknikleri ve formları (poomsae) öğrenmeyi gerektirir.</p>
      <h2>Sınavlarda neye bakılır?</h2>
      <ul><li>Temel teknikler ve duruşlar</li><li>Seviyeye uygun poomsae</li><li>Esneklik ve kondisyon</li><li>Disiplin ve saygı</li></ul>
      <h2>Ne kadar sürer?</h2>
      <p>Düzenli antrenmanla bir sonraki kuşağa geçmek genellikle birkaç ay sürer. Siyah kuşak ise yıllar süren bir emeğin sonucudur; asıl kazanç da bu yolculuğun kendisidir.</p>`
  },
  {
    slug: 'yetiskinler-icin-kickboks-ilk-antrenman',
    kategori: 'Kickboks', tarih: '20 Eylül 2026', dakika: 3,
    baslik: 'Yetişkinler için kickboks: ilk antrenmanda neler olur?',
    ozet: 'Hiç dövüş sporu yapmadıysanız endişelenmeyin. İlk derste neler yaptığımızı adım adım anlattık.',
    govde: `
      <p>İlk antrenman tamamen temel üzerine kuruludur: ısınma, duruş (gard), adım çalışması ve temel yumruk teknikleri. Kimseyle dövüşmezsiniz; önce doğru duruşu ve nefesi öğrenirsiniz.</p>
      <h2>Antrenmanın akışı</h2>
      <ul><li>10 dakika ısınma ve esneme</li><li>Gard ve adım çalışması</li><li>Jab, kroşe ve temel tekmeler</li><li>Kum torbası ya da pao ile kısa setler</li><li>Soğuma</li></ul>
      <h2>Yanınızda ne getirmelisiniz?</h2>
      <ul><li>Rahat spor kıyafeti</li><li>Su</li><li>Havlu</li></ul>
      <p>Eldiven ve bandaj konusunda ilk derslerde size yardımcı oluyoruz.</p>`
  },
  {
    slug: 'havuzdan-sonra-kulak-cilt-sac',
    kategori: 'Sağlık', tarih: '14 Eylül 2026', dakika: 3,
    baslik: 'Havuzdan sonra kulak, cilt ve saç bakımı',
    ozet: 'Klorlu su cilt ve saçı kurutabilir, kulakta su kalması rahatsız edebilir. Basit önlemlerle havuz keyfini sürdürün.',
    govde: `
      <p>Düzenli yüzenler için küçük bakım alışkanlıkları büyük fark yaratır.</p>
      <h2>Kulak</h2>
      <p>Yüzdükten sonra başınızı yana eğip kulaktaki suyun akmasını sağlayın, dış kulağı havluyla nazikçe kurulayın. Kulak çubuğunu kulak kanalına sokmayın. Sık kulak rahatsızlığı yaşıyorsanız silikon kulak tıkacı kullanabilirsiniz.</p>
      <h2>Cilt</h2>
      <p>Havuzdan çıkar çıkmaz duş almak klorun cilt üzerinde kalmasını önler. Ardından nemlendirici kullanmak kuruluğu azaltır.</p>
      <h2>Saç</h2>
      <p>Havuza girmeden önce saçı tatlı suyla ıslatmak, saçın klorlu suyu daha az emmesini sağlar. Bone kullanmak hem hijyen hem saç sağlığı için önemlidir.</p>`
  }
];
