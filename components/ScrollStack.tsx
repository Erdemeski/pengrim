"use client";
import React, { Children, Fragment, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { subscribeScroll } from '@/lib/scroll-clock';
import { getStableViewport, subscribeViewport } from '@/lib/viewport';

/**
 * Yerel fork (React Bits "ScrollStack").
 *
 * Upstream kartları JS ile pinliyordu: `translateY = scrollY − cardTop`.
 * Dokunmatik cihazlarda scroll compositor thread'inde, bu JS ana thread'de
 * çalıştığı için kartlar her karede bir kare geriden gelip sarsılıyordu
 * (özellikle zayıf GPU/CPU'da). Artık:
 *
 *  - PIN tamamen CSS: her kart `position: sticky; top: stackPosition`.
 *    Tarayıcı bunu scroll ile aynı karede, compositor'da çözer → titreme yok.
 *  - Yığın kademesi (`itemStackDistance * i`) scroll'a BAĞLI OLMAYAN statik bir
 *    `translateY`. Bütün kartların sticky üstü ve yüksekliği aynı olduğu için
 *    hepsi aynı anda bırakılır; upstream'deki "birlikte yukarı kayma" korunur.
 *  - JS yalnızca `scale` yazar (ölçek gecikmesi gözle görülmez) ve bunu sayfanın
 *    tek scroll saatinden (`lib/scroll-clock`) aynı karede yapar.
 *  - Kartlar arası boşluk `margin-bottom` yerine ayrı boşluk elemanlarıyla
 *    veriliyor: sticky elemanın margin kutusu kapsayıcıya sığmak zorunda,
 *    margin'li kartlar boşluk kadar ERKEN bırakılırdı.
 *
 * Ölçek matematiği (triggerStart/End, baseScale + i*itemScale) upstream ile
 * aynıdır; tek fark kart üstlerinin sticky'den etkilenmeyen DOĞAL konumdan
 * ölçülmesi.
 */

export interface ScrollStackItemProps {
  itemClassName?: string;
  children: ReactNode;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({ children, itemClassName = '' }) => (
  <div
    className={`scroll-stack-card relative w-full h-80 mt-8 p-12 rounded-[40px] shadow-[0_0_30px_rgba(0,0,0,0.1)] box-border origin-top will-change-transform ${itemClassName}`.trim()}
  >
    {children}
  </div>
);

interface ScrollStackProps {
  className?: string;
  children: ReactNode;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  /** Upstream API uyumluluğu için duruyor; ölçek scroll'a doğrudan bağlı. */
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  /** Upstream API uyumluluğu — bu fork her zaman pencere scroll'unu kullanır. */
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
}

const parsePercentage = (value: string | number, containerHeight: number) => {
  if (typeof value === 'string' && value.includes('%')) {
    return (parseFloat(value) / 100) * containerHeight;
  }
  return parseFloat(value as string);
};

/** offsetParent zinciri: transform'lardan etkilenmez. */
const offsetTopOf = (el: HTMLElement): number => {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
};

const progressOf = (y: number, start: number, end: number) =>
  y <= start ? 0 : y >= end ? 1 : (y - start) / (end - start || 1);

const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  rotationAmount = 0,
  blurAmount = 0,
  onStackComplete
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const onStackCompleteRef = useRef(onStackComplete);
  useLayoutEffect(() => {
    onStackCompleteRef.current = onStackComplete;
  }, [onStackComplete]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.scroll-stack-card'));
    const endEl = root.querySelector<HTMLElement>('.scroll-stack-end');
    const inner = root.querySelector<HTMLElement>('.scroll-stack-inner');
    if (!cards.length) return;

    const st = {
      tops: [] as number[],
      stackPx: 0,
      scaleEndPx: 0,
      cardH: 0,
      releaseY: 0,
      vh: 0,
      completed: false,
    };
    const last = cards.map(() => '');
    let roTimer = 0;

    const measure = () => {
      const vh = getStableViewport().h;
      st.vh = vh;
      st.stackPx = parsePercentage(stackPosition, vh);
      st.scaleEndPx = parsePercentage(scaleEndPosition, vh);

      // Doğal (sticky'siz) konum: offsetTop sticky ofsetini içerdiği için
      // ölçüm anında sticky kısa süre kapatılır. Yalnız ölçümde, kare başına değil.
      for (const c of cards) c.style.position = 'relative';
      st.tops = cards.map(offsetTopOf);
      st.cardH = cards[0].offsetHeight;
      // Upstream yığını, bitiş işareti viewport ortasına gelince bırakıyordu
      // (pinEnd = endTop − vh/2). Sticky ise kapsayıcı sonu kart altına
      // değince bırakır; aradaki farkı bitiş işaretinin yüksekliğiyle kapat
      // ve aynı miktarı alt boşluktan düş → bölüm yüksekliği değişmez.
      let endBottom = 0;
      if (endEl) {
        const extra = Math.max(1, Math.round(st.stackPx + st.cardH - vh / 2));
        endEl.style.height = `${extra}px`;
        if (inner) inner.style.paddingBottom = `max(0px, calc(22vh - ${extra}px))`;
        endBottom = offsetTopOf(endEl) + extra;
      }
      for (const c of cards) {
        c.style.position = 'sticky';
        c.style.top = `${st.stackPx}px`;
      }
      // Kapsayıcının içerik alt kenarı kart altına değdiğinde sticky bırakır.
      st.releaseY = endBottom - (st.stackPx + st.cardH);
      last.fill('');
    };

    const apply = (y: number) => {
      for (let i = 0; i < cards.length; i++) {
        const cardTop = st.tops[i];
        const triggerStart = cardTop - st.stackPx - itemStackDistance * i;
        const triggerEnd = cardTop - st.scaleEndPx;
        const p = progressOf(y, triggerStart, triggerEnd);
        const scale = 1 - p * (1 - (baseScale + i * itemScale));
        const rotation = rotationAmount ? i * rotationAmount * p : 0;

        let blur = 0;
        if (blurAmount) {
          let topIdx = 0;
          for (let j = 0; j < cards.length; j++) {
            if (y >= st.tops[j] - st.stackPx - itemStackDistance * j) topIdx = j;
          }
          if (i < topIdx) blur = (topIdx - i) * blurAmount;
        }

        const key = `${scale.toFixed(4)}|${rotation.toFixed(2)}|${blur.toFixed(2)}`;
        if (key !== last[i]) {
          last[i] = key;
          const card = cards[i];
          card.style.transform =
            `translate3d(0, ${itemStackDistance * i}px, 0) scale(${scale.toFixed(4)})` +
            (rotation ? ` rotate(${rotation.toFixed(2)}deg)` : '');
          card.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : '';
        }
      }

      const lastIdx = cards.length - 1;
      const pinStart = st.tops[lastIdx] - st.stackPx;
      const inView = y >= pinStart && y <= st.releaseY;
      if (inView !== st.completed) {
        st.completed = inView;
        if (inView) onStackCompleteRef.current?.();
      }
    };

    const remeasure = () => {
      measure();
      apply(window.scrollY);
    };

    for (const c of cards) {
      c.style.transformOrigin = 'top center';
      c.style.zIndex = '';
    }
    remeasure();

    const onResize = () => {
      remeasure();
    };

    // Hero'nun pin spacer'ı, font ve görsel yüklemeleri belge yüksekliğini
    // ölçümden SONRA değiştirebiliyor → gövde boyutu değişince yeniden ölç.
    const ro = new ResizeObserver(() => {
      if (roTimer) return;
      roTimer = window.setTimeout(() => {
        roTimer = 0;
        remeasure();
      }, 120);
    });
    ro.observe(document.body);
    document.fonts?.ready.then(remeasure).catch(() => {});

    const unsub = subscribeScroll(apply);
    // Yalnız gerçek boyut değişiminde (URL çubuğu animasyonunda değil).
    const unsubViewport = subscribeViewport(onResize);

    return () => {
      unsub();
      ro.disconnect();
      if (roTimer) clearTimeout(roTimer);
      unsubViewport();
      if (endEl) endEl.style.height = '';
      if (inner) inner.style.paddingBottom = '';
      for (const c of cards) {
        c.style.position = '';
        c.style.top = '';
        c.style.transform = '';
        c.style.filter = '';
      }
    };
  }, [itemStackDistance, stackPosition, scaleEndPosition, baseScale, itemScale, rotationAmount, blurAmount]);

  const items = Children.toArray(children);

  return (
    <div className={`relative w-full ${className}`.trim()} ref={rootRef}>
      <div className="scroll-stack-inner pt-[6vh] pb-[22vh]">
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? (
              // kartın kendi mt-8 (32px) payı düşülür → eski aralıkla birebir
              <div aria-hidden="true" style={{ height: Math.max(0, itemDistance - 32) }} />
            ) : null}
          </Fragment>
        ))}
        {/* Sticky kartların bırakılacağı kapsayıcı sonu */}
        <div className="scroll-stack-end w-full h-px" />
      </div>
    </div>
  );
};

export default ScrollStack;
