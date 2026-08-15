"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Container } from "@/components/layout/container";
import { AnchorLink } from "@/components/layout/anchor-link";
import { LedRibbon } from "./led-ribbon";
import TiltedCard from "@/components/TiltedCard";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_IDS } from "@/lib/constants";
import { setHeroIntroProgress } from "@/lib/hero-intro-store";
import { setHeroReady } from "@/lib/hero-ready-store";
import { prewarmEager } from "@/lib/prewarm";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * OGL'yi ilk bundle'dan çıkarır. `ssr: false` güvenli: SideRays yalnızca bir
 * WebGL canvas'ı, sunucu çıktısında görsel karşılığı yok.
 *
 * Modül kapsamında hemen ısıtılıyor (idle değil): katman zaten 0.15 sn gecikmeli
 * 1.1 sn'lik bir fade'in arkasında, yani chunk'ın yerine yetişmesi için ~1.25 sn
 * var; ana chunk ile paralel indiği için bu pencereye rahat sığar.
 */
const SideRays = dynamic(() => import("@/components/SideRays"), { ssr: false });
prewarmEager("side-rays", () => import("@/components/SideRays"));

// public/hero-frames içindeki kare dizisi. Kaynak 24fps çekimden ffmpeg
// minterpolate ile 36fps'e (130 → 193 kare) hareket-telafili interpole edilip
// WebP'ye alındı: 1.5× kare yoğunluğu, üstelik eski JPG dizisinden (11 MB) daha
// az yer (9.5 MB). Düşük kaynak kare hızının ürettiği keskin atlamaları bu
// yoğunluk + aşağıdaki cross-fade birlikte kapatır.
const HERO_FRAME_DIR = "/hero-frames";
// Portre telefonlar için merkezden kırpılmış set (480×720). Küçültme DEĞİL
// kırpma: bkz. srcFor yakınındaki not.
//   ffmpeg -start_number 1 -i public/hero-frames/frame-%04d.webp \
//     -vf "crop=480:720:400:0" -c:v libwebp -quality 92 -compression_level 6 \
//     public/hero-frames-portrait/frame-%04d.webp
const HERO_FRAME_DIR_PORTRAIT = "/hero-frames-portrait";
const HERO_FRAME_COUNT = 193;
// İlk kare: sıkıştırılmış frame-0001 yerine yüksek çözünürlüklü düzenlenmiş görsel.
const HERO_FIRST_FRAME = "/pengrim-first-frame-edited.webp";
// Pinli scroll mesafesi (viewport yüksekliği katı olarak).
const HERO_SCROLL_VH = 1.6;
// Intro (merkezî logo) evresinin pinli zaman çizelgesindeki bitiş oranı.
// Not: bu bir *oran*, mutlak mesafe değil — HERO_SCROLL_VH değişirse intronun
// hissedilen süresini korumak için birlikte ayarlanmalı (0.28 × 1.6vh ≈ 0.45vh).
const INTRO_END = 0.28;
// Kaç kare geldiğinde hero "scrub'a hazır" sayılır (poster dahil). Aşağı
// kaydırmanın ilk saniyesini takılmadan karşılamaya yeten pencere.
const READY_AFTER_FRAMES = 12;

/** Bir metni kelime <span>'lerine böler (ScrollReveal kelime-kelime efekti için). */
function splitWords(text: string, keyPrefix: string) {
  return text.split(/(\s+)/).map((chunk, i) =>
    /^\s+$/.test(chunk) ? (
      chunk
    ) : (
      <span key={`${keyPrefix}-${i}`} className="hero-word inline-block">
        {chunk}
      </span>
    ),
  );
}

export function Hero() {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();

  // SideRays yalnız intro evresinde anlamlı. Opaklığı 0'a indirmek WebGL
  // döngüsünü durdurmaz — ama bileşeni SÖKMEK de doğru cevap değildi: her eşik
  // geçişinde yeni bir GL context kuruluyordu ve daha kötüsü, aşağıdaki GSAP
  // tween'i sökülen düğüme bağlı kalıp scroll-fade'i sessizce devre dışı
  // bırakıyordu. Artık bileşen hero boyunca mount kalıyor, yalnız render
  // döngüsü duraklatılıyor.
  const [raysPaused, setRaysPaused] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const logoWrapRef = useRef<HTMLDivElement>(null);
  const logoInteractiveRef = useRef<HTMLDivElement>(null);
  const sideRaysRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  // GSAP kurulumu tamamlandı mı — failsafe bunun üzerinden karar verir.
  const gsapReadyRef = useRef(false);

  // Failsafe: GSAP kurulumu herhangi bir nedenle tamamlanmadıysa (throw, plugin
  // yüklenmemesi, beklenmedik ortam) başlık ve CTA'yı aç. Aksi halde .hero-word
  // gizleme kuralı takılı kalır ve sayfanın ana mesajı hiç görünmez.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!gsapReadyRef.current && sectionRef.current) {
        sectionRef.current.dataset.heroFailed = "true";
      }
    }, 2000);
    return () => window.clearTimeout(id);
  }, []);

  const ribbonWords = [t("ribbon.a"), t("ribbon.b"), t("ribbon.c"), t("ribbon.d")];

  const eyebrowWords = useMemo(() => splitWords(t("eyebrow"), "e"), [t]);
  const headlineWords = useMemo(() => splitWords(t("headline"), "h"), [t]);
  const sublineWords = useMemo(() => splitWords(t("subline"), "s"), [t]);

  // Scroll-scrub: kare dizisini <canvas>'a çiziyoruz + başlık kelimeleri aynı
  // pinli zaman çizelgesinde (videoyla senkron) opaklık/blur ile beliriyor.
  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const section = sectionRef.current;
      if (!canvas || !section) return;
      // alpha:false → her frame'de opak kare çizildiği için alfa karıştırma atlanır;
      // desynchronized:true → destekleyen tarayıcılarda scroll-tetiklemeli redraw
      // gecikmesini azaltır (compositor round-trip bypass ipucu).
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (!ctx) return;

      // kareleri oluştur (henüz yüklemeye başlamadan) — `.src` atanana kadar
      // tarayıcı isteği başlatmaz.
      let images: HTMLImageElement[] = [];
      for (let i = 0; i < HERO_FRAME_COUNT; i++) {
        images.push(new Image());
      }
      // Set değişiminde (cihaz döndürme) eski kareler yeni set gelene kadar
      // çizilmeye devam etsin diye elde tutulur — aksi halde döndürme anında
      // canvas boşalıp altındaki poster görünürdü.
      let fallbackImages: HTMLImageElement[] | null = null;
      const lastIndex = HERO_FRAME_COUNT - 1;

      // Portre telefonda ekranda kaynağın yalnızca `720 × (w/h)` piksellik
      // merkez bandı görünüyor (object-cover); 390×844 bir telefonda bu 1280'in
      // 333'ü. Bu yüzden mobil set KÜÇÜLTÜLMÜŞ değil, aynı dikey çözünürlükte
      // MERKEZDEN KIRPILMIŞ (480×720): çizilen pikseller birebir aynı kaynak
      // bölgesinden aynı ölçekle geliyor, netlik değişmiyor, byte %46 düşüyor.
      // Eşik (2/3 = 0.667) kırpma genişliğiyle birebir aynı: bu orandan dar her
      // ekranda 480 px görünen bandı tamamen kapsar.
      const portraitMq =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(max-aspect-ratio: 2/3)")
          : null;
      let usePortrait = Boolean(portraitMq?.matches);

      // kare kaynağı: 0. kare yüksek çözünürlüklü poster (tek dosya, 49 KB —
      // kırpmaya değmez), kalanlar aktif WebP dizisi.
      const srcFor = (index: number) =>
        index === 0
          ? HERO_FIRST_FRAME
          : `${usePortrait ? HERO_FRAME_DIR_PORTRAIT : HERO_FRAME_DIR}/frame-${String(
              index + 1,
            ).padStart(4, "0")}.webp`;

      // Dar bant / küçük ekranda her ikinci kareyi yükle. Cross-fade aradaki
      // boşluğu zaten örttüğü için görsel kayıp minimal, indirilen byte yarıya iner.
      const saveData = Boolean(
        (
          navigator as Navigator & {
            connection?: { saveData?: boolean };
          }
        ).connection?.saveData,
      );
      const isSmall =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 640px)").matches;
      const step = saveData || isSmall ? 2 : 1;

      let currentFrame = 0;

      /** Tek bir kareyi object-cover mantığıyla canvas'a boyar. */
      const paint = (img: HTMLImageElement) => {
        const cw = canvas.width;
        const ch = canvas.height;
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = cw / ch;
        let dw, dh, dx, dy;
        if (cr > ir) {
          dw = cw;
          dh = cw / ir;
          dx = 0;
          dy = (ch - dh) / 2;
        } else {
          dh = ch;
          dw = ch * ir;
          dy = 0;
          dx = (cw - dw) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      };

      /** Aktif sette hazır değilse (set değişimi sırasında) eski setten döner. */
      const readyImg = (i: number) => {
        const img = images[i];
        if (img?.complete && img.naturalWidth) return img;
        const fb = fallbackImages?.[i];
        if (fb?.complete && fb.naturalWidth) return fb;
        return null;
      };

      /** İstenen indeks henüz yüklenmediyse en yakın yüklenmiş kareye düşer. */
      const pickLoaded = (i: number) => {
        const direct = readyImg(i);
        if (direct) return { img: direct, index: i };
        for (let d = 1; d < HERO_FRAME_COUNT; d++) {
          const lo = readyImg(i - d);
          if (lo) return { img: lo, index: i - d };
          const hi = readyImg(i + d);
          if (hi) return { img: hi, index: i + d };
        }
        return null;
      };

      // İki komşu kareyi alpha ile harmanlar (sub-frame dissolve). Kaynak kare
      // hızı düşük olduğu için tek kare snap'i keskin atlama gibi görünüyordu;
      // ara opaklık scrub'ın float konumunu görsele taşır.
      const draw = (f: number) => {
        const clamped = Math.max(0, Math.min(lastIndex, f));
        // stride varken harmanlama, yüklenen kare ızgarası üzerinde yapılır
        const g = clamped / step;
        const ga = Math.floor(g);
        const a = Math.min(lastIndex, ga * step);
        const b = Math.min(lastIndex, (ga + 1) * step);
        const t = g - ga;

        // kullanıcı tam buraya bakıyor → bu iki kareyi kuyruğun önüne al
        request(a);
        request(b);

        const ra = pickLoaded(a);
        if (!ra) return;

        currentFrame = clamped;
        ctx.globalAlpha = 1;
        paint(ra.img);

        if (t > 0.01 && b !== a) {
          const rb = pickLoaded(b);
          if (rb && rb.index !== ra.index) {
            ctx.globalAlpha = t;
            paint(rb.img);
            ctx.globalAlpha = 1;
          }
        }
      };

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        // canvas.width atamak 2D context state'ini sıfırlar (globalAlpha,
        // imageSmoothing*) → yeniden kurulmalı.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.globalAlpha = 1;
        draw(currentFrame);
      };

      // --- kare yükleyici -----------------------------------------------
      // Eşzamanlılık sınırlı pompa: ilk pencere hemen ve yüksek öncelikle,
      // kalanı 6'lı akışla düşük öncelikle. draw() henüz başlamamış bir kare
      // isterse o kare kuyruğu atlar (hızlı scroll eden kullanıcı için asıl fix).
      const EAGER_WINDOW = 24;
      const MAX_INFLIGHT = 6;

      let cancelled = false;
      let inflight = 0;
      let started = new Set<number>();
      // "Scrub'a hazır" ölçütü: poster + ilk pencere kadar kare geldi.
      // FirstVisitGate bunu bekliyor.
      let completed = 0;
      // Set değişiminde eski isteklerin `done`'ları sayaçları bozmasın diye.
      let generation = 0;

      const request = (index: number) => {
        if (cancelled || started.has(index) || !images[index]) return;
        started.add(index);
        inflight++;
        const img = images[index];
        const gen = generation;
        const done = () => {
          if (gen !== generation) return; // eski setten gelen kare — yok say
          inflight--;
          completed++;
          if (completed >= READY_AFTER_FRAMES) setHeroReady();
          if (!cancelled) {
            // yeni gelen kare o an ekranda olması gerekene denk geliyorsa yeniden çiz
            draw(currentFrame);
            pump();
          }
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
          started.size <= EAGER_WINDOW ? "high" : "low";
        img.decoding = "async";
        img.src = srcFor(index);
      };

      // yüklenecek indeks sırası (stride'a saygılı, son kare her zaman dahil)
      const order: number[] = [];
      for (let i = 0; i <= lastIndex; i += step) order.push(i);
      if (order[order.length - 1] !== lastIndex) order.push(lastIndex);
      let orderPos = 0;

      const pump = () => {
        if (cancelled) return;
        while (inflight < MAX_INFLIGHT && orderPos < order.length) {
          const next = order[orderPos++];
          if (!started.has(next)) request(next);
        }
      };

      const startLoading = () => {
        if (cancelled) return;
        for (let i = 0; i < EAGER_WINDOW && orderPos < order.length; i++) {
          const next = order[orderPos++];
          if (!started.has(next)) request(next);
        }
        pump();
      };

      /**
       * Cihaz döndürüldüğünde en-boy oranı 2/3 eşiğini geçerse aktif kare seti
       * değişir. Kırpılmış set yatay bir viewport'ta object-cover ile aşırı
       * yakınlaşmış görüneceği (ve tersi de doğru olduğu) için yükleyici
       * tamamen yeniden başlatılır. Eski diziyi `fallbackImages` olarak
       * tutuyoruz: yeni set gelene kadar çizim eskisinden sürer, canvas
       * boşalmaz. `paint()` her en-boy oranını cover ile çizdiği için bu ara
       * karelerde de görüntü doğru, yalnız kırpma farklı.
       */
      const switchFrameSet = () => {
        const next = Boolean(portraitMq?.matches);
        if (cancelled || next === usePortrait) return;
        usePortrait = next;

        generation++;
        fallbackImages = images;
        images = [];
        for (let i = 0; i < HERO_FRAME_COUNT; i++) images.push(new Image());
        started = new Set<number>();
        inflight = 0;
        orderPos = 0;

        request(0);
        startLoading();
        draw(currentFrame);
      };

      resize();
      window.addEventListener("resize", resize);
      portraitMq?.addEventListener("change", switchFrameSet);

      // ilk kare her koşulda gelir (poster + canvas'ın ilk boyaması)
      request(0);
      if (images[0].complete) draw(0);

      // prefers-reduced-motion: scroll-jacking yok, kelimeler doğrudan görünür,
      // intro yok → header tam halinde kalsın. Kare dizisinin geri kalanı hiç
      // çizilmeyeceği için indirilmez de.
      if (reduce) {
        setHeroIntroProgress(1);
        // Kare dizisinin geri kalanı hiç yüklenmeyecek → hazırlık ölçütü asla
        // dolmaz; kapıyı burada elle serbest bırak.
        setHeroReady();
        // scroll-jack yok ama kurulum "başarılı" sayılır → failsafe susar
        // (kelimeler zaten reduced-motion CSS kuralıyla görünür).
        gsapReadyRef.current = true;
        return () => {
          cancelled = true;
          window.removeEventListener("resize", resize);
          portraitMq?.removeEventListener("change", switchFrameSet);
        };
      }

      // kalan kareler kritik yükten sonra akmaya başlasın
      if (document.readyState === "complete") startLoading();
      else window.addEventListener("load", startLoading, { once: true });

      const words = Array.from(
        section.querySelectorAll<HTMLElement>(".hero-word"),
      );
      // ScrollReveal parametreleri (reactbits): baseOpacity 0, blurStrength 10.
      // baseOpacity 0 şart — logo ekrandayken metnin *hiç* görünmemesi gerekiyor,
      // 0.1'lik taban bile logonun üzerinde hayalet yazı bırakırdı.
      gsap.set(words, { opacity: 0, filter: "blur(10px)", y: 14 });
      gsap.set(ctaRef.current, { opacity: 0, y: 20, pointerEvents: "none" });

      const proxy = { frame: 0 };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + window.innerHeight * HERO_SCROLL_VH,
          pin: true,
          scrub: 0.35,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // intro ilerlemesini yayınla (0=logo tam görünür … 1=intro bitti) →
          // header ile logo fade'i tek kaynaktan senkron.
          onUpdate: (self) => {
            setHeroIntroProgress(Math.min(1, self.progress / INTRO_END));
          },
        },
      });

      // scroll konumu → kare indeksi (tüm scroll mesafesine lineer yayılır;
      // gerçek çekim karelerinde non-lineer oynatım "değişken hızlı çekim" gibi
      // görünürdü, bu yüzden ease: none)
      tl.to(
        proxy,
        {
          frame: lastIndex,
          duration: 1,
          ease: "none",
          onUpdate: () => draw(proxy.frame),
        },
        0,
      );

      // Scroll ipucu oku — yalnız pinli zaman çizelgesinin ilk birkaç karesinde
      // görünür, kullanıcı kaydırmaya başlar başlamaz sönümlenir.
      if (scrollHintRef.current) {
        tl.to(
          scrollHintRef.current,
          { opacity: 0, ease: "none", duration: 0.05 },
          0,
        );
      }

      // merkezî logo (ilk kareler) sönümlenerek hero yazısına yer açar
      if (logoWrapRef.current) {
        tl.to(
          logoWrapRef.current,
          {
            opacity: 0,
            scale: 0.94,
            filter: "blur(6px)",
            ease: "none",
            duration: INTRO_END,
          },
          0,
        );
      }

      // SideRays ışın katmanı logoyla birebir aynı sönümle kaybolur (video
      // kare arka planı ile logo arasındaki katman, yalnız intro'da görünür).
      //
      // Opaklık DOM düğümüne DOĞRUDAN tween'lenmiyor; bir proxy üzerinden
      // sürülüyor ve `sideRaysRef.current` her karede taze okunuyor. İki ayrı
      // hatayı birden kapatan tasarım kararı:
      //   1. Düğümü doğrudan hedeflemek, katman bir kez sökülüp yeniden
      //      takıldığında tween'i kopuk düğüme bağlı bırakıyordu → scroll-fade
      //      sessizce çalışmayı bırakıyor, katman tam opaklıkta kalıyor ve
      //      shader'ın ışık çekirdeği (brightness ≫ 1) bir kare boyunca ekranı
      //      beyaza boyuyordu.
      //   2. Duraklatma eşiği ScrollTrigger'ın HAM `progress` değerinden
      //      alınıyordu; oysa ekranda çizili opaklık `scrub: 0.35` yüzünden
      //      geriden geliyor. Fade tamamlanmadan katman kesiliyordu (keskin
      //      kaybolma). Artık eşik de aynı proxy'den, yani gerçekten çizilen
      //      değerden geliyor.
      const rays = { o: 1 };
      let raysPausedNow = false;
      tl.to(
        rays,
        {
          o: 0,
          ease: "none",
          duration: INTRO_END,
          onUpdate: () => {
            const el = sideRaysRef.current;
            if (el) {
              el.style.opacity = String(rays.o);
              // tam 0'da compositor'dan da düşür (görsel olarak fark yok)
              el.style.visibility = rays.o <= 0.001 ? "hidden" : "visible";
            }
            // eşik geçişinde tek setState (her karede değil): histerezisli
            const next = rays.o <= 0.01;
            if (next !== raysPausedNow) {
              raysPausedNow = next;
              setRaysPaused(next);
            }
          },
        },
        0,
      );

      // TiltedCard mouse etkileşimi görünmez haldeyken altındaki
      // başlık/CTA'ya tıklamayı engellemesin diye intro bitince kapatılır
      // (scrub geri sarılınca otomatik geri açılır).
      if (logoInteractiveRef.current) {
        tl.set(logoInteractiveRef.current, { pointerEvents: "none" }, INTRO_END);
      }

      // CTA butonları (Teklif alın / Nasıl çalışır?) merkezî logo ekrandayken
      // tıklanamaz — logo, intro boyunca CTA'ların üzerinde (z-20) durduğu için
      // görünmez olsalar da altlarındaki fare/dokunma etkileşimini keserlerdi.
      // Intro bitip logo çekilince CTA'lar tekrar ulaşılabilir olur.
      tl.set(ctaRef.current, { pointerEvents: "auto" }, INTRO_END);

      // Başlık bloğu hafif dönüşten düzelir (ScrollReveal baseRotation: 5).
      // INTRO_END'de başlar: logo tamamen sönmeden metin kıpırdamamalı.
      tl.fromTo(
        revealRef.current,
        { rotate: 5, transformOrigin: "0% 50%" },
        { rotate: 0, ease: "none", duration: 0.42 },
        INTRO_END,
      );

      // Kelimeler scroll ile sırayla netleşir (opacity + blur + y), tam olarak
      // logo/SideRays sönümü bittiği anda başlar → TiltedCard ekrandayken hiçbir
      // kelime görünmez, temiz devir-teslim olur.
      tl.to(
        words,
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          ease: "none",
          duration: 0.24,
          stagger: 0.035,
        },
        INTRO_END,
      );

      // CTA butonları da scroll ile (son kelimeler netleşirken) belirir
      tl.to(
        ctaRef.current,
        { opacity: 1, y: 0, ease: "none", duration: 0.18 },
        0.78,
      );

      // Timeline eksiksiz kuruldu → failsafe'in devreye girmesine gerek yok.
      // (Bu satır atlanırsa 2sn sonra data-hero-failed set olur ve gizleme
      // kuralı !important ile ezilir; metin scroll'dan bağımsız görünür kalır.)
      gsapReadyRef.current = true;

      // Archivo geç yüklenirse başlık metrikleri, dolayısıyla ölçülen pin
      // mesafesi intro'nun ortasında sessizce geçersizleşiyordu. ScrollExpandCard
      // ve BallJourney'de zaten olan bu satır hero'da eksikti.
      document.fonts?.ready
        .then(() => {
          if (!cancelled) ScrollTrigger.refresh();
        })
        .catch(() => {
          // no-op — font yüklemesi başarısızsa mevcut metrikler geçerli kalır
        });

      return () => {
        cancelled = true;
        window.removeEventListener("resize", resize);
        window.removeEventListener("load", startLoading);
        portraitMq?.removeEventListener("change", switchFrameSet);
      };
    },
    { scope: sectionRef, dependencies: [reduce] },
  );

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      className="relative h-dvh w-full overflow-hidden"
    >
      {/* kareler yüklenene kadar görünecek poster (yüksek çözünürlüklü ilk kare) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_FIRST_FRAME})` }}
      />

      {/* Scroll ile sürülen hero kare dizisi — her ekranı/oryantasyonu tam kaplar */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full will-change-transform transform-gpu"
      />

      {/* alt bölüme yumuşak geçiş — YALNIZ alt taraftan. Üst karartma bilerek
          yok: başlık kontrastı zaten aşağıdaki sola dayalı scrim'den geliyor,
          üstteki katman kareyi gereksiz yere bastırıyordu. Ramp %65 yüksekliğe
          yayılıp orta durağı düşürüldüğü için geçiş yumuşak ve az belirgin. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[65%] bg-linear-to-b from-transparent via-background/30 via-65% to-background"
      />

      {/* metin bloğunun arkasına sola dayalı yerel scrim — başlık kontrastı
          altındaki kare içeriğinden bağımsız olarak deterministik kalsın */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full bg-linear-to-r from-black/70 via-black/35 to-transparent sm:w-4/5 lg:w-3/5"
      />

      {/* SideRays — video kare arka planı ile merkezî logo arasında, yalnız
          intro'da (logo görünürken) görünür. Dış katman mount'ta bir kerelik
          "belirme" fade'i (motion/react, GSAP'tan bağımsız — bileşen artık
          sökülmediği için yalnızca sayfa ilk açılırken bir kez çalışır); iç
          katman ise logoyla birebir aynı sönümle (GSAP, yukarıdaki scrub
          timeline) kaybolur. Intro bitince render döngüsü `paused` ile durur,
          GL context ayakta kalır. */}
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div ref={sideRaysRef} className="absolute inset-0">
            <SideRays
              speed={2.5}
              rayColor1="#f0c96a"
              rayColor2="#f4f7f5"
              intensity={1.45}
              spread={2}
              origin="top-right"
              saturation={1}
              blend={0.75}
              falloff={1}
              opacity={0.72}
              paused={raysPaused}
            />
          </div>
        </motion.div>
      )}

      {/* içerik katmanı */}
      <div ref={contentRef} className="relative z-10 flex h-full flex-col">
        {/* SIGNATURE — merkezî statik beyaz logo (yalnız intro, hareket açıkken) */}
        {!reduce && (
          <div
            ref={logoWrapRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
          >
            <div className="flex flex-col items-center">
              <div ref={logoInteractiveRef} className="pointer-events-auto">
                <TiltedCard
                  imageSrc="/pengrim_beyaz.png"
                  altText=""
                  containerWidth="min(86vw, 760px)"
                  containerHeight="calc(min(86vw, 760px) * 0.2235)"
                  imageWidth="min(86vw, 760px)"
                  imageHeight="calc(min(86vw, 760px) * 0.2235)"
                  imageClassName="object-contain"
                  rotateAmplitude={15}
                  scaleOnHover={1.10}
                  showMobileWarning={false}
                  showTooltip={false}
                />
              </div>

              {/* logo altındaki parıltı — logoyla aynı üst düzeyin (opacity/scale/blur
                  GSAP tween'i) çocuğu olduğu için ayrı bir tween'e gerek kalmadan
                  logoyla birebir aynı anda belirir/kaybolur. */}
              <div className="relative mt-0 h-10 w-[min(72vw,600px)]">
                <div className="absolute inset-x-[12%] top-0 h-px w-3/4 bg-linear-to-r from-transparent via-turf to-transparent" />
                <div className="absolute inset-x-[12%] top-0 h-0.5 w-3/4 bg-linear-to-r from-transparent via-turf to-transparent blur-sm" />
                <div className="absolute inset-x-[37%] top-0 h-px w-1/4 bg-linear-to-r from-transparent via-led to-transparent" />
                <div className="absolute inset-x-[37%] top-0 h-0.75 w-1/4 bg-linear-to-r from-transparent via-led to-transparent blur-sm" />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 items-center pt-24 pb-10">
          <Container>
            <div className="max-w-3xl">
              {/* eyebrow — scroll ile senkron belirir */}
              <span className="inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-xs">
                <span
                  className="hero-word size-2 shrink-0 rounded-full bg-led"
                  aria-hidden="true"
                />
                {eyebrowWords}
              </span>

              {/* scroll ile senkron beliren başlık + alt satır */}
              <div ref={revealRef} className="mt-5">
                <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.98] tracking-tight text-white sm:text-6xl md:text-7xl">
                  {headlineWords}
                </h1>
                <p className="mt-5 max-w-xl font-display text-lg font-semibold uppercase tracking-tight text-led sm:text-xl">
                  {sublineWords}
                </p>
              </div>

              {/* CTA — scroll ile belirir */}
              <div
                ref={ctaRef}
                className="hero-cta mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <AnchorLink
                  href={`#${SECTION_IDS.contact}`}
                  className={cn(
                    buttonVariants(),
                    "group h-12 gap-2 rounded-xl px-6 text-base font-semibold shadow-[0_0_36px_-10px_var(--brand-turf)]",
                  )}
                >
                  {t("ctaPrimary")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </AnchorLink>
                <AnchorLink
                  href={`#${SECTION_IDS.how}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-12 rounded-xl px-6 text-base",
                  )}
                >
                  {t("ctaSecondary")}
                </AnchorLink>
              </div>
            </div>
          </Container>
        </div>

        {/* Scroll ipucu — LED şeridin üstünde ortalanmış, ok ucu (gövdesiz).
            Yalnız hero'nun ilk birkaç scroll karesinde görünür, kaydırma
            başlar başlamaz GSAP tween'i ile sönümlenir (yukarıda kurulu). */}
        {!reduce && (
          <div
            ref={scrollHintRef}
            aria-hidden="true"
            className="pointer-events-none z-10 flex justify-center pb-3 sm:pb-4"
          >
            <svg
              viewBox="0 0 32 16"
              className="h-4 w-8 animate-bounce text-white/70 sm:h-5 sm:w-10"
            >
              <path
                d="M2 2 L16 14 L30 2"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* SIGNATURE şerit */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pb-8 sm:pb-10"
        >
          <LedRibbon words={ribbonWords} />
        </motion.div>
      </div>
    </section>
  );
}
