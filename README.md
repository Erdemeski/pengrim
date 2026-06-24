# Pengrim — Kurumsal Tanıtım & Lead-Gen Web Sitesi

Futbol reklamcılığı (LED çevre panoları, stadyum içi envanter, maç yayını görünürlüğü) odaklı, marka bulma ve iletişim formu ile lead toplama amaçlı tek-sayfa tanıtım sitesi.

**Yığın:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · shadcn/ui · next-intl (TR/EN) · Lenis (smooth scroll) · Motion (animasyon) · react-hook-form + zod.

Tasarım yönü: **"Pitchside / Broadcast Night"** — stadyum gecesi paleti, imza öğesi olarak kayan **LED çevre panosu şeridi**, liquid glass yüzeyler, katmanlı scroll animasyonları.

---

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:3000  ( /tr ve /en )
```

## Üretim build & VM'de çalıştırma (Cloudflare Zero Trust tunnel)

`next.config.ts` içinde `output: "standalone"` ayarlı; Vercel'e gerek yoktur.

```bash
npm run build

# standalone, statik dosyaları kendi içine kopyalamaz — bir kez taşı:
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public

# çalıştır (VM üzerinde)
PORT=3000 node .next/standalone/server.js
```

Ardından Cloudflare tunnel'ı `http://localhost:3000` adresine yönlendir. `sharp` kurulu olduğu için `next/image` optimizasyonu VM'de çalışır.

---

## Özelleştirme

### Marka renkleri (tek dosya)
`app/globals.css` → `:root, .dark` bloğundaki `--brand-*` değişkenlerini değiştir. Tüm shadcn token'ları (primary, ring, chart, vb.) bunlardan türetilir:

```css
--brand-pitch:      /* zemin (stadyum gecesi) */
--brand-turf:       /* birincil yeşil */
--brand-led:        /* LED/CTA vurgu */
--brand-amber:      /* ikincil vurgu */
--brand-floodlight: /* metin / floodlight beyazı */
```

### Logo
`components/layout/logo.tsx` — şu an geçici wordmark + LED işareti. Kurumsal logo (SVG) gelince bu bileşeni değiştir.

### Metin / İki dil
Tüm metin `messages/tr.json` ve `messages/en.json` içinde. Diller `i18n/routing.ts`'te (`tr` varsayılan). Yeni dil eklemek için locale'i routing'e ve bir `messages/<locale>.json` ekle.

### Fontlar
`app/[locale]/layout.tsx` — Display: Archivo, Body: Inter, Mono: JetBrains Mono (`next/font`).

### Görseller / 3D model (sonra eklenecek)
- Showcase bölümü şu an CSS ile kurgulanmış "yayın karesi" maketleri kullanır (`components/sections/broadcast-frame.tsx`). Gerçek maç fotoğrafları gelince `next/image` ile değiştirilir (uzak alan adları `next.config.ts` → `images.remotePatterns`).
- Hero'da 3D model için hazır slot: `components/sections/hero-backdrop.tsx` içinde `data-hero-3d-slot`. `.glb` model sağlanınca react-three-fiber Canvas buraya bağlanır.

### İletişim formu (şu an STUB)
- Form: `components/sections/contact-form.tsx` (rhf + zod, paylaşılan şema `lib/validations.ts`).
- Endpoint: `app/api/contact/route.ts` — talebi doğrular, **server log'una yazar**, `{ ok: true }` döner. Gerçek e-posta/CRM (örn. Resend) entegrasyonu bu dosyaya bağlanır.

---

## Proje yapısı

```
app/[locale]/        layout + page (bölüm kompozisyonu)
app/api/contact/     iletişim stub endpoint
components/layout/   header (dinamik), footer, mobil nav, dil değiştirici, smooth-scroll
components/sections/ hero, led-ribbon (signature), trust-stats, inventory,
                     how-it-works, reach, showcase, cta-band, contact
components/effects/  glass-card, marquee, reveal, count-up
components/ui/        shadcn bileşenleri
i18n/ · messages/     next-intl yapılandırması ve sözlükler
lib/                  utils, constants, validations, icons
```
