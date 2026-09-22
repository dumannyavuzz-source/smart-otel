// OtelDijital vitrin — beş küçük etkileşim. Kütüphane yok, birkaç düzine satır var.
//
//   1. Döngü hikâyesi ve iç operasyon blokları: kullanıcı aşağı kaydırdıkça sırayla belirir.
//   2. Keşif alanı: başlığa dokununca telefondaki ekran değişir.
//   3. Check-up panosu: görüş alanına girince çubuklar ve halka dolar.
//   4. İletişim formu: "Gönder" mesajı Ortak Beyin'e (Supabase) yazar, sayfa yenilenmeden onay gösterir.
//   5. Üst çubuk: sayfa kaydırılınca altına ince bir çizgi gelir (hero ile aynı zeminden ayrılsın diye).
//
// İlk üçü ve beşincisi betiksiz de anlamlıdır — sayfa bu dosya hiç yüklenmese bile eksik görünmez:
//   * Hikâye adımları baştan görünür durur (gizleme sınıfını bu dosya ekler).
//   * Keşif ekranlarının dördü de HTML'de açıktır; bu dosya yalnızca birini bırakır.
//   * Pano baştan doludur; bu dosya yalnızca "dolma" hareketini ekler.
// Form ise betik ister; betik yoksa formun içindeki <noscript> notu e-posta adresini gösterir.

(function () {
  'use strict';

  var sakinIstek = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var sakin = !!(sakinIstek && sakinIstek.matches);

  // Kaydırdıkça beliren şeylerin ortak gözcüsü. Hareket istemeyende ya da eski tarayıcıda
  // hiç kurulmaz; o zaman aşağıdaki iki bölüm hiçbir şeyi gizlemez.
  //
  // İÇERİK ASLA BETİĞE EMANET EDİLMEZ (denetim · Madde 11). Üç katmanlı koruma vardır:
  //   1. Gizleme sınıfını betik ekler. Betik hiç yüklenmezse ya da hata verirse hiçbir şey gizlenmez.
  //   2. Sayfa açıldığında EKRANDA OLAN hiçbir şey gizlenmez; yalnızca aşağıda kalanlar beklemeye alınır.
  //   3. Gözcü hiç çalışmazsa (tarayıcı hatası, garip bir ortam) üç saniye sonra her şey açılır.
  // Ayrıca yazdırmada ve hareket istemeyen kullanıcıda gizleme hiç devreye girmez (stil.css).
  var gozcu = null;
  var gozcuCalisti = false;

  // Gizli kalmış ne varsa açar. Güvenlik ağı ve yazdırma dışında çağrılmaz.
  function hepsiniAc() {
    var kalanlar = document.querySelectorAll('.js-hikaye .hikaye-adim:not(.gorundu), .js-operasyon .operasyon-blok:not(.gorundu), .js-pano:not(.gorundu)');
    for (var i = 0; i < kalanlar.length; i++) kalanlar[i].className += ' gorundu';
  }

  if (!sakin && 'IntersectionObserver' in window) {
    gozcu = new IntersectionObserver(
      function (girisler) {
        gozcuCalisti = true;                        // gözcü sağ: güvenlik ağına gerek yok
        for (var i = 0; i < girisler.length; i++) {
          if (!girisler[i].isIntersecting) continue;
          girisler[i].target.className += ' gorundu';
          gozcu.unobserve(girisler[i].target);      // bir kez belirir, sonra rahat bırakılır
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 }
    );

    // Güvenlik ağı. Gözcü normalde ilk çağrısını hemen yapar (kesişmeyen öğeler için bile).
    // Üç saniye geçtiği hâlde bir kez bile çalışmadıysa bir terslik var demektir: içerik açılır.
    window.setTimeout(function () {
      if (!gozcuCalisti) hepsiniAc();
    }, 3000);
  }

  // Öğe şu anda ekranda mı? Ekrandakiler hiç gizlenmez.
  function ekranda(oge) {
    var k = oge.getBoundingClientRect();
    return k.top < (window.innerHeight || 0) && k.bottom > 0;
  }

  // Bir bölümü "kaydırınca belirir" hâline getirir. Hata olursa gizlemeyi geri alır:
  // yarım kalmış bir kurulum yüzünden içerik kaybolmasın.
  function belirenleriKur(kapsayici, secici, sinif) {
    if (!kapsayici || !gozcu) return;
    var ogeler = kapsayici.querySelectorAll(secici);
    if (!ogeler.length) return;
    try {
      kapsayici.className += ' ' + sinif;
      for (var i = 0; i < ogeler.length; i++) {
        if (ekranda(ogeler[i])) ogeler[i].className += ' gorundu';
        else gozcu.observe(ogeler[i]);
      }
    } catch (e) {
      kapsayici.className = kapsayici.className.replace(' ' + sinif, '');
    }
  }

  // "Betik çalışıyor" işareti. Stil dosyası buna bakar: menü ancak betik varsa açılır kutuya döner.
  // Betik yoksa menü HTML'deki <details open> sayesinde açık kalır ve hiçbir sayfa erişilmez olmaz.
  document.documentElement.className += ' js';

  // ---------------------------------------------------------------
  // 6. Menü — dar ekranda açılır kutu (denetim · Madde 6)
  // ---------------------------------------------------------------
  // Açma/kapama işini <details> kendi yapar; burada yalnızca üç incelik var:
  // dar ekranda kapalı başlatmak, Esc ve dışarı tıklamayla kapatmak, odağı kutunun içinde tutmak.
  var menuKapsul = document.querySelector('.menu-kapsul');
  if (menuKapsul) {
    var darMi = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

    function menuyuAyarla() {
      // Geniş ekranda menü her zaman açık durur (orada zaten tek satırdır).
      menuKapsul.open = !(darMi && darMi.matches);
    }
    menuyuAyarla();
    if (darMi) {
      if (darMi.addEventListener) darMi.addEventListener('change', menuyuAyarla);
      else if (darMi.addListener) darMi.addListener(menuyuAyarla);        // eski tarayıcı
    }

    function kapat() {
      if (darMi && darMi.matches && menuKapsul.open) {
        menuKapsul.open = false;
        var dugme = menuKapsul.querySelector('summary');
        if (dugme) dugme.focus();
      }
    }

    // Esc kapatır.
    document.addEventListener('keydown', function (olay) {
      if (olay.key === 'Escape') kapat();
    });

    // Kutunun dışına dokunmak kapatır.
    document.addEventListener('click', function (olay) {
      if (!menuKapsul.contains(olay.target)) kapat();
    });

    // Bir sayfaya gidilince kutu arkada açık kalmasın.
    menuKapsul.addEventListener('click', function (olay) {
      if (olay.target && olay.target.closest && olay.target.closest('.menu a')) kapat();
    });

    // Odak tuzağı: kutu açıkken Tab, düğme ile son bağlantı arasında döner; odak arkadaki
    // sayfaya kaçmaz. Kapalıyken hiçbir şey yapmaz.
    menuKapsul.addEventListener('keydown', function (olay) {
      if (olay.key !== 'Tab' || !menuKapsul.open || !(darMi && darMi.matches)) return;
      var duraklar = menuKapsul.querySelectorAll('summary, .menu a');
      if (!duraklar.length) return;
      var ilk = duraklar[0], son = duraklar[duraklar.length - 1];
      if (olay.shiftKey && document.activeElement === ilk) { olay.preventDefault(); son.focus(); }
      else if (!olay.shiftKey && document.activeElement === son) { olay.preventDefault(); ilk.focus(); }
    });
  }

  // ---------------------------------------------------------------
  // 5. Üst çubuk — kaydırınca ince çizgi (sayfanın tepesinde hero ile aynı zemindedir, çizgi gerekmez)
  // ---------------------------------------------------------------
  var ust = document.querySelector('.ust');
  if (ust) {
    var cizgiyiAyarla = function () {
      var kaydi = window.scrollY > 8;
      var varMi = ust.className.indexOf(' ust--kaydi') !== -1;
      if (kaydi && !varMi) ust.className += ' ust--kaydi';
      else if (!kaydi && varMi) ust.className = ust.className.replace(' ust--kaydi', '');
    };
    window.addEventListener('scroll', cizgiyiAyarla, { passive: true });
    cizgiyiAyarla();
  }

  // ---------------------------------------------------------------
  // 1. Döngü hikâyesi — kaydırdıkça beliren adımlar
  // ---------------------------------------------------------------
  // Gizleme ancak betik buraya geldiyse başlar; ekranda olan adımlar hiç gizlenmez.
  belirenleriKur(document.querySelector('.hikaye'), '.hikaye-adim', 'js-hikaye');

  // İç operasyon blokları (#operasyon) aynı şekilde belirir; betiksiz üçü de baştan görünür.
  belirenleriKur(document.querySelector('.operasyon'), '.operasyon-blok', 'js-operasyon');

  // Yazdırmadan hemen önce her şey açılır: kâğıda boş bölüm basılmaz.
  if (window.matchMedia) {
    var yazdirma = window.matchMedia('print');
    if (yazdirma.addEventListener) yazdirma.addEventListener('change', function (o) { if (o.matches) hepsiniAc(); });
  }
  window.addEventListener('beforeprint', hepsiniAc);

  // ---------------------------------------------------------------
  // 3. Check-up panosu — görününce çubuklar ve halka dolar
  // ---------------------------------------------------------------
  var pano = document.querySelector('.pano');
  if (pano && gozcu) {
    try {
      pano.className += ' js-pano';             // boşaltma da ancak burada başlar
      if (ekranda(pano)) pano.className += ' gorundu';
      else gozcu.observe(pano);
    } catch (e) {
      pano.className = pano.className.replace(' js-pano', '');   // hata olursa pano dolu kalır
    }
  }

  // ---------------------------------------------------------------
  // 4. İletişim formu — mesajı Ortak Beyin'e yazar, onay ekranını gösterir
  // ---------------------------------------------------------------
  // Adres ve ziyaretçi anahtarı ayarlar.js'den gelir (git'te yoktur; dağıtımda üretilir).
  // Ziyaretçi anahtarı tabloya yalnızca yazabilir, okuyamaz (docs/security/007-iletisim-formu.md).
  var form = document.querySelector('.form');
  if (form) {
    var ayar = window.OTELDIJITAL_AYARLAR || {};
    var gonderDugmesi = form.querySelector('button[type="submit"]');
    var hataNotu = form.querySelector('.form-durum');
    var onay = document.querySelector('.form-basari');

    function al(ad) { var alan = form.elements[ad]; return alan ? alan.value.trim() : ''; }

    function gonderilemedi() {
      if (hataNotu) hataNotu.hidden = false;
      if (gonderDugmesi) { gonderDugmesi.disabled = false; gonderDugmesi.textContent = 'Gönder'; }
    }

    // Alanlar yumuşakça kaybolur, yerini onay ekranı alır. Hareket istemeyende beklemeden.
    function alindi() {
      form.className += ' form--gidiyor';
      window.setTimeout(function () {
        form.hidden = true;
        if (onay) onay.hidden = false;
      }, sakin ? 0 : 350);
    }

    // Ölçüm haberleri: bu dosya yalnızca "oldu" der, sayan taraf olcum.js'dir.
    // Ayrı tutulmasının sebebi: ölçüm kalksa bile formun işleyişi hiç değişmesin.
    function haberVer(ad) {
      try { document.dispatchEvent(new CustomEvent('oteldijital:' + ad)); } catch (e) { /* eski tarayıcı */ }
    }

    // Formu doldurmaya başlamak da bir olaydır: kaç kişi başlayıp yarıda bıraktığını gösterir.
    var basladiSoylendi = false;
    form.addEventListener('input', function () {
      if (basladiSoylendi) return;
      basladiSoylendi = true;
      haberVer('form-basladi');
    });

    form.addEventListener('submit', function (olay) {
      olay.preventDefault();
      if (!form.reportValidity()) return;
      if (hataNotu) hataNotu.hidden = true;

      // Tuzak alan doluysa bir bot yazmıştır: "alındı" der, hiçbir şey göndermeyiz.
      if (al('bos_birakin')) { alindi(); return; }

      if (!ayar.url || !ayar.anahtar) { gonderilemedi(); return; }
      if (gonderDugmesi) { gonderDugmesi.disabled = true; gonderDugmesi.textContent = 'Gönderiliyor…'; }

      // KVKK onayı veriyle birlikte kaydedilir: "bu kişi şu tarihte kutuyu işaretledi" belgesi.
      // Veritabanı onaysız satırı zaten reddeder (…_iletisim_kvkk_onayi.sql); burası o kuralın eşi.
      var onayKutusu = form.elements['kvkk_onay'];
      var mesaj = {
        ad_soyad: al('ad_soyad'),
        otel_adi: al('otel_adi') || null,
        telefon:  al('telefon'),
        eposta:   al('eposta'),
        konu:     al('konu'),
        mesaj:    al('mesaj') || null,
        kvkk_onay: !!(onayKutusu && onayKutusu.checked)
      };

      // 15 saniyede cevap gelmezse bekletmeyiz: "gönderilemedi" ve e-posta adresi görünür.
      var kesici = ('AbortController' in window) ? new AbortController() : null;
      var sayac = kesici ? window.setTimeout(function () { kesici.abort(); }, 15000) : null;

      fetch(ayar.url + '/rest/v1/iletisim_formu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ayar.anahtar,
          'Authorization': 'Bearer ' + ayar.anahtar,
          'Prefer': 'return=minimal'          // cevapta satır isteme: ziyaretçinin okuma yetkisi yok
        },
        body: JSON.stringify(mesaj),
        signal: kesici ? kesici.signal : undefined
      })
        .then(function (cevap) {
          if (!cevap.ok) throw new Error('HTTP ' + cevap.status);
          haberVer('form-gonderildi');   // yalnızca burada: tuzağa düşen bot gönderim sayılmaz
          alindi();
        })
        .catch(gonderilemedi)
        .then(function () { if (sayac) window.clearTimeout(sayac); });
    });
  }

  // ---------------------------------------------------------------
  // 2. Keşif alanı — dokunulan başlığın ekranı gösterilir
  // ---------------------------------------------------------------
  var kesif = document.querySelector('.kesif');
  if (!kesif) return;

  var dugmeler = kesif.querySelectorAll('.kesif-dugme');
  var ekranlar = kesif.querySelectorAll('.kesif-ekran');
  if (!dugmeler.length || !ekranlar.length) return;

  // Bunlar gerçek SEKMEdir (WAI-ARIA tab deseni · denetim · Madde 10a). Üç kuralı vardır:
  //   1. Seçili sekme aria-selected="true" ve tabindex="0"; diğerleri "false" ve "-1".
  //      Böylece Tab tuşu sekme listesinde BİR kez durur, içinde ok tuşlarıyla gezilir.
  //   2. Her sekme aria-controls ile kendi panelini, her panel aria-labelledby ile sekmesini gösterir.
  //   3. Ok tuşuyla seçilen sekme aynı anda odağı da alır; Home/End ilk ve son sekmeye gider.
  function goster(hedef, odakla) {
    for (var d = 0; d < dugmeler.length; d++) {
      var bu = dugmeler[d].getAttribute('data-hedef') === hedef;
      dugmeler[d].setAttribute('aria-selected', bu ? 'true' : 'false');
      dugmeler[d].setAttribute('tabindex', bu ? '0' : '-1');
      if (bu && odakla) dugmeler[d].focus();
    }
    for (var e = 0; e < ekranlar.length; e++) {
      ekranlar[e].hidden = ekranlar[e].getAttribute('data-ekran') !== hedef;
    }
  }

  function sirada(adim) {
    for (var d = 0; d < dugmeler.length; d++) {
      if (dugmeler[d].getAttribute('aria-selected') === 'true') {
        var yeni = (d + adim + dugmeler.length) % dugmeler.length;   // başa/sona sarar
        return dugmeler[yeni].getAttribute('data-hedef');
      }
    }
    return dugmeler[0].getAttribute('data-hedef');
  }

  for (var i = 0; i < dugmeler.length; i++) {
    (function (dugme) {
      dugme.addEventListener('click', function () {
        goster(dugme.getAttribute('data-hedef'));
      });
    })(dugmeler[i]);
  }

  kesif.addEventListener('keydown', function (olay) {
    var t = olay.target;
    if (!t || t.getAttribute('role') !== 'tab') return;
    var git = null;
    if (olay.key === 'ArrowRight' || olay.key === 'ArrowDown') git = sirada(1);
    else if (olay.key === 'ArrowLeft' || olay.key === 'ArrowUp') git = sirada(-1);
    else if (olay.key === 'Home') git = dugmeler[0].getAttribute('data-hedef');
    else if (olay.key === 'End') git = dugmeler[dugmeler.length - 1].getAttribute('data-hedef');
    if (!git) return;
    olay.preventDefault();
    goster(git, true);
  });

  // Açılışta ilk başlık seçilidir; diğer üç ekran bu satırla kapanır.
  goster(dugmeler[0].getAttribute('data-hedef'));
})();
