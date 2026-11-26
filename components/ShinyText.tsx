"use client";
import React, { useEffect, useRef, useState } from 'react';
import { usePerfTier } from '@/lib/perf-tier';

/**
 * Yerel fork (React Bits "ShinyText").
 *
 * Upstream parıltıyı `useAnimationFrame` ile JS'ten, HER karede ve bileşen
 * ekranda olsun olmasın sürüyordu: sayfadaki her bölüm başlığı sürekli bir
 * rAF döngüsü + background-clip:text yeniden boyaması demekti. Artık:
 *  - Animasyon saf CSS (`@keyframes shiny-text`, bkz. globals.css).
 *  - Ekran dışındayken `animation-play-state: paused` (IntersectionObserver).
 *  - Zayıf cihazda parıltı kapalı, metin düz renkte.
 * Görünüm ve hız upstream ile aynı. `delay` yalnızca ilk başlangıcı öteler.
 */

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  delay?: number;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 2,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  delay = 0
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const tier = usePerfTier();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const off = disabled || tier === 'low';
  const running = !off && onScreen && !(pauseOnHover && hovered);

  const style: React.CSSProperties = off
    ? { color }
    : {
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animationName: 'shiny-text',
        animationDuration: `${speed}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationDirection: yoyo
          ? direction === 'left'
            ? 'alternate'
            : 'alternate-reverse'
          : direction === 'left'
            ? 'normal'
            : 'reverse',
        animationDelay: delay ? `${delay}s` : undefined,
        animationPlayState: running ? 'running' : 'paused'
      };

  return (
    <span
      ref={ref}
      className={`inline-block ${className}`}
      style={style}
      onMouseEnter={pauseOnHover ? () => setHovered(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setHovered(false) : undefined}
    >
      {text}
    </span>
  );
};

export default ShinyText;
