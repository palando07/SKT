# Buzdolabı Dedektifi (SKT)

Market fişinin fotoğrafından ürünleri ve tahmini son kullanma tarihlerini (SKT) kaydeden, bozulmak üzere olanları uyaran ve eldeki malzemelerle tarif öneren uygulama.

| Klasör | İçerik |
| --- | --- |
| `app/` | Expo (React Native) mobil uygulama |
| `server/` | Claude API'ye giden küçük sunucu (API anahtarı telefonda durmasın diye) |
| `web/` | Tek dosyalık web prototipi ([canlı demo](https://claude.ai/artifact/PUXY4uwc7jzesAn6rRHXPW)) |
| `PLAN.md` | MVP kapsamı ve yol haritası |

## Çalıştırma

Gerekenler: Node.js 22+, telefonda **Expo Go** uygulaması, bir [Anthropic API anahtarı](https://platform.claude.com/settings/keys).

**1. Sunucu**

```bash
cd server
npm install
cp .env.example .env   # ANTHROPIC_API_KEY değerini doldur
npm run dev            # http://localhost:8787
```

**2. Mobil uygulama**

```bash
cd app
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL = bilgisayarının yerel IP'si + :8787
npx expo start
```

Terminalde çıkan QR kodu telefonundaki Expo Go ile okut. Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.

## Özellikler

- Fiş fotoğrafı çek veya galeriden seç, ürünler ve tahmini SKT çıkarılır, kaydetmeden önce düzenlenir
- Dolap listesi son tarihe göre sıralı, renkli tazelik şeridiyle
- Son tarihten bir gün önce sabah 09:00'da bildirim (o gün bitenler tek bildirimde)
- Son tarihi en yakın ürünlerle 3 tarif önerisi
- "Tükettim / Attım" ile israf takibi
- Veriler telefonda saklanır
