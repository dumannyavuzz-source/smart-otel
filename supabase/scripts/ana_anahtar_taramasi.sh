#!/usr/bin/env bash
# =====================================================================
# 22. DENEME — Ana anahtar (service key) kodda veya git geçmişinde var mı?
# Kaynak: docs/security/001-rls-and-maker-checker.md · Bölüm 6, madde 22
#
# Beklenen: hiçbir şey bulunmaz. Bulunursa çıkış kodu 1 (veto).
# Çalıştırmak: bash supabase/scripts/ana_anahtar_taramasi.sh
# =====================================================================
set -u
cd "$(dirname "$0")/../.."

# Aranan izler:
#   - Supabase anahtarları JWT biçimindedir ("eyJ" ile başlar, uzun)
#   - "sb_secret_" ile başlayan yeni tip gizli anahtarlar
#   - service_role anahtarını değişkene koyma girişimleri (SERVICE_ROLE_KEY=...)
DESEN='eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{10,}|SERVICE_ROLE_KEY[[:space:]]*=[[:space:]]*[^[:space:]"'"'"']{8,}'

bulgu=0

echo "1) Çalışma kopyası taranıyor..."
if git grep -n -I --untracked -E "$DESEN" -- . ':!supabase/scripts/ana_anahtar_taramasi.sh' ; then
  bulgu=1
fi

echo "2) Git geçmişi taranıyor (tüm commit'ler)..."
if git log -p --all -I -G"$DESEN" --format='commit %h %s' -- . ':!supabase/scripts/ana_anahtar_taramasi.sh' | grep -n -E "^\+.*($DESEN)" ; then
  bulgu=1
fi

if [ "$bulgu" -eq 0 ]; then
  echo "ok - 22. Ana anahtar ne kodda ne git geçmişinde bulundu."
  exit 0
else
  echo "not ok - 22. ANA ANAHTAR SIZMIŞ OLABİLİR. Hemen yenileyin (docs/security 2.9)."
  exit 1
fi
