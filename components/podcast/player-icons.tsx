import type { SVGProps } from "react";

export type PlayerIconName = "play" | "pause" | "back" | "forward" | "download" | "share" | "volume" | "muted";

/**
 * The native player's icons, inline so there is no icon font or asset to load.
 * All decorative (`aria-hidden`): every button that uses one carries an aria-label.
 * `currentColor`, so they follow the button's text colour.
 */
export function PlayerIcon({ name, seconds, ...rest }: { name: PlayerIconName; seconds?: number } & SVGProps<SVGSVGElement>) {
  const common = {
    viewBox: "0 0 24 24",
    width: "1em",
    height: "1em",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
  switch (name) {
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="6.5" y="5" width="4" height="14" rx="1" />
          <rect x="13.5" y="5" width="4" height="14" rx="1" />
        </svg>
      );
    case "back":
    case "forward": {
      const flip = name === "forward";
      return (
        <svg {...common}>
          <g transform={flip ? "translate(24 0) scale(-1 1)" : undefined}>
            <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
            <path d="M4.5 3.5v4h4" />
          </g>
          <text x="12" y="15.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">
            {seconds}
          </text>
        </svg>
      );
    }
    case "download":
      return (
        <svg {...common}>
          <path d="M12 4v11" />
          <path d="m7 11 5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
        </svg>
      );
    case "volume":
      return (
        <svg {...common}>
          <path d="M4 9.5v5h3.5l4.5 3.5V6L7.5 9.5H4Z" />
          <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
        </svg>
      );
    case "muted":
      return (
        <svg {...common}>
          <path d="M4 9.5v5h3.5l4.5 3.5V6L7.5 9.5H4Z" />
          <path d="m16 9.5 5 5M21 9.5l-5 5" />
        </svg>
      );
  }
}
