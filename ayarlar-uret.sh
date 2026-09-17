#!/bin/sh
# =====================================================================
# Vercel derleme komutu: ortam değişkenlerinden ayarlar.js üretir.
#
# Anahtar git'te değil, Vercel'in ortam değişkenlerinde durur (CLAUDE.md · 1.3).
# Bir şey eksik ya da yanlışsa dağıtım BURADA DURUR; bozuk ya da tehlikeli bir ayar yayına çıkmaz:
#   · değişken eksikse
#   · anahtar bir GİZLİ anahtarsa (sb_secret_… ya da rolü service_role olan bir JWT) — bu anahtar
#     her tarayıcıya gider; kilitleri atlar. Yalnızca ziyaretçi (anon) anahtarı yayınlanır.
#   · adres https://<proje>.supabase.co biçiminde değilse
#
# Dosya DEPO KÖKÜNDE durur (Vercel derlemeyi kökten başlatır) ve vitrin/ayarlar.js üretir.
# Nereden çağrılırsa çağrılsın çalışır: önce kendi bulunduğu klasöre gider.
#
# Vercel ayarı (vitrin projesi): Root Directory boş (depo kökü) · Build Command = sh ayarlar-uret.sh ·
# Output Directory = vitrin · Ortam değişkenleri: SUPABASE_URL, SUPABASE_ANON_KEY
# (docs/deployment-checklist.md · 6.1 ve 6.7)
# =====================================================================
set -eu
cd "$(dirname "$0")/vitrin"

: "${SUPABASE_URL:?SUPABASE_URL eksik (Vercel → Settings → Environment Variables)}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY eksik (Vercel → Settings → Environment Variables)}"

# JWT biçimindeki anahtarın gövdesinden "role" alanını okur; JWT değilse boş döner.
anahtar_rolu() {
  govde=$(printf '%s' "$1" | cut -d. -f2 | tr '_-' '/+')
  case $(( ${#govde} % 4 )) in
    2) govde="${govde}==" ;;
    3) govde="${govde}=" ;;
  esac
  printf '%s' "$govde" | base64 -d 2>/dev/null | tr -d '\n' | sed -n 's/.*"role" *: *"\([^"]*\)".*/\1/p'
}

case "$SUPABASE_ANON_KEY" in
  sb_secret_*)
    echo "HATA: SUPABASE_ANON_KEY bir GİZLİ anahtar (sb_secret_…). Tarayıcıya yalnızca ziyaretçi anahtarı gider." >&2
    exit 1 ;;
  sb_publishable_*)
    ;;                                  # yeni tip ziyaretçi anahtarı: tamam
  eyJ*)
    rol=$(anahtar_rolu "$SUPABASE_ANON_KEY")
    if [ "$rol" != "anon" ]; then
      echo "HATA: anahtarın rolü '${rol:-okunamadı}'; ziyaretçi anahtarının rolü 'anon' olmalı." >&2
      exit 1
    fi ;;
  *)
    echo "HATA: SUPABASE_ANON_KEY tanınan bir anahtar biçiminde değil." >&2
    exit 1 ;;
esac

case "$SUPABASE_URL" in
  https://*.supabase.co) ;;
  *) echo "HATA: SUPABASE_URL https://<proje>.supabase.co biçiminde olmalı." >&2; exit 1 ;;
esac

printf 'window.OTELDIJITAL_AYARLAR = { url: "%s", anahtar: "%s" };\n' "$SUPABASE_URL" "$SUPABASE_ANON_KEY" > ayarlar.js
echo "ayarlar.js üretildi."
