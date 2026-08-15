"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * React Bits `StaggeredMenu` yerel fork'u (mobil navigasyon paneli).
 *
 * Upstream'den sapmalar — hepsi bilinçli, upstream'e geri yazılmamalı:
 *
 *  1. **Kendi header'ı yok.** Upstream tam ekran bir sarmalayıcı + içinde logo
 *     ve toggle taşıyan bir header render ediyordu. Sitede zaten `SiteHeader`
 *     var; bu fork yalnızca *toggle butonunu* bulunduğu yere (header kümesinin
 *     içine) ve *paneli* `document.body`'ye portal ile basar. Header'ın
 *     geometrisi hiç değişmez.
 *  2. **Panel z-index'i header'ın ALTINDA (40 < 50).** Header panelin üstünde
 *     kalır; toggle böylece panel açıkken de tıklanabilir ve kapatma butonu
 *     yerinde durur. Panelin üst iç boşluğu header'ı temizleyecek kadar.
 *  3. **Kontrollü bileşen.** Upstream `open`'ı içeride tutuyordu. Burada dışarıdan
 *     sürülüyor: panelin içeriği (dil/tema kontrolleri, CTA) tüketicinin JSX'i
 *     ve onun da paneli kapatabilmesi gerekiyor. Bu bileşen artık yalnız
 *     sunum + animasyon.
 *  4. **`<a href>` yerine `onSelect`.** Site tek sayfa; gezinme Lenis ile
 *     yumuşak kaydırma (bkz. `use-scroll-to.ts`), tarayıcı atlaması değil.
 *  5. **Sabit beyaz panel yerine tema token'ları.** Upstream `bg-white` +
 *     siyah metin varsayıyordu; burada `--popover` / `--foreground` kullanılıyor
 *     ki açık ve koyu temada da doğru görünsün.
 *  6. **`socialItems` yerine `panelFooter` slot'u.** Sosyal bağlantılar yerine
 *     dil + tema kontrolleri konuluyor. Slot içindeki `[data-sm-reveal]`
 *     taşıyan öğeler, socials'ın kademeli beliriş animasyonunu aynen alır.
 *  7. **Erişilebilirlik paritesi eklendi.** Bu bileşen Radix `Sheet`'in yerine
 *     geçiyor; Sheet'in bedava verdiği davranışlar elle eklendi: Escape ile
 *     kapanma, odak tuzağı, açılışta odağın panele / kapanışta toggle'a
 *     dönmesi, kapalıyken `inert`.
 *  8. **`prefers-reduced-motion`** desteği: GSAP zaman çizelgesi atlanır,
 *     panel anında açılır/kapanır.
 *  9. **`useId` ile benzersiz panel id'si** — `aria-controls` çakışmaz.
 * 10. **Menü öğesi tipografisi akışkan** (`clamp`); upstream'in sabit `4rem`'i
 *     telefonda 5 öğe + kontroller + CTA ile taşıyordu.
 * 11. **Tween'ler unmount'ta `kill()`** edilir; upstream'in `gsap.context`
 *     revert'ü portal ile birlikte yetmiyordu.
 */

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  href: string;
}

export interface StaggeredMenuProps {
  items: StaggeredMenuItem[];
  /** Bir menü öğesine basıldı. Paneli kapatmak ve kaydırmak tüketicinin işi. */
  onSelect: (href: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Panelin alt bloğu — dil/tema kontrolleri, CTA. `[data-sm-reveal]` taşıyan
   *  torunlar kademeli beliriş animasyonuna dahil olur. */
  panelFooter?: ReactNode;
  /** Alt bloğun başlığı (accent renkte, socials başlığının yerinde). */
  panelFooterTitle?: string;
  /** Prelayer sweep renkleri (sırayla girer). */
  colors?: string[];
  position?: "left" | "right";
  displayItemNumbering?: boolean;
  accentColor?: string;
  /** Toggle butonundaki metin döngüsünün iki durağı. */
  labels: { open: string; close: string };
  /** Toggle butonuna eklenecek sınıflar (header'a uydurmak için). */
  toggleClassName?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function StaggeredMenu({
  items,
  onSelect,
  open,
  onOpenChange,
  panelFooter,
  panelFooterTitle,
  colors = ["#B497CF", "#5227FF"],
  position = "right",
  // Upstream varsayılanı `true`. Burada kapalı: beş öğelik bir menüde
  // başlıkların sağındaki sayılar tipografiyi kalabalıklaştırıyordu.
  displayItemNumbering = false,
  accentColor = "#5227FF",
  labels,
  toggleClassName,
}: StaggeredMenuProps) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const panelId = useId();

  const scopeRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const preLayersRef = useRef<HTMLDivElement | null>(null);
  const preLayerElsRef = useRef<HTMLElement[]>([]);

  const plusHRef = useRef<HTMLSpanElement | null>(null);
  const plusVRef = useRef<HTMLSpanElement | null>(null);
  const textInnerRef = useRef<HTMLSpanElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

  const [textLines, setTextLines] = useState<string[]>([labels.open]);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const spinTlRef = useRef<gsap.core.Timeline | null>(null);
  const textTweenRef = useRef<gsap.core.Tween | null>(null);

  const offscreen = position === "left" ? -100 : 100;

  // Panel portal'a basıldıktan sonra başlangıç (ekran dışı) durumunu kur.
  // `useLayoutEffect` (upstream de böyle): boyamadan önce çalışmazsa panel bir
  // kare boyunca dinlenme konumunda görünebilir.
  useLayoutEffect(() => {
    if (!hydrated) return;
    const panel = panelRef.current;
    const scope = scopeRef.current;
    const preContainer = preLayersRef.current;
    if (!panel || !scope) return;

    // GSAP artık konumdan sorumlu → CSS'teki ekran-dışı emniyet kuralını KAPAT.
    //
    // Bu satır `gsap.set`ten ÖNCE olmalı. Sonra olsaydı GSAP başlangıç
    // durumunu okurken emniyet kuralı hâlâ aktif olur, computed
    // `matrix(1,0,0,1,318.75,0)`i px cinsinden bir `x` olarak önbelleğine alır
    // ve `xPercent: 100`ün ÜSTÜNE eklerdi: panel %200 dışarıda kalırdı
    // (ölçüldü: `translate(100%, 0%) translate(318.75px, 0px)`). Açılışta
    // `fromTo` bunu `x: 0` ile temizlediği için görünmez bir hataydı, ama
    // `reduce` dalı temizlemiyordu. Kaynağında kesiliyor.
    // useLayoutEffect boyamadan önce çalıştığı için ekranda bir kare bile
    // görünmez.
    scope.setAttribute("data-ready", "");

    const ctx = gsap.context(() => {
      const layers = preContainer
        ? (Array.from(preContainer.querySelectorAll(".sm-prelayer")) as HTMLElement[])
        : [];
      preLayerElsRef.current = layers;

      gsap.set([panel, ...layers], { xPercent: offscreen, x: 0, y: 0, opacity: 1 });
      // Upstream prelayer KONTEYNERİNİ de sıfırlıyor: konteyner bir transform
      // kaparsa çocuklardaki yüzdeler onun üstüne binerdi.
      if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });

      if (plusHRef.current) {
        gsap.set(plusHRef.current, { transformOrigin: "50% 50%", rotate: 0 });
      }
      if (plusVRef.current) {
        gsap.set(plusVRef.current, { transformOrigin: "50% 50%", rotate: 90 });
      }
      if (textInnerRef.current) gsap.set(textInnerRef.current, { yPercent: 0 });
    }, scope);

    return () => {
      scope.removeAttribute("data-ready");
      ctx.revert();
    };
  }, [hydrated, offscreen]);

  // Unmount'ta tüm tween'leri öldür (portal ile birlikte context revert yetmiyor).
  useEffect(
    () => () => {
      openTlRef.current?.kill();
      closeTweenRef.current?.kill();
      spinTlRef.current?.kill();
      textTweenRef.current?.kill();
    },
    [],
  );

  /**
   * Prelayer'ları HER SEFERİNDE taze sorgula, ref'e güvenme.
   *
   * `preLayerElsRef` yalnızca kurulum effect'inde doldurulsaydı ve React portal
   * çocuklarını yeniden oluştursaydı (Fast Refresh, reconciliation), ref kopmuş
   * düğümlere işaret ederdi: o düğümler animasyon alır, ekrandakiler ise CSS'in
   * bıraktığı yerde kalırdı. Dört elemanlık bir querySelectorAll'ın maliyeti
   * bu hata sınıfının yanında sıfır.
   */
  const getLayers = useCallback(() => {
    const c = preLayersRef.current;
    const els = c
      ? (Array.from(c.querySelectorAll(".sm-prelayer")) as HTMLElement[])
      : [];
    preLayerElsRef.current = els;
    return els;
  }, []);

  /**
   * Animasyona giren HER düğümü tek yerden topla.
   *
   * Hem `playOpen` hem `playClose` hem de "kilitlenmeyi çöz" yolları aynı
   * listeyi görmek zorunda: bir yol bir düğümü unutursa o düğüm yarım kalmış
   * bir tween'in insafına kalıyor ve hızlı tıklamada panel açıkken menü
   * öğeleri gizli kalabiliyordu.
   */
  const collect = useCallback(() => {
    const panel = panelRef.current;
    const layers = getLayers();
    if (!panel) {
      return {
        panel: null,
        layers,
        itemEls: [] as HTMLElement[],
        numberEls: [] as HTMLElement[],
        footerTitle: null as HTMLElement | null,
        revealEls: [] as HTMLElement[],
      };
    }
    return {
      panel,
      layers,
      itemEls: Array.from(
        panel.querySelectorAll(".sm-panel-itemLabel"),
      ) as HTMLElement[],
      numberEls: Array.from(
        panel.querySelectorAll(".sm-panel-list[data-numbering] .sm-panel-item"),
      ) as HTMLElement[],
      footerTitle: panel.querySelector(".sm-footer-title") as HTMLElement | null,
      revealEls: Array.from(
        panel.querySelectorAll("[data-sm-reveal]"),
      ) as HTMLElement[],
    };
  }, [getLayers]);

  /**
   * Geçişe başlamadan önce YOLU TEMİZLE.
   *
   * Yalnız `openTlRef` / `closeTweenRef`'i öldürmek yetmiyordu: bir zaman
   * çizelgesi `kill()` edildiğinde içindeki tween'ler ölür ama bu ref'lerin
   * dışında kalmış (ör. bir önceki döngüden artakalan, `onComplete`'i hâlâ
   * kuyrukta olan) tween'ler hayatta kalıp geçiş bittikten SONRA hedefleri
   * kendi son değerlerine taşıyabiliyordu — ekran görüntüsündeki "panel açık
   * ama state kapalı" kilidi tam olarak bu. `killTweensOf` hedef bazlı
   * çalıştığı için böyle bir artık bırakmaz.
   */
  const killAll = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    closeTweenRef.current?.kill();
    closeTweenRef.current = null;

    const { panel, layers, itemEls, numberEls, footerTitle, revealEls } = collect();
    const targets = [
      ...layers,
      ...itemEls,
      ...numberEls,
      ...revealEls,
      ...(panel ? [panel] : []),
      ...(footerTitle ? [footerTitle] : []),
    ];
    if (targets.length) gsap.killTweensOf(targets);
  }, [collect]);

  /** Kapalı durumun KESİN son hâli. Animasyondan bağımsız, tek yazım noktası. */
  const snapClosed = useCallback(() => {
    const { panel, layers, itemEls, numberEls, footerTitle, revealEls } = collect();
    if (!panel) return;
    gsap.set([panel, ...layers], { xPercent: offscreen, x: 0, y: 0 });
    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) {
      gsap.set(numberEls, { "--sm-num-opacity": 0 } as gsap.TweenVars);
    }
    if (footerTitle) gsap.set(footerTitle, { opacity: 0 });
    if (revealEls.length) gsap.set(revealEls, { y: 25, opacity: 0 });
  }, [collect, offscreen]);

  /** Açık durumun KESİN son hâli. */
  const snapOpen = useCallback(() => {
    const { panel, layers, itemEls, numberEls, footerTitle, revealEls } = collect();
    if (!panel) return;
    gsap.set([panel, ...layers], { xPercent: 0, x: 0, y: 0 });
    if (itemEls.length) gsap.set(itemEls, { yPercent: 0, rotate: 0 });
    if (numberEls.length) {
      gsap.set(numberEls, { "--sm-num-opacity": 1 } as gsap.TweenVars);
    }
    if (footerTitle) gsap.set(footerTitle, { opacity: 1 });
    // `opacity: 1` YAZMA, inline değeri SİL: bu slot'taki dil/tema butonlarının
    // kendi hover/focus opaklıkları CSS'ten geliyor, inline bir 1 onları
    // kilitlerdi. Zaman çizelgesindeki reveal tween'i de aynı sebeple
    // bitişinde `clearProps` yapıyor.
    if (revealEls.length) gsap.set(revealEls, { y: 0, clearProps: "opacity" });
  }, [collect]);

  const playOpen = useCallback(() => {
    killAll();

    const { panel, layers, itemEls, numberEls, footerTitle, revealEls } = collect();
    if (!panel) return;

    if (reduce) {
      snapOpen();
      return;
    }

    // Çocukları başlangıç durumuna al (panel/katmanlar zaten `fromTo` ile
    // açıkça kuruluyor, onlara dokunma — mevcut konumdan devam etmeleri
    // gerekmiyor çünkü `fromTo` başlangıcı yazıyor).
    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) {
      gsap.set(numberEls, { "--sm-num-opacity": 0 } as gsap.TweenVars);
    }
    if (footerTitle) gsap.set(footerTitle, { opacity: 0 });
    if (revealEls.length) gsap.set(revealEls, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    // `fromTo` (upstream ile aynı) — `to` DEĞİL. `to` başlangıç değerini GSAP'ın
    // kendi transform önbelleğinden okur; önbellek DOM ile ayrıştığı anda
    // (React'in inline style'ı yeniden yazması, düğümün yeniden oluşması,
    // GSAP'ın computed matristen % yerine px çıkarması) animasyon edecek bir
    // fark kalmıyor ve panel KAYMADAN sıçrıyordu. `fromTo` başlangıcı açıkça
    // yazdığı için bu ayrışmaya bağışık.
    //
    // Süreler ve easing upstream'den (0.5s / 0.07 kademe / power4.out)
    // uzatıldı: upstream'in paneli dar (38vw), bizimki 85vw.
    //
    // KATMANLAR VE PANEL TEK BİR DALGA. Önceki ayarda panel katmanlardan
    // ayrı bir olaydı (katmanlar bittikten +0.2 sn sonra, farklı süreyle)
    // ve `power2.out` yolun ~%70'ini sürenin ilk ~%30'unda yiyordu: ilk
    // katman göz açıp kapayıncaya kadar %85'lik alanı tamamen kaplıyor,
    // geriye yalnız arkadaki dar bir şeritte kıpırdanma kalıyordu. Yani
    // "anında açıldı, sonra kenarda bir şeyler oldu" izlenimi.
    //
    // Şimdi dördü de (3 katman + panel) AYNI süreyi ve AYNI kademeyi
    // paylaşıyor; panel sıradaki dördüncü eleman. `power1.out` öne yükleme
    // yapmadığı için hepsi yolu %0'dan %85'e gerçekten kat ederken üç renk
    // bandı ön kenarda ayrı ayrı okunuyor.
    const STAGGER = 0.12;
    const TRAVEL_DURATION = 0.95;
    const TRAVEL_EASE = "power1.out";

    layers.forEach((el, i) => {
      tl.fromTo(
        el,
        { xPercent: offscreen, x: 0, y: 0 },
        { xPercent: 0, duration: TRAVEL_DURATION, ease: TRAVEL_EASE },
        i * STAGGER,
      );
    });

    // Panel = dalganın son halkası (katman sayısı × kademe).
    const panelInsert = layers.length * STAGGER;
    const panelDuration = TRAVEL_DURATION;

    tl.fromTo(
      panel,
      { xPercent: offscreen, x: 0, y: 0 },
      { xPercent: 0, duration: panelDuration, ease: TRAVEL_EASE },
      panelInsert,
    );

    if (itemEls.length) {
      const itemsStart = panelInsert + panelDuration * 0.15;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: "power4.out",
          stagger: { each: 0.1, from: "start" },
        },
        itemsStart,
      );

      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            "--sm-num-opacity": 1,
            duration: 0.6,
            ease: "power2.out",
            stagger: { each: 0.08, from: "start" },
          } as gsap.TweenVars,
          itemsStart + 0.1,
        );
      }
    }

    if (footerTitle || revealEls.length) {
      const footerStart = panelInsert + panelDuration * 0.4;
      if (footerTitle) {
        tl.to(footerTitle, { opacity: 1, duration: 0.5, ease: "power2.out" }, footerStart);
      }
      if (revealEls.length) {
        tl.to(
          revealEls,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: { each: 0.08, from: "start" },
            onComplete: () => gsap.set(revealEls, { clearProps: "opacity" }),
          },
          footerStart + 0.04,
        );
      }
    }

    // Zaman çizelgesi bittiğinde son hâli AÇIKÇA yaz. Tween'lerin bıraktığı
    // ara değerlere (yuvarlama, kesilmiş kare, araya giren bir kill) güvenme:
    // "açık" tek bir yerden tanımlı olsun.
    tl.eventCallback("onComplete", snapOpen);

    openTlRef.current = tl;
    tl.play(0);
  }, [offscreen, reduce, collect, killAll, snapOpen]);

  const playClose = useCallback(() => {
    killAll();

    const { panel, layers } = collect();
    if (!panel) return;

    if (reduce) {
      snapClosed();
      return;
    }

    closeTweenRef.current = gsap.to([...layers, panel], {
      xPercent: offscreen,
      x: 0,
      // Kapanış da uzatıldı (0.32 → 0.5). `CLOSE_ANIM_MS` (mobile-menu.tsx)
      // bununla eşleşmeli: gezinme kapanış bitmeden başlarsa panel kayan
      // sayfanın üzerinde sürükleniyormuş gibi görünüyor.
      duration: 0.5,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: snapClosed,
    });
  }, [offscreen, reduce, collect, killAll, snapClosed]);

  const animateIcon = useCallback(
    (opening: boolean) => {
      const h = plusHRef.current;
      const v = plusVRef.current;
      if (!h || !v) return;
      spinTlRef.current?.kill();

      if (reduce) {
        gsap.set(h, { rotate: opening ? 45 : 0 });
        gsap.set(v, { rotate: opening ? -45 : 90 });
        return;
      }

      spinTlRef.current = opening
        ? gsap
            .timeline({ defaults: { ease: "power4.out" } })
            .to(h, { rotate: 45, duration: 0.5 }, 0)
            .to(v, { rotate: -45, duration: 0.5 }, 0)
        : gsap
            .timeline({ defaults: { ease: "power3.inOut" } })
            .to(h, { rotate: 0, duration: 0.35 }, 0)
            .to(v, { rotate: 90, duration: 0.35 }, 0);
    },
    [reduce],
  );

  const animateText = useCallback(
    (opening: boolean) => {
      const inner = textInnerRef.current;
      if (!inner) return;
      textTweenRef.current?.kill();

      const target = opening ? labels.close : labels.open;
      if (reduce) {
        setTextLines([target]);
        gsap.set(inner, { yPercent: 0 });
        return;
      }

      // Menu ↔ Close arasında birkaç tur dönüp hedefte duran dikey şerit.
      const current = opening ? labels.open : labels.close;
      const seq: string[] = [current];
      let last = current;
      for (let i = 0; i < 3; i++) {
        last = last === labels.open ? labels.close : labels.open;
        seq.push(last);
      }
      if (last !== target) seq.push(target);
      seq.push(target);

      setTextLines(seq);
      gsap.set(inner, { yPercent: 0 });

      const finalShift = ((seq.length - 1) / seq.length) * 100;
      textTweenRef.current = gsap.to(inner, {
        yPercent: -finalShift,
        duration: 0.5 + seq.length * 0.07,
        ease: "power4.out",
      });
    },
    [labels.open, labels.close, reduce],
  );

  /**
   * Durum değişikliği taleplerinin TEK kapısı — ve senkron kaynağı.
   *
   * Toggle doğrudan `onOpenChange(!open)` çağırıyordu. `open` bir prop, yani
   * son render'ın değeri: iki tıklama aynı render aralığına düşerse (açılış
   * animasyonu sırasında ana iş parçacığı meşgulken çok olası) İKİSİ DE aynı
   * eski değeri okur ve aynı hedefi gönderir. Kullanıcı iki kez bastığı hâlde
   * menü tek yön değişiyor, üçüncü basışta React'in state'i ile ekrandaki
   * animasyonun bıraktığı durum ayrışıyordu.
   *
   * Ref tıklama anında güncellendiği için ikinci tıklama birincinin sonucunu
   * görür ve gerçekten ters yöne gider. İki tıklama tek batch'te birbirini
   * götürürse React zaten yeniden render etmez — o durumda da ref ile state
   * aynı kalır, ayrışma olmaz.
   */
  const desiredOpenRef = useRef(open);
  useEffect(() => {
    desiredOpenRef.current = open;
  }, [open]);

  const requestOpen = useCallback(
    (next: boolean) => {
      if (desiredOpenRef.current === next) return;
      desiredOpenRef.current = next;
      onOpenChange(next);
    },
    [onOpenChange],
  );

  // `open` prop'u DEĞİŞTİĞİNDE animasyonları sür. `appliedOpenRef` "GSAP en son
  // hangi yöne sürüldü" demek; karşılaştırma şart, aksi halde locale değişince
  // (labels → animateText kimliği değişir) menü açıkken metin animasyonu boş
  // yere yeniden çalışırdı.
  const appliedOpenRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (appliedOpenRef.current === open) return;
    appliedOpenRef.current = open;

    if (open) playOpen();
    else playClose();
    animateIcon(open);
    animateText(open);
  }, [open, hydrated, playOpen, playClose, animateIcon, animateText]);

  // Escape + odak tuzağı — Radix Sheet'in bedava verdiği davranışların yerine.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestOpen(false);
        toggleBtnRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      const toggle = toggleBtnRef.current;
      if (!panel || !toggle) return;

      // Toggle butonu panelin dışında (header'da) ama kapatma kontrolü olduğu
      // için tuzağın içinde kalmalı — bu yüzden listenin başına ekleniyor.
      const focusables = [
        toggle,
        ...(Array.from(panel.querySelectorAll(FOCUSABLE)) as HTMLElement[]),
      ];
      if (focusables.length < 2) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !active)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, requestOpen]);

  // Açılışta odağı ilk menü öğesine taşı (panel girerken zıplamasın diye gecikmeli).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(".sm-panel-item")?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, [open]);

  // Upstream burada `arr.length >= 3` iken ortadaki rengi ATIYORDU, yani üç
  // renk verilse bile yine iki katman çıkıyordu — kademeli sweep'in okunması
  // için gereken üçüncü katman imkânsızdı. O davranış bilerek kaldırıldı:
  // verilen renk sayısı kadar katman (en fazla 4).
  const prelayerColors = colors.length ? colors.slice(0, 4) : ["#1e1e22", "#35353c"];

  const panelMarkup = (
    <div
      ref={scopeRef}
      className="sm-scope pointer-events-none fixed inset-0 z-40 overflow-hidden lg:hidden"
      data-position={position}
      data-open={open || undefined}
      style={{ ["--sm-accent" as string]: accentColor } as React.CSSProperties}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Açıkta kalan şerit: dışarı tıklayınca kapatma alanı + hafif karartma.
          Bilerek YALNIZCA şeridi kaplıyor (`inset-0` değil): tam ekran bir
          katman, panel henüz yoldayken ekranın tamamını kapatıyor ve açılış
          "önce %100 kapla, sonra %85'e çekil" gibi okunuyordu. */}
      <div
        className={`sm-scrim absolute inset-y-0 left-0 z-[1] bg-black/35 ${
          open ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
        // Karartma panelle BİRLİKTE gelir, ondan önce değil. Daha erken
        // gelince (ve koyu temada panel de neredeyse siyahken) ekranın tamamı
        // bir anda kapanıyor, panel henüz yoldayken "sidebar %100 kapladı"
        // izlenimi veriyordu. Açılışta panelin harekete geçtiği ana kadar
        // gecikir; kapanışta gecikme yok. Gecikme panelin zaman çizelgesindeki
        // başlangıcıyla hizalı: katman sayısı × 0.12 ≈ 360 ms.
        style={{
          transition: open
            ? "opacity 800ms ease 360ms"
            : "opacity 300ms ease 0ms",
        }}
        onClick={() => requestOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={preLayersRef}
        className="sm-prelayers pointer-events-none absolute inset-y-0 right-0 z-[5]"
        aria-hidden="true"
      >
        {/* Inline `transform` YOK — bkz. aşağıdaki `:not([data-ready])` kuralı.
            İnline transform GSAP'ın ilk parse'ında computed MATRİSE dönüşüp
            yüzde bilgisini kaybettiriyor ve React'in her reconciliation'da
            yeniden yazabileceği bir değer bırakıyordu; ikisi de GSAP'ın
            önbelleğini DOM'dan ayırıp animasyonu sıçramaya çeviriyor. */}
        {prelayerColors.map((c, i) => (
          <div
            key={i}
            className="sm-prelayer absolute inset-y-0 right-0 w-full"
            style={{ background: c }}
          />
        ))}
      </div>

      <aside
        id={panelId}
        ref={panelRef}
        className="staggered-menu-panel pointer-events-auto absolute inset-y-0 right-0 z-10 flex flex-col overflow-y-auto"
        aria-label={labels.open}
      >
        <div className="flex flex-1 flex-col gap-5">
          <ul
            className="sm-panel-list m-0 flex list-none flex-col gap-4 p-0"
            data-numbering={displayItemNumbering || undefined}
          >
            {items.map((it, idx) => (
              <li
                className="sm-panel-itemWrap relative overflow-hidden leading-none"
                key={it.href + idx}
              >
                <button
                  type="button"
                  className="sm-panel-item"
                  onClick={() => onSelect(it.href)}
                  aria-label={it.ariaLabel}
                >
                  <span className="sm-panel-itemLabel">{it.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {(panelFooterTitle || panelFooter) && (
            <div className="sm-footer mt-auto flex flex-col gap-3 pt-8">
              {panelFooterTitle && (
                <h3 className="sm-footer-title m-0 font-mono text-[11px] font-medium uppercase tracking-[0.3em] opacity-0">
                  {panelFooterTitle}
                </h3>
              )}
              {panelFooter}
            </div>
          )}
        </div>
      </aside>

      <style>{`
/* GSAP kurulum effect'i çalışana kadar (yani ilk boyamada) ekran-dışı emniyet.
   Stylesheet kuralı olarak veriliyor, inline style olarak DEĞİL: GSAP inline
   yazımıyla bunu ezer ve React hiç dokunamaz, dolayısıyla GSAP'ın transform
   önbelleği ile DOM asla ayrışmaz. useLayoutEffect boyamadan önce çalıştığı
   için pratikte bu kural yalnızca JS'in hiç çalışmadığı durumda görünür. */
.sm-scope:not([data-ready]) .staggered-menu-panel,
.sm-scope:not([data-ready]) .sm-prelayer { transform: translateX(100%); }
.sm-scope[data-position='left']:not([data-ready]) .staggered-menu-panel,
.sm-scope[data-position='left']:not([data-ready]) .sm-prelayer { transform: translateX(-100%); }

.sm-scope .staggered-menu-panel {
  /* Tam genişlik değil: açıkta kalan şerit menünün bir katman olduğunu
     okutuyor ve dışarı tıklayıp kapatmaya yer bırakıyor. */
  width: 85%;
  /* Kendi kompozit katmanına al. Bu panel 85vw × 100vh ve İKİ büyük
     radial-gradient taşıyor; promosyon olmadan tarayıcı animasyonun her
     karesinde bu yüzeyi yeniden boyuyor. Panel ayrıca overflow:hidden bir
     kapsayıcının içinde ekran dışında duruyor, yani ilk boyaması tam da
     içeri girdiği anda — animasyonun ilk karelerinde — düşüyordu. */
  will-change: transform;
  padding: 6.5rem 1.5rem 2rem;
  background: var(--popover);
  color: var(--foreground);
  background-image:
    radial-gradient(38rem 26rem at 100% 0%, color-mix(in oklch, var(--brand-turf) 16%, transparent), transparent 70%),
    radial-gradient(30rem 22rem at 0% 100%, color-mix(in oklch, var(--brand-led) 9%, transparent), transparent 65%);
  border-left: 1px solid color-mix(in oklch, var(--foreground) 12%, transparent);
}
.sm-scope[data-position='left'] .staggered-menu-panel {
  right: auto; left: 0;
  border-left: 0;
  border-right: 1px solid color-mix(in oklch, var(--foreground) 12%, transparent);
}
.sm-scope .sm-prelayers { width: 85%; }
.sm-scope .sm-prelayer { will-change: transform; }
.sm-scope[data-position='left'] .sm-prelayers { right: auto; left: 0; }
/* Panelin kapladığı %85 hariç, açıkta kalan şerit. */
.sm-scope .sm-scrim { width: 15%; }
.sm-scope[data-position='left'] .sm-scrim { left: auto; right: 0; }
.sm-scope .sm-panel-item {
  position: relative;
  display: inline-block;
  padding-right: 1.6em;
  border: 0;
  background: none;
  color: inherit;
  font-family: var(--font-display), sans-serif;
  font-size: clamp(1.9rem, 10.5vw, 3.1rem);
  font-weight: 700;
  /* 1 değil: harflerin alt uzantıları (g, s, c kuyrukları) overflow:hidden
     taşıyan .sm-panel-itemWrap tarafından kırpılıyordu. */
  line-height: 1.06;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  text-align: left;
  cursor: pointer;
  transition: color 0.25s;
}
.sm-scope .sm-panel-item:hover,
.sm-scope .sm-panel-item:focus-visible { color: var(--sm-accent); }
.sm-scope .sm-panel-itemLabel {
  display: inline-block;
  will-change: transform;
  transform-origin: 50% 100%;
}
.sm-scope .sm-panel-list[data-numbering] { counter-reset: smItem; }
.sm-scope .sm-panel-list[data-numbering] .sm-panel-item::after {
  counter-increment: smItem;
  content: counter(smItem, decimal-leading-zero);
  position: absolute;
  top: 0.2em;
  right: 0;
  font-family: var(--font-mono), monospace;
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--sm-accent);
  letter-spacing: 0;
  pointer-events: none;
  user-select: none;
  opacity: var(--sm-num-opacity, 0);
}
.sm-scope .sm-footer-title { color: var(--sm-accent); }
      `}</style>
    </div>
  );

  return (
    <>
      <button
        ref={toggleBtnRef}
        type="button"
        className={
          "sm-toggle relative inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent font-mono text-[11px] font-medium uppercase leading-none tracking-[0.2em] transition-colors duration-300 " +
          (toggleClassName ?? "")
        }
        // Panel açıkken buton panelin üzerinde duruyor (header arka planı ve
        // logosu o sırada gizleniyor), dolayısıyla rengi panelin zeminine göre
        // belirlenmeli — header'ın koyu bağlamına göre değil. bkz. globals.css
        style={open ? { color: "var(--sm-toggle-open)" } : undefined}
        aria-label={open ? labels.close : labels.open}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => requestOpen(!desiredOpenRef.current)}
      >
        <span
          className="relative inline-block h-[1em] overflow-hidden whitespace-nowrap"
          aria-hidden="true"
        >
          <span ref={textInnerRef} className="flex flex-col leading-none">
            {textLines.map((l, i) => (
              <span className="block h-[1em] leading-none" key={i}>
                {l}
              </span>
            ))}
          </span>
        </span>

        <span
          className="relative inline-flex size-3.5 shrink-0 items-center justify-center [will-change:transform]"
          aria-hidden="true"
        >
          <span
            ref={plusHRef}
            className="absolute left-1/2 top-1/2 h-[2px] w-full -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-current [will-change:transform]"
          />
          <span
            ref={plusVRef}
            className="absolute left-1/2 top-1/2 h-[2px] w-full -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-current [will-change:transform]"
          />
        </span>
      </button>

      {hydrated && createPortal(panelMarkup, document.body)}
    </>
  );
}
