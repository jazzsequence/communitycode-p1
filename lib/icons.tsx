import * as React from "react";

/**
 * Minimal stroke-based icon set used by the new block pack.
 * Icons are monochromatic and inherit `currentColor` (PDS convention).
 * This is a shared utility — it is NOT a Puck block and is not exported
 * from `index.ts`.
 */
export type IconName =
  | "check"
  | "plus"
  | "x"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "search"
  | "menu"
  | "arrow-right"
  | "globe"
  | "mail"
  | "external"
  | "chat"
  | "info"
  | "lightbulb"
  | "warning"
  | "lines"
  | "user"
  | "map-pin"
  | "rocket"
  | "shield"
  | "shield-check"
  | "branch"
  | "sparkle"
  | "layers"
  | "clock"
  | "data"
  | "page"
  | "calendar"
  | "chevron-up"
  | "arrow-up"
  | "copy"
  | "link"
  | "edit"
  | "send"
  | "tag"
  | "help"
  | "check-circle"
  | "bell"
  | "megaphone"
  | "monitor";

const PATHS: Record<IconName, React.ReactNode> = {
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />,
  x: <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />,
  "chevron-down": <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />,
  "chevron-left": <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />,
  "chevron-right": <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </>
  ),
  menu: <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />,
  "arrow-right": <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
    </>
  ),
  external: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 5l-8 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v6H5V5h6" />
    </>
  ),
  chat: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z"
    />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5" />
      <path strokeLinecap="round" d="M12 8h.01" />
    </>
  ),
  lightbulb: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 21h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 00-3.6 10.8c.6.5.9 1.2.9 2.2h5.4c0-1 .3-1.7.9-2.2A6 6 0 0012 3z" />
    </>
  ),
  warning: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l9 16H3l9-16z" />
      <path strokeLinecap="round" d="M12 10v4" />
      <path strokeLinecap="round" d="M12 17h.01" />
    </>
  ),
  lines: <path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h9" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M5 21a7 7 0 0114 0" />
    </>
  ),
  "map-pin": (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  "rocket": <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />,
  "shield": <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />,
  "shield-check": <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM9 12l2 2 4-4" />,
  "branch": <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 6c0 5-6 4-6 9" />,
  "sparkle": <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />,
  "layers": <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />,
  "clock": <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3" />,
  "data": <path strokeLinecap="round" strokeLinejoin="round" d="M12 5c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 8v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8" />,
  "page": <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h8l4 4v16H6zM14 2v4h4" />,
  "calendar": <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4" />,
  "chevron-up": <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6" />,
  "arrow-up": <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />,
  "copy": <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h11v11H9zM5 15H4V4h11v1" />,
  "link": <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />,
  "edit": <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  "send": <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  "tag": <path strokeLinecap="round" strokeLinejoin="round" d="M20 12l-8 8-9-9V4h7zM7.5 7.5h.01" />,
  "help": <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.1.9-1.1 1.6M12 17h.01" />,
  "check-circle": <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.4 12l2.5 2.5L16 9.5" />,
  "bell": <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  "megaphone": <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v4h4l7 4V6L7 10zM16 9a3 3 0 0 1 0 6M19 7a6 6 0 0 1 0 10" />,
  "monitor": <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18v12H3zM8 20h8M12 16v4" />,
};

export interface IconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
