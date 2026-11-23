import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24, sw = 2): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size, 3)} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconHome = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const IconPen = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
export const IconChart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
);
export const IconUser = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconFlame = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" /></svg>
);
export const IconGlass = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 3h8l-1 7a3 3 0 0 1-6 0z" /><path d="M12 13v7" /><path d="M8 21h8" /></svg>
);
export const IconNoSmoke = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 14h12" /><path d="M18 14h3" /><path d="M3 18h18" /><path d="M3 14v4" /><path d="M4 4l16 16" /></svg>
);
export const IconStreak = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12l4 4 10-10" /><path d="M5 19h14" /></svg>
);
export const IconMoon = ({ size, ...p }: P) => (
  <svg {...base(size, 2.4)} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size, 2.4)} {...p}><path d="M15 6l-6 6 6 6" /></svg>
);
export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size, 2.4)} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const IconMinus = ({ size, ...p }: P) => (
  <svg {...base(size, 2.4)} {...p}><path d="M5 12h14" /></svg>
);
export const IconX = ({ size, ...p }: P) => (
  <svg {...base(size, 2.4)} {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
);
export const IconScale = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a5 5 0 0 1 8 0" /><path d="M12 9l1.5-2" /></svg>
);
export const IconTrophy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3a3 3 0 0 1-3 4" /><path d="M7 5H4a3 3 0 0 0 3 4" /></svg>
);
export const IconLock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
);
export const IconDownload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M5 20h14" /></svg>
);
export const IconLeaf = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" /><path d="M5 19c3-4 6-6 10-8" /></svg>
);
export const IconCloudOff = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 3l18 18" /><path d="M8 8a5 5 0 0 0-1 9h10" /><path d="M11 6a5 5 0 0 1 7 4h1a3 3 0 0 1 2 5" /></svg>
);
