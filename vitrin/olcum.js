// OtelDijital vitrin — olay ölçümü. Çerez yok, kişisel veri yok, üçüncü parti istek yok.
//
// NEDEN VAR?
//   Sitede hiçbir ölçüm yoktu: kaç ziyaretçinin geldiği, kaçının denemeye bastığı, formu kaç
//   kişinin yarıda bıraktığı bilinmiyordu. Denetim raporu (Madde 5) bunu kritik saydı, çünkü bu
//   madde kapanmadan diğer düzeltmelerin etkisi ölçülemez.
//
// NEDEN CSP GEVŞETİLMEDİ?
//   İçerik güvenlik politikamız script-src 'self' der: sayfa yalnızca kendi alan adından betik
//   yükler. Sayaç betiği de kendi alan adımızdan gelir — Vercel onu /istatistik/script.js
//   adresinde sağlayıcıya yönlendirir (vercel.json · rewrites). Olaylar da /istatistik/olay
//   adresine gider, yani yine kendi alan adımıza; connect-src 'self' zaten buna izin verir.
//   Sonuç: tarayıcı üçüncü parti bir adrese HİÇ bağlanmaz ve CSP'ye tek bir karakter eklenmedi.
//   unsafe-inline de eklenmedi: aşağıdaki kuyruk hilesi bu dosyanın içinde durduğu için satır içi
//   betiğe gerek kalmadı.
//
// SAĞLAYICI DEĞİŞİRSE: yalnızca gonder() işlevi ve vercel.json'daki iki yönlendirme değişir.
// Ölçülen olaylar ve bu dosyanın geri kalanı aynı kalır.

(function () {
  'use strict';

  // Sayaç betiği henüz yüklenmemiş olabilir; çağrılar kuyrukta bekler (Plausible'ın kendi deseni).
  // Bu satır normalde sayfaya satır içi yazılır; CSP satır içi betiğe izin vermediği için buradadır.
  window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };

  // Tek kapı: sağlayıcı değişirse yalnızca burası değişir.
  function gonder(ad, ozellikler) {
    try {
      if (window.umami && typeof window.umami.track === 'function') { window.umami.track(ad, ozellikler); return; }
      window.plausible(ad, ozellikler ? { props: ozellikler } : undefined);
    } catch (e) {
      /* Ölçüm asla sayfayı bozmaz: sayaç yoksa da site çalışır. */
    }
  }

  // Tıklanan şey hangi bölümdeydi? Bölüm kimliği (id) doğrudan kullanılır: #nedir, #tarife, #kapilar…
  // Böylece "hangi bölümdeki düğme çalışıyor?" sorusu cevaplanır (denetimin açık isteği).
  function bolumAdi(oge) {
    var kap = oge.closest ? oge.closest('section[id], header, footer') : null;
    if (!kap) return 'bilinmiyor';
    if (kap.id) return kap.id;
    if (kap.tagName === 'HEADER') return 'ust-cubuk';
    if (kap.tagName === 'FOOTER') return 'alt-bolum';
    return 'bilinmiyor';
  }

  // ---------------------------------------------------------------
  // Bağlantı tıklamaları — tek bir gözcüyle, her sayfada aynı
  // ---------------------------------------------------------------
  document.addEventListener('click', function (olay) {
    var bag = olay.target && olay.target.closest ? olay.target.closest('a') : null;
    if (!bag) return;
    var adres = bag.getAttribute('href') || '';

    if (adres.indexOf('app.oteldijital.com/kayit') !== -1) {
      gonder('Deneme kaydı', { bolum: bolumAdi(bag), metin: (bag.textContent || '').trim().slice(0, 40) });
    } else if (adres.indexOf('app.oteldijital.com/giris') !== -1) {
      gonder('Giriş yap', { bolum: bolumAdi(bag) });
    } else if (adres.indexOf('mailto:') === 0) {
      gonder('E-posta', { bolum: bolumAdi(bag) });
    } else if (adres.indexOf('tel:') === 0) {
      gonder('Telefon', { bolum: bolumAdi(bag) });
    } else if (adres.indexOf('https://wa.me/') === 0) {
      gonder('WhatsApp', { bolum: bolumAdi(bag) });
    } else if (adres === '/iletisim') {
      // "Bilgi Al", "Teknik Destek Al", "Teklif Alın" — hizmet sayfalarının tek çağrısı
      gonder('İletişime git', { bolum: bolumAdi(bag), metin: (bag.textContent || '').trim().slice(0, 40) });
    } else if (adres === '/fiyatlandirma') {
      gonder('Fiyatlara git', { bolum: bolumAdi(bag) });
    }
  }, true);

  // ---------------------------------------------------------------
  // İletişim formu — başlangıç ve gönderim
  // ---------------------------------------------------------------
  // Formu etkilesim.js yönetir; o dosya iki haber salar ve burası yalnızca dinler.
  // Böylece ölçüm, formun işleyişine hiç karışmaz: ölçüm kalksa bile form aynen çalışır.
  document.addEventListener('oteldijital:form-basladi', function () {
    gonder('Form başladı');
  });
  document.addEventListener('oteldijital:form-gonderildi', function () {
    gonder('Form gönderildi');
  });
})();
