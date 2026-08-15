"use client";
import React, { useLayoutEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
/**
 * Yerel fork notu (upstream React Bits'ten tek sapma):
 *
 * Upstream'in `!useWindowScroll` dalındaki İKİNCİ Lenis örneği kaldırıldı.
 * Sayfada zaten kök bir Lenis var (`SmoothScroll`) ve bu proje bileşeni
 * yalnızca `useWindowScroll` ile kullanıyor; ikinci motor hem çakışma riskiydi
 * hem de `lenis` paketini boşuna bundle'a sokuyordu. Konteyner modu korunuyor,
 * ama kendi scroll motorunu kurmadan konteynerin native scroll'unu dinleyerek.
 *
 * Scroll matematiği ve ölçüm sırası upstream ile birebir aynı bırakıldı.
 * (Kart ofsetlerini kare başına bir kez yerine önbelleğe alma denendi ve GERİ
 * ALINDI: ofsetler *belge* koordinatı ve hero'nun ScrollTrigger `pin: true`
 * spacer'ı belge yüksekliğini ScrollStack ölçtükten SONRA değiştiriyor →
 * önbellek kalıcı olarak yanlış kalıp kartları bölümün altında iç içe
 * yığıyordu.)
 */

export interface ScrollStackItemProps {
  itemClassName?: string;
  children: ReactNode;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({ children, itemClassName = '' }) => (
  <div
    className={`scroll-stack-card relative w-full h-80 my-8 p-12 rounded-[40px] shadow-[0_0_30px_rgba(0,0,0,0.1)] box-border origin-top will-change-transform ${itemClassName}`.trim()}
    style={{
      backfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d'
    }}
  >
    {children}
  </div>
);

type CardTransform = {
  translateY: number;
  scale: number;
  rotation: number;
  blur: number;
};

interface ScrollStackProps {
  className?: string;
  children: ReactNode;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
}

const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  useWindowScroll = false,
  onStackComplete
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackCompletedRef = useRef(false);
  const cardsRef = useRef<HTMLElement[]>([]);
  const lastTransformsRef = useRef(new Map<number, CardTransform>());

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value: string | number, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value as string);
  }, []);

  /**
   * Pencere modunda scrollY/innerHeight planlayıcıdan gelir — kare başına tek
   * okuma. Konteyner modunda (bu projede kullanılmıyor) konteynerden okunur.
   */
  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
    }
    const scroller = scrollerRef.current;
    return {
      scrollTop: scroller ? scroller.scrollTop : 0,
      containerHeight: scroller ? scroller.clientHeight : 0
    };
  }, [useWindowScroll]);

  const getElementOffset = useCallback(
    (element: HTMLElement) => {
      if (useWindowScroll) {
        // offsetTop zinciri layout tabanlıdır; uygulanan CSS transform'lardan
        // ETKİLENMEZ → pin hesabında geri-besleme/titreşim oluşmaz.
        let top = 0;
        let node: HTMLElement | null = element;
        while (node) {
          top += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return top;
      }
      return element.offsetTop;
    },
    [useWindowScroll]
  );

  const updateCardTransforms = useCallback(
    () => {
      if (!cardsRef.current.length) return;

      const { scrollTop, containerHeight } = getScrollData();
      const stackPositionPx = parsePercentage(stackPosition, containerHeight);
      const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);

      const endElement = useWindowScroll
        ? (document.querySelector('.scroll-stack-end') as HTMLElement | null)
        : (scrollerRef.current?.querySelector('.scroll-stack-end') as HTMLElement | null);
      const endElementTop = endElement ? getElementOffset(endElement) : 0;

      // Tüm kart layout offset'lerini transform YAZMADAN önce topluca oku
      // (okuma/yazma serpiştirilirse reflow thrash olur).
      const cardTops = cardsRef.current.map(c => (c ? getElementOffset(c) : 0));

      cardsRef.current.forEach((card, i) => {
      if (!card) return;

      const cardTop = cardTops[i];
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      let blur = 0;
      if (blurAmount) {
        let topCardIndex = 0;
        for (let j = 0; j < cardsRef.current.length; j++) {
          const jCardTop = cardTops[j];
          const jTriggerStart = jCardTop - stackPositionPx - itemStackDistance * j;
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j;
          }
        }

        if (i < topCardIndex) {
          const depthInStack = topCardIndex - i;
          blur = Math.max(0, depthInStack * blurAmount);
        }
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100
      };

      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';

        card.style.transform = transform;
        card.style.filter = filter;

        lastTransformsRef.current.set(i, newTransform);
      }

      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
      });
    },
    [
      itemScale,
      itemStackDistance,
      stackPosition,
      scaleEndPosition,
      baseScale,
      rotationAmount,
      blurAmount,
      onStackComplete,
      calculateProgress,
      parsePercentage,
      getScrollData,
      getElementOffset,
      useWindowScroll
    ]
  );

  const scrollRafRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    // Native 'scroll' event'i bir frame'de birden fazla kez tetiklenebilir
    // (özellikle dokunmatik/mobil cihazlarda); rAF ile frame başına tek
    // güncellemeye düşürerek ana iş parçacığı kasmasını önler.
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateCardTransforms();
    });
  }, [updateCardTransforms]);

  useLayoutEffect(() => {
    if (!useWindowScroll && !scrollerRef.current) return;

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll('.scroll-stack-card')
        : (scrollerRef.current?.querySelectorAll('.scroll-stack-card') ?? [])
    ) as HTMLElement[];
    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      card.style.webkitTransform = 'translateZ(0)';
      card.style.perspective = '1000px';
      card.style.webkitPerspective = '1000px';
    });

    // Sayfanın global Lenis'i (SmoothScroll) pencereyi gerçek scroll ile sürer
    // ve native 'scroll' event'i tetikler; konteyner modunda da konteynerin
    // kendi scroll'u dinlenir. Her iki durumda da ikinci bir Lenis kurulmaz.
    const scroller = scrollerRef.current;
    const target: Window | HTMLElement | null = useWindowScroll ? window : scroller;
    target?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    updateCardTransforms();

    return () => {
      target?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      stackCompletedRef.current = false;
      cardsRef.current = [];
      transformsCache.clear();
    };
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    handleScroll,
    updateCardTransforms
  ]);

  return (
    <div
      className={`relative w-full overflow-x-visible ${
        useWindowScroll ? '' : 'h-full overflow-y-auto'
      } ${className}`.trim()}
      ref={scrollerRef}
      style={{
        overscrollBehavior: useWindowScroll ? undefined : 'contain',
        WebkitOverflowScrolling: 'touch',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        willChange: 'scroll-position'
      }}
    >
      <div className="scroll-stack-inner pt-[6vh] pb-[22vh]">
        {children}
        {/* Spacer so the last pin can release cleanly */}
        <div className="scroll-stack-end w-full h-px" />
      </div>
    </div>
  );
};

export default ScrollStack;
