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
- **Vitrin (Showcase)** ReactBits **DriftWall** duvarıdır (`components/sections/showcase.tsx` → `showcase-wall.tsx` → `components/DriftWall.tsx`). Karolar 16:9 sabit oranda, duvar tam genişlikte; üst kenar gradyanla açılır, alt kenar İletişim bölümünün çizgisine dayanır. Karoya tıklamak `showcase-lightbox.tsx` üzerinden FLIP geçişli tam ekran önizleme açar. Görseller `public/showcase/` klasöründen okunur (`.jpg/.png/.webp/.avif`) ve `next/image` ile optimize edilir; klasör boşken on-brand nötr placeholder karolar (gradient SVG data-URI) gösterilir. Sayfa statik (SSG) üretildiğinden **yeni görseller `next build` sonrası** galeriye yansır.
- **Hero** arka planı 193 karelik bir scroll-scrub dizisidir; ilk kare yüksek çözünürlüklü `public/pengrim-first-frame-edited.webp`. Sayfa en üstteyken ortada statik `public/pengrim_beyaz.png` logosu gösterilir — tüm ekran boyutlarında/en-boy oranlarında.

  **İki kare seti var:**
  - `public/hero-frames/` — 1280×720, tam set (masaüstü, tablet, yatay telefon).
  - `public/hero-frames-portrait/` — 480×720, **merkezden kırpılmış** set. Portre telefonda `object-cover` zaten kaynağın yalnızca `720 × (genişlik/yükseklik)` piksellik merkez bandını gösteriyor (390×844 bir telefonda 1280'in 333'ü); kenarları önceden atmak ekrandaki pikseli değiştirmeden indirilen veriyi 9.5 MB'tan 5.1 MB'a düşürüyor. Küçültme **değil** kırpma olduğu için netlik aynı.

  Seçim `matchMedia("(max-aspect-ratio: 2/3)")` ile yapılır (eşik kırpma genişliğiyle birebir); cihaz döndürülürse yükleyici diğer sete geçer.

  Portre setini yeniden üretmek için:
  ```bash
  ffmpeg -start_number 1 -i public/hero-frames/frame-%04d.webp -vf "crop=480:720:400:0" -c:v libwebp -quality 92 -compression_level 6 public/hero-frames-portrait/frame-%04d.webp
  ```

  > **Dikkat:** `next.config.ts` her iki kare dizinine de `Cache-Control: immutable` veriyor. Bir kareyi **aynı yolda** yeniden kodlarsanız mevcut ziyaretçiler eskisini görmeye devam eder. Kareler değişecekse yeni bir dizin altında yayınlayın (`/hero-frames-v2/`) ve `next.config.ts` ile `hero.tsx`'teki sabitleri güncelleyin.

### İletişim
- Form kaldırıldı. `components/sections/contact.tsx` yalnızca e-posta + telefon + konumla iletişime yönlendiren bir bloktur (değerler `messages/*.json` → `footer.email/phone/address`).

---

## Proje yapısı

```
app/[locale]/        layout + page (bölüm kompozisyonu)
components/layout/   header (dinamik), footer, mobil menü (StaggeredMenu),
                     dil değiştirici, smooth-scroll, first-visit-gate
components/sections/ hero, led-ribbon (signature), trust-stats, inventory,
                     how-it-works, reach, showcase (+ showcase-wall, showcase-lightbox),
                     cta-band, contact
components/effects/  glass-card, marquee, reveal, count-up
components/ui/        shadcn bileşenleri
i18n/ · messages/     next-intl yapılandırması ve sözlükler
lib/                  utils, constants, icons, hero-intro-store, hero-ready-store,
                      ball-anchor, prewarm, use-hydrated
public/showcase/     vitrin görselleri (boşken placeholder)
```
