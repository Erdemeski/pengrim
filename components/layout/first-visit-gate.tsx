"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLenis } from "lenis/react";
import Image from "next/image";
import {
  subscribeHeroReady,
  getHeroReady,
  getHeroReadyServerSnapshot,
} from "@/lib/hero-ready-store";

/**
 * İlk ziyaret kapısı — YALNIZCA gerçekten gerekiyorsa.
 *
 * Sayfanın ilk penceresi hero'nun scroll-scrub kare dizisi; kareler henüz
 * gelmeden kaydırmaya başlayan kullanıcı takılma görüyordu. Bu kapı o pencereyi
 * kapatır, ama hızlı bağlantıda ya da önbellekli ziyarette HİÇ GÖRÜNMEZ.
 *
 * Kurallar:
 *   • Kurulumdan sonra `ARM_MS` (400 ms) beklenir. Hero o süre içinde hazırsa
 *     kapı hiç render edilmez — yani önbellek tespiti için ayrı bir prob'a
 *     gerek yok, bekleme süresinin kendisi tespittir.
 *   • Açıldıysa hazır olunca VEYA `CAP_MS` (1600 ms) sert üst sınırında kapanır;
 *     hangisi önce gelirse. Kapı asla darboğaz olamaz.
 *   • Bir kez tamamlandığında `sessionStorage` bayrağı ile aynı oturumdaki
 *     sonraki yüklemelerde hiç kurulmaz.
 *   • `prefers-reduced-motion`'da hiç gösterilmez (o modda kare dizisi zaten
 *     yüklenmiyor).
 *
 * Görsel olarak yeni bir marka ekranı icat edilmiyor: hero'nun kendi poster
 * karesi + zaten indirilen beyaz wordmark kullanılıyor.
 */

const ARM_MS = 400;
const CAP_MS = 1600;
const WARM_KEY = "pg:warm";

export function FirstVisitGate() {
  const reduce = useReducedMotion();
  const lenis = useLenis();
  const [armed, setArmed] = useState(false);
  const [needed, setNeeded] = useState(false);
  const [capped, setCapped] = useState(false);

  const heroReady = useSyncExternalStore(
    subscribeHeroReady,
    getHeroReady,
    getHeroReadyServerSnapshot,
  );

  // Görünürlük TÜRETİLİR, saklanmaz: "hazır oldu" ve "üst sınıra gelindi"
  // durumlarını ayrı state'e kopyalamak effect içinde zincirleme render üretirdi.
  const visible = needed && !heroReady && !capped;

  // ARM_MS sonunda hâlâ hazır değilse kapıyı aç.
  useEffect(() => {
    if (reduce) return;
    let warm = false;
    try {
      warm = sessionStorage.getItem(WARM_KEY) === "1";
    } catch {
      // private mode / storage kapalı → soğuk ziyaret varsay
    }
    if (warm) return;

    const id = window.setTimeout(() => {
      setArmed(true);
      setNeeded(!getHeroReady());
    }, ARM_MS);
    return () => window.clearTimeout(id);
  }, [reduce]);

  // Sert üst sınır — kapı asla darboğaz olamaz.
  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setCapped(true), CAP_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  // Kapı kapandıktan sonra oturum bayrağını yaz.
  useEffect(() => {
    if (!armed || visible) return;
    try {
      sessionStorage.setItem(WARM_KEY, "1");
    } catch {
      // no-op
    }
  }, [armed, visible]);

  // Kapı açıkken sayfa kaymasın (showcase-lightbox ile aynı kalıp).
  useEffect(() => {
    if (!lenis) return;
    if (visible) lenis.stop();
    else lenis.start();
  }, [visible, lenis]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="first-visit-gate"
          aria-hidden="true"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[2000] grid place-items-center bg-pitch"
          style={{ touchAction: "none", overscrollBehavior: "contain" }}
        >
          {/* hero'nun kendi poster karesi — zaten indiriliyor, ek ağırlık yok */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: "url(/pengrim-first-frame-edited.webp)" }}
          />
          <div className="relative flex flex-col items-center gap-6">
            <Image
              src="/pengrim_beyaz.png"
              alt=""
              width={2000}
              height={447}
              sizes="360px"
              priority
              className="w-[min(70vw,360px)] opacity-90"
            />
            {/* LED şeridi — hero logosunun altındaki parıltı çizgisiyle aynı dil */}
            <span className="relative block h-px w-[min(50vw,240px)] overflow-hidden bg-white/15">
              <motion.span
                className="absolute inset-y-0 w-1/3 bg-led"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
