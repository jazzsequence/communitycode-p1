import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { apcaLc, parseHex, wcagRatio } from "../_helpers/contrast";

const meta = {
  title: "Foundations/Colors",
  parameters: {
    docs: {
      description: {
        component:
          "Warm graphite + apricot. Built for astigmatism comfort: no pure black ground, no pure white text, near-neutral surfaces, accents desaturated ~15%, and body text held at about WCAG 13:1 / APCA Lc -86 so it is readable without blooming (halation). Do not brighten `--cc-text` to chase a higher number: past ~Lc 90, bright text on dark glares. Swatches and the contrast table are read live from the computed tokens.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const TOKENS: { name: string; use: string }[] = [
  { name: "--cc-bg", use: "Page ground" },
  { name: "--cc-surface", use: "Cards, fields, header" },
  { name: "--cc-surface-2", use: "Raised: buttons, pills, avatars" },
  { name: "--cc-border", use: "Decorative dividers only" },
  { name: "--cc-border-strong", use: "Control boundaries (>= 3:1)" },
  { name: "--cc-text", use: "Body and headings" },
  { name: "--cc-muted", use: "Secondary text" },
  { name: "--cc-accent", use: "Primary action, eyebrow, current page" },
  { name: "--cc-accent-hover", use: "Primary action, hover" },
  { name: "--cc-accent-ink", use: "Text on accent" },
  { name: "--cc-link", use: "Links" },
  { name: "--cc-danger", use: "Errors" },
  { name: "--cc-focus", use: "Focus ring" },
];

/** [foreground, ground, minimum APCA |Lc|, role]. Minimums: 75 body, 60 small secondary, 45 large/UI. */
const PAIRS: [string, string, number, string][] = [
  ["--cc-text", "--cc-bg", 75, "Body on page"],
  ["--cc-text", "--cc-surface", 75, "Body on card"],
  ["--cc-text", "--cc-surface-2", 75, "Body on raised"],
  ["--cc-muted", "--cc-bg", 60, "Secondary on page"],
  ["--cc-muted", "--cc-surface-2", 60, "Secondary on raised"],
  ["--cc-accent", "--cc-bg", 60, "Accent text on page"],
  ["--cc-accent", "--cc-surface", 60, "Accent text on card"],
  ["--cc-link", "--cc-bg", 60, "Link on page"],
  ["--cc-link", "--cc-surface-2", 60, "Link on raised"],
  ["--cc-danger", "--cc-surface", 60, "Error on card"],
  ["--cc-danger", "--cc-surface-2", 60, "Error on raised"],
  ["--cc-danger", "--cc-bg", 60, "Error on page"],
  ["--cc-accent-ink", "--cc-accent", 60, "Button label"],
  ["--cc-accent-ink", "--cc-accent-hover", 60, "Button label, hover"],
  ["--cc-border-strong", "--cc-surface", 25, "Control border on card"],
  ["--cc-border-strong", "--cc-surface-2", 25, "Control border on raised"],
];

function useTokens(): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const root = document.querySelector(".cc-root");
    if (!root) return;
    const cs = getComputedStyle(root);
    setValues(
      Object.fromEntries(
        TOKENS.map((t) => [t.name, cs.getPropertyValue(t.name).trim()]),
      ),
    );
  }, []);
  return values;
}

function PaletteView() {
  const v = useTokens();
  return (
    <div className="cc-container cc-section">
      <ul
        className="cc-grid"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {TOKENS.map((t) => (
          <li key={t.name} className="cc-card">
            <div
              style={{
                height: "5rem",
                background: `var(${t.name})`,
                borderBottom: "1px solid var(--cc-border)",
              }}
            />
            <div style={{ padding: "var(--cc-space-4)" }}>
              <code style={{ fontFamily: "var(--cc-font-mono)" }}>
                {t.name}
              </code>
              <p
                className="cc-muted"
                style={{
                  margin: "var(--cc-space-1) 0 0",
                  fontSize: "var(--cc-text-sm)",
                }}
              >
                {v[t.name] ?? ""} · {t.use}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContrastTableView() {
  const v = useTokens();
  return (
    <div className="cc-container cc-section" style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <caption
          style={{ textAlign: "left", paddingBottom: "var(--cc-space-3)" }}
          className="cc-muted"
        >
          APCA minimums: 75 body text, 60 small secondary text, 45 large text
          and UI, 25 non-text boundaries.
        </caption>
        <thead>
          <tr>
            {[
              "Pair",
              "Foreground / ground",
              "WCAG",
              "APCA Lc",
              "Needs",
              "Result",
            ].map((h) => (
              <th
                key={h}
                scope="col"
                style={{
                  textAlign: "left",
                  padding: "var(--cc-space-2) var(--cc-space-3)",
                  borderBottom: "1px solid var(--cc-border-strong)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAIRS.map(([fgName, bgName, need, role]) => {
            const fg = parseHex(v[fgName] ?? "");
            const bg = parseHex(v[bgName] ?? "");
            const ratio = fg && bg ? wcagRatio(fg, bg) : null;
            const lc = fg && bg ? Math.abs(apcaLc(fg, bg)) : null;
            const pass = lc !== null && lc >= need;
            return (
              <tr key={fgName + bgName}>
                <td style={cell}>{role}</td>
                <td
                  style={{
                    ...cell,
                    fontFamily: "var(--cc-font-mono)",
                    fontSize: "var(--cc-text-sm)",
                  }}
                >
                  {v[fgName]} / {v[bgName]}
                </td>
                <td style={cell}>{ratio ? `${ratio.toFixed(2)}:1` : "…"}</td>
                <td style={cell}>{lc !== null ? lc.toFixed(1) : "…"}</td>
                <td style={cell}>≥ {need}</td>
                <td
                  style={{
                    ...cell,
                    color: pass ? "var(--cc-text)" : "var(--cc-danger)",
                    fontWeight: 600,
                  }}
                >
                  {lc === null ? "…" : pass ? "Pass" : "Below target"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const Palette: Story = { render: () => <PaletteView /> };
export const ContrastTable: Story = { render: () => <ContrastTableView /> };

const cell = {
  padding: "var(--cc-space-2) var(--cc-space-3)",
  borderBottom: "1px solid var(--cc-border)",
} as const;
