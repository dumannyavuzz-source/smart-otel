#!/bin/sh
echo "Ayarlar üretiliyor..."

cat << EOF > ayarlar.js
window.ENV = {
  SUPABASE_URL: "$SUPABASE_URL",
  SUPABASE_ANON_KEY: "$SUPABASE_ANON_KEY"
};
EOF

echo "Ayarlar başarıyla üretildi!"
