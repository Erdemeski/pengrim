"use client";

/**
 * Dinamik chunk ön-ısıtma.
 *
 * NEDEN ELLE: App Router'da `next/dynamic` bir `.preload()` metodu vermiyor —
 * `node_modules/next/dist/shared/lib/lazy-dynamic/loadable.js` içinde
 * `Loadable()` yalnızca `displayName` taşıyan çıplak bir bileşen döndürüyor
 * (pages router'daki preload yolu `app-dynamic.js` tarafından kullanılmıyor).
 * Bu yüzden chunk'ı, `dynamic()` çağrısındakiyle BİREBİR AYNI literal
 * specifier'a sahip ikinci bir `import()` ile ısıtıyoruz; bundler ikisini aynı
 * chunk'a eşler ve React.lazy'nin loader'ı modül önbelleğinden mikro-görevde
 * çözülür — yani kullanıcı o bölüme geldiğinde bekleme ya da pop-in olmaz.
 *
 * Specifier'lar mutlaka literal olmalı (şablon dizgi/değişken olmaz), aksi
 * halde bundler eşleştiremez.
 */

const started = new Set<string>();

function run(key: string, load: () => Promise<unknown>) {
  void load().catch(() => {
    // Ağ hatası: bayrağı geri al ki bileşen gerçekten gerektiğinde
    // dynamic() kendi denemesini yapabilsin.
    started.delete(key);
  });
}

/**
 * Boşta indir. Ekranın altındaki, hemen gerekmeyen chunk'lar için.
 * `timeout` ile tarayıcı hiç boşa çıkmazsa da en geç 2.5 sn'de başlar.
 */
export function prewarm(key: string, load: () => Promise<unknown>) {
  if (typeof window === "undefined" || started.has(key)) return;
  started.add(key);

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(key, load), { timeout: 2500 });
  } else {
    window.setTimeout(() => run(key, load), 1);
  }
}

/**
 * Hemen indir (ana chunk ile paralel), ama ayrı chunk olduğu için parse'ı
 * ana bundle'ın kritik yolunu uzatmaz. Ekran üstü bileşenler için.
 */
export function prewarmEager(key: string, load: () => Promise<unknown>) {
  if (typeof window === "undefined" || started.has(key)) return;
  started.add(key);
  run(key, load);
}
