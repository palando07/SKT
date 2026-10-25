# Buzdolabı Dedektifi: Plan

## MVP (prototipte var)
- Fiş fotoğrafından ürün, miktar, fiyat ve tahmini son kullanma tarihi çıkarma (Claude görüntü okuma), kaydetmeden önce düzenlenebilir liste
- Dolap listesi: son tarihe göre sıralı, renkli tazelik şeridi, "Tükettim / Attım / +2 gün"
- Uyarı bandı: tarihi geçen ve 2 gün içinde bozulacak ürünler
- Tarif önerisi: son tarihi en yakın ürünleri öne alan 3 tarif (Claude yoksa hazır tarif eşleştirme)
- Elle ürün ekleme, Türkçe ürünler için tahmini raf ömrü tablosu
- İsraf istatistiği: kurtarılan ürün yüzdesi
- Veriler kişiye özel saklanır (claude.ai), yoksa tarayıcıda

## Sonraki adımlar (mobil uygulama)
- Teknoloji: Expo (React Native) + TypeScript, Supabase (auth + Postgres), fiş okuma ve tarifler için Claude API (sunucu tarafında)
- Gerçek push bildirimleri (sabah 09:00 "bugün bitenler" özeti)
- Kamera ile doğrudan fiş çekme, barkod okuma
- Aile/ev paylaşımı (ortak dolap)
- Aylık market harcaması ve israf (TL) raporu
