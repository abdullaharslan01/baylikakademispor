// DEMO blog yazıları. TODO (panel): yayında /api/blog.php'den gelir; her yazı /blog/slug adresinde sunucuda üretilir.
// Alanlar panelin yazı yapısıyla aynı: slug, baslik, ozet, kategori, tarih, dakika, govde (HTML).
// Kapak fotoğrafları Unsplash'tan (Unsplash Lisansı: ücretsiz, ticari kullanım serbest): public/img/blog/<slug>.jpg

export const KATEGORILER = ['Yüzme', 'Taekwondo', 'Kickboks', 'Sağlık'];

// Göreli adres: hem yerelde hem GitHub Pages alt klasöründe çalışır
export const kapakUrl = y => new URL(`../img/blog/${y.slug}.jpg`, import.meta.url).href;

export const YAZILAR = [
  {
    slug: 'kurbagalama-ayak-vurusu',
    kategori: 'Yüzme', tarih: '28 Ekim 2026', dakika: 4,
    baslik: 'Kurbağalamada ayak vuruşu: ilerlemenin asıl kaynağı',
    ozet: 'Kurbağalamada itişin büyük kısmı ayaklardan gelir. Doğru vuruşu üç adımda öğrenin, sık yapılan hataları düzeltin.',
    govde: `
      <p>Kurbağalama, yeni başlayanların en rahat öğrendiği stillerden biridir; çünkü baş suyun üstünde kalabilir ve nefes almak kolaydır. Ama bu stilde hızı belirleyen kollar değil, ayaklardır.</p>
      <h2>1. Topukları kalçaya yaklaştır</h2>
      <p>Dizleri fazla açmadan, topukları kontrollü şekilde kalçaya doğru çek. Dizler omuz genişliğinden biraz dar kalmalı.</p>
      <h2>2. Ayak uçlarını dışa çevir</h2>
      <p>Suyu iten yüzey ayak tabanı ve iç bilektir. Ayak uçlarını dışa çevirerek “kurbağa ayağı” pozisyonu al.</p>
      <h2>3. Suyu geriye it ve kapan</h2>
      <p>Ayaklarını yarım daire çizerek geriye ve içe doğru it, vuruşun sonunda bacakları birleştirip birkaç saniye süzül.</p>
      <blockquote>Süzülme anını atlamak, en sık yapılan hatadır. Vuruştan sonra vücudun suyun içinde ilerlemesine izin ver.</blockquote>
      <h2>Sık yapılan hatalar</h2>
      <ul><li>Dizleri karna doğru çok fazla çekmek</li><li>Ayakları dışa çevirmeden vurmak (makas vuruşu)</li><li>Vuruş biter bitmez yeni çekişe başlamak</li></ul>
      <p>Birebir derslerimizde ayak vuruşunu önce kenara tutunarak, sonra tahta (kickboard) ile, en sonunda tam stille çalışıyoruz.</p>`
  },
  {
    slug: 'yuzme-cantasinda-neler-olmali',
    kategori: 'Yüzme', tarih: '26 Ekim 2026', dakika: 3,
    baslik: 'Yüzme dersine giderken çantada neler olmalı?',
    ozet: 'İlk derse gelirken ne getirmeli, ne getirmemeli? Çocuklar ve yetişkinler için kısa bir kontrol listesi.',
    govde: `
      <p>Doğru hazırlanmak, ilk dersin keyfini doğrudan etkiler. Unutulan bir bone ya da gözlük, özellikle çocuklar için dersi zorlaştırabilir.</p>
      <h2>Mutlaka olması gerekenler</h2>
      <ul><li>Mayo (yetişkin erkekler için şort yerine dar kesim mayo önerilir)</li><li>Silikon bone</li><li>Yüze tam oturan bir gözlük</li><li>Havlu ya da bornoz</li><li>Terlik</li><li>Şampuan ve duş jeli</li></ul>
      <h2>Olsa iyi olur</h2>
      <ul><li>Su şişesi: havuzda da terlenir, su içmeyi unutmayın</li><li>Kulak tıkacı: sık kulak rahatsızlığı yaşayanlar için</li><li>Küçük bir atıştırmalık: özellikle okul sonrası derse gelen çocuklar için</li></ul>
      <h2>Getirmenize gerek olmayanlar</h2>
      <p>Kolluk, tahta (kickboard) ve pul boy gibi eğitim malzemelerini biz sağlıyoruz. İlk derste ihtiyaç duyulan her şey havuzda hazır.</p>`
  },
  {
    slug: 'sirtustu-yuzmede-denge',
    kategori: 'Yüzme', tarih: '22 Ekim 2026', dakika: 3,
    baslik: 'Sırtüstü yüzmede dengede kalmanın sırrı',
    ozet: 'Sırtüstü yüzerken kalçanız batıyorsa sorun büyük ihtimalle başınızın pozisyonunda. Dengeyi kuran üç küçük ayar.',
    govde: `
      <p>Sırtüstü yüzme, nefes alma derdi olmadığı için birçok kişiye kolay gelir. Ama dengeyi kuramayan yüzücünün kalçası batar, ilerlemek zorlaşır.</p>
      <h2>Baş: kulaklar suyun içinde</h2>
      <p>Başını kaldırıp ayaklarına bakmak kalçanın batmasına yol açar. Kulaklarının suyun içinde kaldığı, gözlerinin tavana baktığı pozisyon en dengeli olanıdır.</p>
      <h2>Kalça: yüzeye yakın</h2>
      <p>Karın kaslarını hafifçe sıkarak kalçayı yüzeye yakın tut. Vücut bir sal gibi düz olmalı.</p>
      <h2>Ayaklar: dizden değil kalçadan</h2>
      <p>Ayak vuruşu bisiklet çevirir gibi dizden değil, kalçadan başlamalı; diz su yüzeyini kırmamalı.</p>
      <p>Derslerde önce eğitmen desteğiyle süzülmeyi, sonra tek başına sırtüstü durmayı, en sonunda kol çekişini ekliyoruz.</p>`
  },
  {
    slug: 'guvenli-ilk-balikama-atlayis',
    kategori: 'Yüzme', tarih: '19 Ekim 2026', dakika: 4,
    baslik: 'Güvenli ilk balıklama: adım adım atlayış',
    ozet: 'Balıklama atlayış heyecanlıdır ama yanlış yapıldığında tehlikeli olabilir. Güvenli ilk atlayış için izlediğimiz sıra.',
    govde: `
      <p>Balıklama, yüzmeyi öğrenen her öğrencinin en çok merak ettiği konudur. Güvenlik için tek kural: yeterince derin suda ve eğitmen eşliğinde atlamak.</p>
      <h2>1. Oturarak başla</h2>
      <p>Havuz kenarına oturup kolları kulakların yanında öne uzat, eller üst üste olsun. Öne doğru eğilerek suya kaydır.</p>
      <h2>2. Diz çökerek</h2>
      <p>Tek diz üzerinde dururken aynı kol pozisyonuyla suya gir. Baş kolların arasında kalmalı, çene göğse yakın.</p>
      <h2>3. Ayakta, öne eğilerek</h2>
      <p>Ayak parmakları kenarı kavrasın, dizler hafif bükülü. Önce eller, sonra baş, en son ayaklar suya girer.</p>
      <h2>4. Çıkış bloğundan</h2>
      <p>Bloktan atlayış, ancak kenardan atlayış güvenle yapıldıktan sonra çalışılır. Bacaklarla güçlü bir itiş ve kısa bir uçuş, suya “tek bir noktadan” giriş hedeflenir.</p>
      <blockquote>Sığ suya asla balıklama atlanmaz. Havuzun derinlik işaretlerine her zaman dikkat edin.</blockquote>`
  },
  {
    slug: 'cocuklarda-su-guvenligi',
    kategori: 'Sağlık', tarih: '16 Ekim 2026', dakika: 4,
    baslik: 'Çocuklarda su güvenliği: ailelere 7 kural',
    ozet: 'Çocuk yüzme bilse de bilmese de suyun yanında dikkat şart. Havuzda, denizde ve evde uygulanacak 7 basit kural.',
    govde: `
      <p>Yüzme bilmek önemli bir güvenlik becerisidir; ama tek başına yeterli değildir. Aşağıdaki kurallar her aile için geçerli.</p>
      <ul>
        <li><strong>Gözünüz üzerinde olsun.</strong> Telefona bakılan birkaç saniye bile risklidir.</li>
        <li><strong>Kolluk can yeleği değildir.</strong> Şişme oyuncaklar güvenlik ekipmanı yerine geçmez.</li>
        <li><strong>Derinliği öğretin.</strong> Çocuk, ayağının yere basmadığı yerleri bilmeli.</li>
        <li><strong>Koşmak yok.</strong> Havuz kenarı kaygandır.</li>
        <li><strong>Yemekten hemen sonra değil.</strong> Hafif bir atıştırmalık sonrası suya girmek daha rahattır.</li>
        <li><strong>Yardım istemeyi öğretin.</strong> El sallamak ve bağırmak utanılacak bir şey değildir.</li>
        <li><strong>Evde de dikkat.</strong> Küvet ve kovalar küçük çocuklar için de risklidir.</li>
      </ul>
      <p>Derslerimizde yüzme tekniğinin yanında suda sakin kalmayı, sırtüstü dinlenmeyi ve kenara güvenle ulaşmayı da çalışıyoruz.</p>`
  },
  {
    slug: 'taekwondoda-esneklik-evde-egzersiz',
    kategori: 'Taekwondo', tarih: '9 Ekim 2026', dakika: 3,
    baslik: 'Taekwondoda esneklik: evde yapılabilecek 5 egzersiz',
    ozet: 'Yüksek tekmelerin sırrı esneklikte. Çocukların derslerin arasında evde güvenle yapabileceği beş kısa egzersiz.',
    govde: `
      <p>Esneklik bir günde kazanılmaz; düzenli ve zorlamadan yapılan kısa çalışmalar en iyi sonucu verir. Egzersizlerden önce birkaç dakika yerinde koşarak ısının.</p>
      <h2>1. Kelebek</h2><p>Otur, ayak tabanlarını birleştir, dizleri yavaşça yere doğru indir. 30 saniye.</p>
      <h2>2. Öne uzanma</h2><p>Bacaklar düz, ellerle ayak bileklerine uzan. Sırtı yuvarlamadan 30 saniye.</p>
      <h2>3. Yan açılma</h2><p>Bacakları rahat açabildiğin kadar aç, gövdeyi öne eğ. 30 saniye.</p>
      <h2>4. Hamle esnemesi</h2><p>Bir bacak önde dizden bükülü, diğeri geride düz. Kalçayı aşağı indir. Her bacak için 20 saniye.</p>
      <h2>5. Duvar destekli bacak kaldırma</h2><p>Duvara tutunarak bacağı öne, yana ve arkaya kontrollü kaldır. Her yön 8 tekrar.</p>
      <blockquote>Esneme acıtmamalı. Hafif bir gerginlik yeterli; acı hissediliyorsa durun.</blockquote>`
  },
  {
    slug: 'kickboks-ile-kondisyon',
    kategori: 'Kickboks', tarih: '1 Ekim 2026', dakika: 3,
    baslik: 'Kickboksla kondisyon: haftada kaç gün çalışmalı?',
    ozet: 'Kondisyon kazanmak için her gün antrenman şart değil. Yeni başlayanlar için dengeli bir haftalık plan.',
    govde: `
      <p>Kickboks hem kardiyo hem kuvvet çalışmasıdır. Bu yüzden toparlanma günleri en az antrenman günleri kadar önemlidir.</p>
      <h2>Yeni başlayanlar: haftada 2–3 gün</h2>
      <p>İlk iki ay haftada iki ya da üç antrenman, tekniği oturtmak ve vücudu alıştırmak için idealdir. Aradaki günlerde yürüyüş ya da hafif esneme yeterli.</p>
      <h2>Bir antrenmanda neler var?</h2>
      <ul><li>İp atlama ve ısınma</li><li>Gölge boks: teknik ve ayak çalışması</li><li>Kum torbası ya da pao turları</li><li>Kuvvet ve karın çalışması</li><li>Soğuma ve esneme</li></ul>
      <h2>Ne zaman artırmalı?</h2>
      <p>Antrenman sonrası ertesi gün hâlâ yorgunluk hissediyorsanız erken demektir. Kendinizi zinde hissettiğinizde haftalık gün sayısını bir artırabilirsiniz.</p>`
  },
  {
    slug: 'spor-sonrasi-cocuk-beslenmesi',
    kategori: 'Sağlık', tarih: '25 Eylül 2026', dakika: 3,
    baslik: 'Antrenman sonrası çocuklar ne yemeli?',
    ozet: 'Yüzme ya da taekwondo sonrası acıkan çocuklar için pratik, evde kolayca hazırlanabilecek atıştırmalık önerileri.',
    govde: `
      <p>Antrenman sonrası ilk bir saat, vücudun enerji depolarını yenilemesi için önemlidir. Ağır yemekler yerine hafif ve dengeli atıştırmalıklar tercih edin.</p>
      <h2>Pratik öneriler</h2>
      <ul><li>Muz ve bir bardak süt</li><li>Peynirli tam buğday sandviç</li><li>Yoğurt ve meyve</li><li>Bir avuç kuruyemiş ve kuru meyve (yaşa uygun)</li><li>Haşlanmış yumurta</li></ul>
      <h2>Su unutulmasın</h2>
      <p>Havuzda terlediğini fark etmeyiz ama vücut su kaybeder. Antrenman öncesi, sırası ve sonrasında su içmeyi alışkanlık hâline getirin.</p>
      <p><em>Bu yazı genel bilgilendirme amaçlıdır; özel beslenme ihtiyacı olan çocuklar için uzmana danışın.</em></p>`
  },
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

const AY = { Ocak: 1, Şubat: 2, Mart: 3, Nisan: 4, Mayıs: 5, Haziran: 6, Temmuz: 7, Ağustos: 8, Eylül: 9, Ekim: 10, Kasım: 11, Aralık: 12 };
const sira = y => { const [g, a, yil] = y.tarih.split(' '); return +yil * 10000 + AY[a] * 100 + +g; };
YAZILAR.sort((a, b) => sira(b) - sira(a));
