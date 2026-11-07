/**
 * WCAG 2.x contrast ratio and APCA lightness contrast (W3 0.0.98G-4g constants).
 * Storybook-only: used by the Colors page so the contrast table is computed from
 * the live tokens and cannot drift from app/podcast.css.
 *
 * Why both: WCAG 2.x is the compliance baseline, but it over-rates light-on-dark
 * pairs and ignores halation. APCA's Lc is perceptual and polarity-aware, and its
 * dark-mode work is where the "do not exceed ~Lc 90" guidance for bright text on a
 * dark ground comes from.
 */

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function wcagLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function wcagRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const a = wcagLuminance(fg);
  const b = wcagLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function apcaY([r, g, b]: [number, number, number]): number {
  const f = (c: number) => Math.pow(c / 255, 2.4);
  return 0.2126729 * f(r) + 0.7151522 * f(g) + 0.072175 * f(b);
}

/** Signed Lc: negative = light text on a dark ground. */
export function apcaLc(fg: [number, number, number], bg: [number, number, number]): number {
  const soft = (y: number) => (y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414));
  const yt = soft(apcaY(fg));
  const yb = soft(apcaY(bg));
  let out: number;
  if (yb > yt) {
    out = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14;
    out = out < 0.1 ? 0 : out - 0.027;
  } else {
    out = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14;
    out = out > -0.1 ? 0 : out + 0.027;
  }
  return out * 100;
}
