import { P1_FALLBACKS } from '@/lib/assets';
import { FallbackImg } from '@/lib/img';
import { Btn, TextLink } from "@/lib/btn";
import { Icon } from "@/lib/icons";
import { formAttrs, safeUrl } from "@/lib/safe-url";
import "./hero.css";

export interface HeroProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryHref?: string;
  primaryTarget?: "_self" | "_blank";
  secondaryHref?: string;
  secondaryTarget?: "_self" | "_blank";
  tone: "accent" | "dark" | "light";
  layout: "split" | "full image" | "text only" | "with form" | "video background";
  imageSrc: string;
  imageSide: "right" | "left";
  imageFill: "card" | "flush";
  splitRatio: "even" | "copy-wide" | "image-wide";
  align: "left" | "center" | "right";
  overlay: "none" | "scrim" | "gradient down" | "gradient right";
  overlayStrength: "light" | "medium" | "heavy";
  knockout: "off" | "on";
  frame: "none" | "rounded" | "browser";
  badges: "off" | "on";
  badgeItems: { text: string }[];
  height: "compact" | "regular" | "tall";
  actionHref?: string;
  puck?: { isEditing?: boolean };
}


const ALPHA: Record<HeroProps["overlayStrength"], number> = { light: 0.32, medium: 0.56, heavy: 0.8 };

function overlayGradient(overlay: HeroProps["overlay"], strength: HeroProps["overlayStrength"]): string | undefined {
  const a = ALPHA[strength];
  if (overlay === "scrim") return `rgba(10,6,30,${a})`;
  if (overlay === "gradient down") return `linear-gradient(180deg, rgba(10,6,30,0) 30%, rgba(10,6,30,${a}) 100%)`;
  if (overlay === "gradient right") return `linear-gradient(90deg, rgba(10,6,30,${a + 0.12}) 0%, rgba(10,6,30,${a * 0.5}) 45%, rgba(10,6,30,0) 80%)`;
  return undefined;
}

const SPLIT_COLS: Record<HeroProps["imageSide"], Record<HeroProps["splitRatio"], string>> = {
  right: { even: "1fr 1fr", "copy-wide": "7fr 5fr", "image-wide": "5fr 7fr" },
  left: { even: "1fr 1fr", "copy-wide": "5fr 7fr", "image-wide": "7fr 5fr" },
};

export function HeroRender({
  eyebrow,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  primaryHref,
  primaryTarget,
  secondaryHref,
  secondaryTarget,
  tone,
  layout,
  imageSrc,
  imageSide,
  imageFill,
  splitRatio,
  align,
  overlay,
  overlayStrength,
  knockout,
  frame = "rounded",
  badges = "off",
  badgeItems = [],
  height = "regular",
  actionHref,
  puck,
}: HeroProps) {
  const img = imageSrc || P1_FALLBACKS.LANDSCAPE;
  // Puck sends null for an emptied list, which the destructuring default does not catch.
  const badgeList = badgeItems ?? [];
  const overImage = layout === "full image" || layout === "video background";
  const onDark = overImage || tone !== "light";
  const form = layout === "with form";
  // The form button submits when an action is set or no link is saved, otherwise it keeps its saved link.
  const submits = Boolean(safeUrl(actionHref)) || !primaryHref;

  const koStyle: React.CSSProperties | undefined =
    knockout === "on"
      ? {
          backgroundImage: `url(${img}), url(${P1_FALLBACKS.LANDSCAPE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }
      : undefined;

  const copyBlock = (
    <div className="p1-hero__copy" data-align={align} data-ondark={onDark ? "true" : undefined}>
      {eyebrow && <span className="p1-hero__eyebrow">{eyebrow}</span>}
      <h1 className="p1-hero__title" style={koStyle}>
        {title}
      </h1>
      {description && <p className="p1-hero__desc">{description}</p>}
      {form ? null : <div className="p1-hero__actions" data-align={align}>
        {primaryLabel && (
          <Btn variant="yellow" href={primaryHref} target={primaryTarget}>
            {primaryLabel}
          </Btn>
        )}
        {secondaryLabel && (
          <TextLink className="p1-hero__secondary" href={secondaryHref} target={secondaryTarget}>
            {secondaryLabel}
          </TextLink>
        )}
      </div>}
      {badges === "on" && badgeList.length > 0 && (
        <ul className="p1-hero__badges" data-align={align}>
          {badgeList.map((b, i) => (
            <li key={i} className="p1-hero__badge">
              <Icon name="check" className="p1-hero__badge-icon" strokeWidth={3} />
              {b.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (overImage) {
    const bg = overlayGradient(overlay, overlayStrength);
    return (
      <section className="p1-hero p1-block" data-layout={layout === "full image" ? "full-image" : "video-background"} data-height={height}>
        <FallbackImg src={img} alt="" className="p1-hero__bg-img" loading="eager" fetchPriority="high" />
        {layout === "video background" ? (
          <>
            <div className="p1-hero__overlay p1-hero__overlay--video" />
            <span className="p1-hero__pause" aria-hidden="true"><i /><i /></span>
          </>
        ) : (
          bg && <div className="p1-hero__overlay" style={{ background: bg }} />
        )}
        <div className="p1-hero__fullimg-content" data-align={align}>
          {copyBlock}
        </div>
      </section>
    );
  }

  if (layout === "text only") {
    return (
      <section className="p1-hero p1-block" data-layout="text-only" data-tone={tone} data-height={height}>
        <div className="p1-hero__text-content" data-align={align}>
          {copyBlock}
        </div>
      </section>
    );
  }

  if (form) {
    return (
      <section className="p1-hero p1-block" data-layout="with-form" data-tone={tone} data-height={height}>
        <div className="p1-hero__split-grid p1-hero__form-grid">
          <div className="p1-hero__copy-wrap">{copyBlock}</div>
          {/* Posts to the form action URL when set. A saved primary link keeps working when
              no action is set. To handle submit yourself, add an onSubmit (needs "use client"). */}
          <form className="p1-hero__form" {...formAttrs(submits ? actionHref : "", puck?.isEditing)}>
            <strong className="p1-hero__form-title">Get started</strong>
            <input className="p1-hero__form-field" type="email" name="work-email" required placeholder="Work email" aria-label="Work email" />
            <input className="p1-hero__form-field" type="text" name="company" placeholder="Company" aria-label="Company" />
            {submits ? (
              <Btn submit variant="yellow">{primaryLabel || "Submit"}</Btn>
            ) : (
              <Btn variant="yellow" href={primaryHref} target={primaryTarget}>{primaryLabel || "Submit"}</Btn>
            )}
          </form>
        </div>
      </section>
    );
  }

  // split
  const imgFirst = imageSide === "left";
  const cols = SPLIT_COLS[imageSide]?.[splitRatio] ?? "1fr 1fr";

  const imageEl =
    imageFill === "flush" ? (
      <div className="p1-hero__img-flush">
        <FallbackImg src={img} alt="" className="p1-hero__img" loading="eager" fetchPriority="high" />
      </div>
    ) : (
      <div className="p1-hero__img-card" data-frame={frame}>
        {frame === "browser" && (
          <div className="p1-hero__chrome" aria-hidden="true"><i /><i /><i /></div>
        )}
        <FallbackImg src={img} alt="" className="p1-hero__img" loading="eager" fetchPriority="high" />
      </div>
    );

  const copyWrap = <div className="p1-hero__copy-wrap">{copyBlock}</div>;

  return (
    <section className="p1-hero p1-block" data-layout="split" data-tone={tone} data-imagefill={imageFill} data-height={height}>
      <div
        className="p1-hero__split-grid"
        style={{ "--p1-hero-split-cols": cols } as React.CSSProperties}
      >
        {imgFirst ? (
          <>
            {imageEl}
            {copyWrap}
          </>
        ) : (
          <>
            {copyWrap}
            {imageEl}
          </>
        )}
      </div>
    </section>
  );
}
