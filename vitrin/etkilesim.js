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
  var gozcu = null;
  if (!sakin && 'IntersectionObserver' in window) {
    gozcu = new IntersectionObserver(
      function (girisler) {
        for (var i = 0; i < girisler.length; i++) {
          if (!girisler[i].isIntersecting) continue;
          girisler[i].target.className += ' gorundu';
          gozcu.unobserve(girisler[i].target);      // bir kez belirir, sonra rahat bırakılır
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 }
    );
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
  var hikaye = document.querySelector('.hikaye');
  if (hikaye && gozcu) {
    // Gizleme ancak buraya gelindiyse başlar: betik çalışmıyorsa hiçbir şey gizlenmez.
    hikaye.className += ' js-hikaye';

    var adimlar = hikaye.querySelectorAll('.hikaye-adim');
    for (var a = 0; a < adimlar.length; a++) gozcu.observe(adimlar[a]);
  }

  // İç operasyon blokları (#operasyon) aynı şekilde belirir; betiksiz üçü de baştan görünür.
  var operasyon = document.querySelector('.operasyon');
  if (operasyon && gozcu) {
    operasyon.className += ' js-operasyon';
    var bloklar = operasyon.querySelectorAll('.operasyon-blok');
    for (var b = 0; b < bloklar.length; b++) gozcu.observe(bloklar[b]);
  }

  // ---------------------------------------------------------------
  // 3. Check-up panosu — görününce çubuklar ve halka dolar
  // ---------------------------------------------------------------
  var pano = document.querySelector('.pano');
  if (pano && gozcu) {
    pano.className += ' js-pano';               // boşaltma da ancak burada başlar
    gozcu.observe(pano);
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

      var mesaj = {
        ad_soyad: al('ad_soyad'),
        otel_adi: al('otel_adi') || null,
        telefon:  al('telefon'),
        eposta:   al('eposta'),
        konu:     al('konu'),
        mesaj:    al('mesaj') || null
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

  function goster(hedef) {
    for (var d = 0; d < dugmeler.length; d++) {
      dugmeler[d].setAttribute('aria-pressed', dugmeler[d].getAttribute('data-hedef') === hedef ? 'true' : 'false');
    }
    for (var e = 0; e < ekranlar.length; e++) {
      ekranlar[e].hidden = ekranlar[e].getAttribute('data-ekran') !== hedef;
    }
  }

  for (var i = 0; i < dugmeler.length; i++) {
    (function (dugme) {
      dugme.addEventListener('click', function () {
        goster(dugme.getAttribute('data-hedef'));
      });
    })(dugmeler[i]);
  }

  // Açılışta ilk başlık seçilidir; diğer üç ekran bu satırla kapanır.
  goster(dugmeler[0].getAttribute('data-hedef'));
})();
