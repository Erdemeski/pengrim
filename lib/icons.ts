import {
  MonitorPlay,
  Megaphone,
  Radio,
  Layers,
  CalendarSearch,
  LayoutGrid,
  BadgeCheck,
  ChartColumnBig,
  Tv,
  MonitorSmartphone,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";

/** İkon adından bileşene tek noktadan eşleme (tree-shaking korunur). */
export const ICONS = {
  MonitorPlay,
  Megaphone,
  Radio,
  Layers,
  CalendarSearch,
  LayoutGrid,
  BadgeCheck,
  ChartColumnBig,
  Tv,
  MonitorSmartphone,
  Share2,
  Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
