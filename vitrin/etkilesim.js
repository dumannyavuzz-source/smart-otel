// OtelDijital vitrin — üç küçük etkileşim. Kütüphane yok, birkaç düzine satır var.
//
//   1. Döngü hikâyesi: kullanıcı aşağı kaydırdıkça dört adım sırayla belirir.
//   2. Keşif alanı: başlığa dokununca telefondaki ekran değişir.
//   3. Check-up panosu: görüş alanına girince çubuklar ve halka dolar.
//
// Üçü de betiksiz de anlamlıdır — sayfa bu dosya hiç yüklenmese bile eksik görünmez:
//   * Hikâye adımları baştan görünür durur (gizleme sınıfını bu dosya ekler).
//   * Keşif ekranlarının dördü de HTML'de açıktır; bu dosya yalnızca birini bırakır.
//   * Pano baştan doludur; bu dosya yalnızca "dolma" hareketini ekler.

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

  // ---------------------------------------------------------------
  // 3. Check-up panosu — görününce çubuklar ve halka dolar
  // ---------------------------------------------------------------
  var pano = document.querySelector('.pano');
  if (pano && gozcu) {
    pano.className += ' js-pano';               // boşaltma da ancak burada başlar
    gozcu.observe(pano);
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
