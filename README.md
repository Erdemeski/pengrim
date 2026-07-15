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

### Görseller
- **Vitrin (Showcase)** ReactBits **Masonry** galerisidir (`components/sections/showcase.tsx` → `showcase-gallery.tsx`). Görseller `public/showcase/` klasöründen okunur (`.jpg/.png/.webp/.avif`); klasör boşken on-brand nötr placeholder karolar (gradient SVG data-URI) gösterilir. Sayfa statik (SSG) üretildiğinden **yeni görseller `next build` sonrası** galeriye yansır.
- **Hero** arka planı `public/hero-frames/` içindeki 130 karelik scroll-scrub dizisidir; ilk kare yüksek çözünürlüklü `public/pengrim-first-frame-edited.png`. Sayfa en üstteyken ortada statik `public/pengrim_beyaz.png` logosu gösterilir — tüm ekran boyutlarında/en-boy oranlarında.

### İletişim
- Form kaldırıldı. `components/sections/contact.tsx` yalnızca e-posta + telefon + konumla iletişime yönlendiren bir bloktur (değerler `messages/*.json` → `footer.email/phone/address`).

---

## Proje yapısı

```
app/[locale]/        layout + page (bölüm kompozisyonu)
components/layout/   header (dinamik), footer, mobil nav, dil değiştirici, smooth-scroll
components/sections/ hero, led-ribbon (signature), trust-stats, inventory,
                     how-it-works, reach, showcase (+ showcase-gallery), cta-band, contact
components/effects/  glass-card, marquee, reveal, count-up
components/ui/        shadcn bileşenleri
i18n/ · messages/     next-intl yapılandırması ve sözlükler
lib/                  utils, constants, hero-intro-store, icons
public/showcase/     vitrin görselleri (boşken placeholder)
```
