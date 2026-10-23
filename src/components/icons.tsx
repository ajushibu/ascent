import type { ReactNode, SVGProps } from 'react';

type P = { size?: number; fill?: string } & Omit<SVGProps<SVGSVGElement>, 'fill'>;
const base = (size: number, children: ReactNode, rest: SVGProps<SVGSVGElement>) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const I = {
  Home: ({ size = 26, ...r }: P) => base(size, <><path d="M3.5 11 12 3.8 20.5 11" /><path d="M5.5 9.6V19a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9.6" /><path d="M9.8 20.5v-5.2a2.2 2.2 0 0 1 4.4 0v5.2" /></>, r),
  Calendar: ({ size = 26, ...r }: P) => base(size, <><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /><path d="M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01" strokeWidth={2.8} /></>, r),
  Chart: ({ size = 26, ...r }: P) => base(size, <><path d="M7 20V12M12 20V5M17 20v-5" strokeWidth={2.8} /></>, r),
  Paper: ({ size = 26, ...r }: P) => base(size, <><path d="M7 3.5h7.2L19 8.3V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" /><path d="M14 3.8V8.5h4.7" /><path d="m9.2 14.2 2 2 3.6-4" /></>, r),
  Play: ({ size = 30, ...r }: P) => base(size, <path d="M8 5.2v13.6a.9.9 0 0 0 1.4.8l10.5-6.8a.9.9 0 0 0 0-1.5L9.4 4.4A.9.9 0 0 0 8 5.2Z" fill="currentColor" />, r),
  Pause: ({ size = 28, ...r }: P) => base(size, <><rect x="6.5" y="5" width="4" height="14" rx="1.6" fill="currentColor" /><rect x="13.5" y="5" width="4" height="14" rx="1.6" fill="currentColor" /></>, r),
  Stop: ({ size = 26, ...r }: P) => base(size, <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" />, r),
  Flame: ({ size = 26, ...r }: P) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...r}>
      <path d="M12.4 2.2c.5 3.1-1.2 4.6-2.8 6.3C8 10.2 6.3 12 6.3 14.8A5.7 5.7 0 0 0 12 20.6a5.7 5.7 0 0 0 5.7-5.7c0-2-.9-3.5-1.9-4.7-.2 1.4-.9 2.1-1.7 2.4.5-2.9-.2-6.5-1.7-10.4Z" fill="#F57C0A" />
      <path d="M12 20.6a3.2 3.2 0 0 1-3.2-3.2c0-1.6 1-2.6 1.9-3.5.5-.5.9-1 1.1-1.7 1.9 1.4 3.4 2.7 3.4 5.2A3.2 3.2 0 0 1 12 20.6Z" fill="#FFC53D" />
    </svg>
  ),
  Menu: ({ size = 24, ...r }: P) => base(size, <path d="M5 8.5h14M5 15.5h9" strokeWidth={2.6} />, r),
  Check: ({ size = 22, ...r }: P) => base(size, <path d="m5.5 12.8 4.2 4.2 8.8-9.6" strokeWidth={3} />, r),
  Plus: ({ size = 22, ...r }: P) => base(size, <path d="M12 5v14M5 12h14" strokeWidth={2.8} />, r),
  Minus: ({ size = 22, ...r }: P) => base(size, <path d="M5 12h14" strokeWidth={2.8} />, r),
  X: ({ size = 22, ...r }: P) => base(size, <path d="M6 6l12 12M18 6 6 18" strokeWidth={2.6} />, r),
  Undo: ({ size = 22, ...r }: P) => base(size, <><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9.5a5 5 0 0 1 0 10H11" transform="translate(0 -3)" /></>, r),
  Bolt: ({ size = 20, ...r }: P) => base(size, <path d="M13.2 2.8 5.4 13.4a.8.8 0 0 0 .65 1.28H11l-.9 6.2a.5.5 0 0 0 .9.36l7.6-10.6a.8.8 0 0 0-.65-1.26H13l.9-6.2a.5.5 0 0 0-.7-.5Z" fill="currentColor" strokeWidth={1.2} />, r),
  Trophy: ({ size = 26, ...r }: P) => base(size, <><path d="M8 4h8v5.5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5.2c0 3 1.2 4.4 3 4.8M16 6h2.8c0 3-1.2 4.4-3 4.8" /><path d="M12 13.5V17M8.5 20.5h7M9.5 20.5 10 17h4l.5 3.5" /></>, r),
  Clock: ({ size = 24, ...r }: P) => base(size, <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, r),
  Target: ({ size = 24, ...r }: P) => base(size, <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>, r),
  Grid: ({ size = 22, ...r }: P) => base(size, <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></>, r),
  Sigma: ({ size = 22, ...r }: P) => base(size, <path d="M18 5.5H7l5.2 6.5L7 18.5h11" />, r),
  Book: ({ size = 22, ...r }: P) => base(size, <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" /></>, r),
  Camera: ({ size = 24, ...r }: P) => base(size, <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.3-2h5.4L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z" /><circle cx="12" cy="12.5" r="3.6" /></>, r),
  Pencil: ({ size = 20, ...r }: P) => base(size, <><path d="m4 20 1-4.3L16.4 4.3a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.3 19 4 20Z" /><path d="m14.5 6.2 3.3 3.3" /></>, r),
  Trash: ({ size = 20, ...r }: P) => base(size, <><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" /></>, r),
  Chevron: ({ size = 20, ...r }: P) => base(size, <path d="m6 9 6 6 6-6" strokeWidth={2.6} />, r),
  ChevronR: ({ size = 20, ...r }: P) => base(size, <path d="m9 6 6 6-6 6" strokeWidth={2.6} />, r),
  Moon: ({ size = 22, ...r }: P) => base(size, <path d="M20 14.2A8 8 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />, r),
  Sun: ({ size = 22, ...r }: P) => base(size, <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>, r),
  Gift: ({ size = 24, ...r }: P) => base(size, <><rect x="4" y="9" width="16" height="11" rx="2.2" /><path d="M3 9h18v3.2H3zM12 9v11" /><path d="M12 9c-1.5-4.5-5.5-4-5.5-1.7C6.5 9 12 9 12 9Zm0 0c1.5-4.5 5.5-4 5.5-1.7C17.5 9 12 9 12 9Z" /></>, r),
  Note: ({ size = 24, ...r }: P) => base(size, <><path d="M6 3.5h12A1.5 1.5 0 0 1 19.5 5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" /></>, r),
  Mail: ({ size = 24, ...r }: P) => base(size, <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="m4.5 8 7.5 5.5L19.5 8" /></>, r),
  Download: ({ size = 22, ...r }: P) => base(size, <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14" />, r),
  Heart: ({ size = 22, ...r }: P) => base(size, <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />, r),
  Moon2: ({ size = 22, ...r }: P) => base(size, <path d="M20 14.2A8 8 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2Z" />, r),
  Sparkle: ({ size = 22, ...r }: P) => base(size, <path d="M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14 3.5 12l6.6-2L12 3.5Z" fill="currentColor" strokeWidth={1.4} />, r),
  Rocket: ({ size = 22, ...r }: P) => base(size, <><path d="M14.5 4.5c2.8-.6 4.7-.3 5 .1.4.3.7 2.2.1 5L13 16l-5-5 6.5-6.5Z" /><path d="M8 11 5 11.5 3.5 14l3 .5M13 16l-.5 3 2.5-1.5.5-3" /><circle cx="15.2" cy="8.8" r="1.2" fill="currentColor" /></>, r)
};

export const SECTION_ICON = { VARC: I.Book, DILR: I.Grid, QA: I.Sigma, ALL: I.Target } as const;
