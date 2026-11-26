import { cn } from "@/lib/utils";

/**
 * Envanterdeki metin kartlarının çizimleri. Jenerik bir ikon yerine kartın
 * anlattığı şeyi gösteriyorlar: saha planındaki temas noktaları ve yayın
 * kadrajındaki marka süresi. İnce turf çizgi + LED yeşili vurgu; her iki
 * temada da token renkleriyle çalışır.
 */

type StadiumPlanProps = {
  className?: string;
  labels: { goalBack: string; stands: string; tunnel: string };
};

/** Kuşbakışı stadyum: kale arkası, tribün ve tünel vurgulu. */
export function StadiumPlan({ className, labels }: StadiumPlanProps) {
  return (
    <svg
      viewBox="0 0 320 214"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={`${labels.goalBack}, ${labels.stands}, ${labels.tunnel}`}
    >
      <g transform="translate(0 16)">
      <g fill="none" stroke="currentColor" className="text-turf" strokeOpacity={0.55}>
        {/* tribün halkası */}
        <rect x="6" y="6" width="308" height="168" rx="34" strokeWidth={1.25} />
        <rect x="30" y="26" width="260" height="128" rx="14" strokeWidth={1} strokeOpacity={0.35} />
        {/* saha */}
        <rect x="46" y="38" width="228" height="104" rx="2" strokeWidth={1.25} />
        <path d="M160 38 V142" strokeWidth={1} />
        <circle cx="160" cy="90" r="17" strokeWidth={1} />
        <rect x="46" y="64" width="30" height="52" strokeWidth={1} />
        <rect x="244" y="64" width="30" height="52" strokeWidth={1} />
      </g>

      {/* vurgular */}
      <g className="text-led" fill="currentColor">
        {/* kale arkası panoları */}
        <rect x="36" y="58" width="5" height="64" rx="1.5" />
        <rect x="279" y="58" width="5" height="64" rx="1.5" />
        {/* tribün bölümü (üst kale) */}
        <path
          d="M104 12 H216 A2 2 0 0 1 218 14 V21 A2 2 0 0 1 216 23 H104 A2 2 0 0 1 102 21 V14 A2 2 0 0 1 104 12 Z"
          fillOpacity={0.85}
        />
        {/* tünel */}
        <rect x="150" y="150" width="20" height="18" rx="2" fillOpacity={0.85} />
      </g>
      </g>

      {/* etiketler vurguladıkları bölgenin hizasında */}
      <g className="fill-muted-foreground" fontSize="10.5" fontFamily="var(--font-sans)">
        <text x="160" y="10" textAnchor="middle">
          {labels.stands}
        </text>
        <text x="38" y="210">{labels.goalBack}</text>
        <text x="160" y="210" textAnchor="middle">
          {labels.tunnel}
        </text>
      </g>
    </svg>
  );
}

type BroadcastFrameProps = {
  className?: string;
  labels: { live: string; onScreen: string };
};

/**
 * Kamera kadrajı + maç süresi çubuğu. Çubuktaki yeşil bölümler markanın
 * ekranda olduğu dakikalar ("garantili marka süresi"). Tek hareket: CANLI
 * noktasının nabzı (hareket azaltmada global kural animasyonu durdurur).
 */
export function BroadcastFrame({ className, labels }: BroadcastFrameProps) {
  // 0–90' içinde markanın ekranda olduğu aralıklar (dakika)
  const segments: Array<[number, number]> = [
    [4, 13],
    [21, 27],
    [33, 44],
    [52, 58],
    [63, 75],
    [81, 88],
  ];
  const x0 = 24;
  const x1 = 296;
  const toX = (m: number) => x0 + ((x1 - x0) * m) / 90;

  return (
    <svg
      viewBox="0 0 320 196"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label={labels.onScreen}
    >
      {/* kadraj köşe işaretleri */}
      <g fill="none" stroke="currentColor" className="text-turf" strokeOpacity={0.6} strokeWidth={1.5}>
        <path d="M24 34 V20 H40" />
        <path d="M280 20 H296 V34" />
        <path d="M24 118 V132 H40" />
        <path d="M280 132 H296 V118" />
      </g>

      {/* kadrajdaki saha kenarı: LED bandı ve üzerindeki marka panoları */}
      <g>
        <path d="M24 96 L296 88" stroke="currentColor" className="text-turf" strokeOpacity={0.35} strokeWidth={1} />
        <path d="M44 92 L276 85 L276 76 L44 82 Z" className="fill-muted" />
        <path d="M108 90 L176 88 L176 79 L108 81 Z" className="fill-led" />
        <path d="M44 92 L276 85" stroke="currentColor" className="text-turf" strokeOpacity={0.4} strokeWidth={1} fill="none" />
      </g>

      {/* CANLI etiketi */}
      <g>
        <circle cx="38" cy="47" r="4" className="fill-[oklch(0.65_0.22_25)] animate-pulse" />
        <text x="48" y="51" fontSize="11" fontWeight="600" letterSpacing="1" className="fill-foreground" fontFamily="var(--font-sans)">
          {labels.live}
        </text>
      </g>

      {/* maç süresi çubuğu */}
      <g>
        <rect x={x0} y="156" width={x1 - x0} height="6" rx="3" className="fill-muted" />
        {segments.map(([a, b]) => (
          <rect key={a} x={toX(a)} y="156" width={toX(b) - toX(a)} height="6" rx="3" className="fill-led" />
        ))}
        <g fontSize="10" fontFamily="var(--font-mono)" className="fill-muted-foreground">
          <text x={x0} y="178">0&apos;</text>
          <text x={toX(45)} y="178" textAnchor="middle">
            45&apos;
          </text>
          <text x={x1} y="178" textAnchor="end">
            90&apos;
          </text>
        </g>
      </g>
    </svg>
  );
}
