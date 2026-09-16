// OtelDijital vitrin — canlı akış animasyonu.
//
// Tek işi var: otelde o an olan biteni gösteren örnek bildirimleri akıtmak.
// Sayfa ilk açıldığında liste ZATEN DOLUDUR (index.html içinde dört satır durur);
// bu dosya yalnızca üstüne yenilerini ekler. Böylece hareket engelliyse de sayfa eksik görünmez.
//
// Kural: her yeni satır önce "işleniyor" rozetiyle düşer, ~1,6 saniye sonra sonucuna döner.
// Gerçek üründeki akış da budur: beyan önce telefona yazılır, sonra sunucuya gider.

(function () {
  'use strict';

  var liste = document.getElementById('akisListesi');
  if (!liste) return;

  // Hareket istemeyen kullanıcı: liste olduğu gibi kalır, hiçbir şey kıpırdamaz.
  var sakinIstek = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (sakinIstek && sakinIstek.matches) return;

  var EN_FAZLA_SATIR = 4;
  var ARALIK_MS = 3400;
  var SONUC_GECIKMESI_MS = 1600;

  // kalin: satırın kalın yazılan başı · kuyruk: devamı
  var olaylar = [
    { ikon: '🧹', kalin: 'Oda 204', kuyruk: ' temizlendi', kim: 'Ayşe · kat görevlisi', rozet: '✓ Hazır', tur: 'tamam' },
    { ikon: '🔧', kalin: 'Klima arızası', kuyruk: ' bildirildi', kim: 'Oda 118 · 30 dk hedef', rozet: 'Teknisyene atandı', tur: 'atandi' },
    { ikon: '📦', kalin: '7,5 Kg domates', kuyruk: ' teslim alındı', kim: 'Fatura fotoğrafı eklendi', rozet: '✓ Kayıtta', tur: 'tamam' },
    { ikon: '💬', kalin: 'Oda 309', kuyruk: ' misafiri 2 yıldız verdi', kim: '"Oda soğuktu"', rozet: 'Müdüre bildirildi', tur: 'uyari' },
    { ikon: '🧺', kalin: 'Oda 511', kuyruk: ' için 2 havlu istendi', kim: 'Müdür onayı bekliyor', rozet: 'Onay bekliyor', tur: 'atandi' },
    { ikon: '🐜', kalin: 'Oda 122', kuyruk: ' böcek bildirimi', kim: 'Acil · fotoğraflı', rozet: 'Teknisyen yolda', tur: 'uyari' },
    { ikon: '✅', kalin: 'Musluk arızası', kuyruk: ' çözüldü', kim: 'Mehmet · 24 dakikada', rozet: '✓ Çözüldü', tur: 'tamam' },
    { ikon: '⚖️', kalin: '2 Kg eksik', kuyruk: ' geldi — 10 Kg onaylanmıştı', kim: 'Kanıt fotoğrafı eklendi', rozet: 'Müdüre bildirildi', tur: 'uyari' },
    { ikon: '🔑', kalin: 'Yeni personel', kuyruk: ' eklendi', kim: 'Zeynep · depo görevlisi', rozet: '✓ Tanımlandı', tur: 'tamam' },
    { ikon: '🛏️', kalin: 'Oda 402', kuyruk: ' hazır, misafir bekleniyor', kim: 'Vardiya · 14:05', rozet: '✓ Hazır', tur: 'tamam' }
  ];

  var sira = 0;
  var sayac = null;

  function satirYap(olay) {
    var li = document.createElement('li');
    li.className = 'olay olay--yeni';

    var ikon = document.createElement('span');
    ikon.className = 'olay-ikon';
    ikon.setAttribute('aria-hidden', 'true');
    ikon.textContent = olay.ikon;

    var metin = document.createElement('span');
    metin.className = 'olay-metin';

    var ustSatir = document.createElement('span');
    var kalin = document.createElement('b');
    kalin.textContent = olay.kalin;
    ustSatir.appendChild(kalin);
    ustSatir.appendChild(document.createTextNode(olay.kuyruk));

    var kim = document.createElement('span');
    kim.className = 'olay-kim';
    kim.textContent = olay.kim;

    metin.appendChild(ustSatir);
    metin.appendChild(kim);

    // Önce "işleniyor", sonra sonucu. Beklemeden sonuç yazmak gerçeği anlatmazdı.
    var rozet = document.createElement('span');
    rozet.className = 'rozet';
    rozet.textContent = 'işleniyor…';

    li.appendChild(ikon);
    li.appendChild(metin);
    li.appendChild(rozet);

    window.setTimeout(function () {
      rozet.textContent = olay.rozet;
      rozet.className = 'rozet rozet--' + olay.tur;
    }, SONUC_GECIKMESI_MS);

    return li;
  }

  function akit() {
    var olay = olaylar[sira % olaylar.length];
    sira += 1;

    liste.insertBefore(satirYap(olay), liste.firstChild);

    while (liste.children.length > EN_FAZLA_SATIR) {
      liste.removeChild(liste.lastElementChild);
    }
  }

  function basla() {
    if (sayac === null) sayac = window.setInterval(akit, ARALIK_MS);
  }

  function dur() {
    if (sayac !== null) {
      window.clearInterval(sayac);
      sayac = null;
    }
  }

  // Sekme arka plandayken boşuna çalışmaz; geri dönünce kaldığı yerden devam eder.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) dur();
    else basla();
  });

  basla();
})();
