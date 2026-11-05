import { FallbackImg } from "@/lib/img";
import { Btn, TextLink, type BtnVariant } from "@/lib/btn";
import "./cta.css";

export interface CtaBannerProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonHref?: string;
  buttonTarget?: "_self" | "_blank";
  secondaryLabel: string;
  secondaryHref?: string;
  secondaryTarget?: "_self" | "_blank";
  layout: "centered" | "split" | "split image";
  align: "left" | "center";
  tone: "yellow" | "accent" | "dark" | "light" | "gradient" | "outline";
  decoration: "none" | "glow" | "dots";
  corners: "square" | "soft" | "round";
  padding: "compact" | "regular" | "spacious";
  image?: string;
}

const BTN_BY_TONE: Record<CtaBannerProps["tone"], BtnVariant> = {
  yellow: "dark",
  accent: "yellow",
  dark: "yellow",
  light: "primary",
  gradient: "yellow",
  outline: "primary",
};

export function CtaBannerRender({
  eyebrow,
  title,
  subtitle,
  buttonLabel,
  buttonHref,
  buttonTarget,
  secondaryLabel,
  secondaryHref,
  secondaryTarget,
  layout = "centered",
  align,
  tone,
  decoration,
  corners,
  padding,
  image,
}: CtaBannerProps) {
  const split = layout === "split";
  const withImage = layout === "split image";
  const center = !split && !withImage && align === "center";

  const textBlock = (
    <div className="p1-cta__text" data-center={center ? "true" : undefined} data-split={split ? "true" : undefined}>
      {eyebrow && <div className="p1-cta__eyebrow">{eyebrow}</div>}
      <h2 className="p1-cta__title">{title}</h2>
      {subtitle && <p className="p1-cta__subtitle">{subtitle}</p>}
      {!split && (
        <div className="p1-cta__actions" data-center={center ? "true" : undefined}>
          {buttonLabel && <Btn variant={BTN_BY_TONE[tone]} href={buttonHref} target={buttonTarget}>
              {buttonLabel}
            </Btn>}
          {secondaryLabel && <TextLink className="p1-cta__secondary" href={secondaryHref} target={secondaryTarget}>
              {secondaryLabel}
            </TextLink>}
        </div>
      )}
    </div>
  );

  const actionsBlock = split ? (
    <div className="p1-cta__actions" data-split="true">
      {buttonLabel && <Btn variant={BTN_BY_TONE[tone]} href={buttonHref} target={buttonTarget}>
              {buttonLabel}
            </Btn>}
      {secondaryLabel && <TextLink className="p1-cta__secondary" href={secondaryHref} target={secondaryTarget}>
              {secondaryLabel}
            </TextLink>}
    </div>
  ) : null;

  return (
    <div className="p1-cta-banner p1-block">
      <div
        className="p1-cta__card"
        data-tone={tone}
        data-corners={corners}
        data-padding={padding}
        data-decoration={decoration}
      >
        {decoration !== "none" && <div className="p1-cta__decoration" aria-hidden="true" />}
        <div className="p1-cta__inner" data-layout={layout.replace(/[^a-z0-9]+/g, "-")}>
          {textBlock}
          {actionsBlock}
          {withImage && (
            <FallbackImg src={image} alt="" className="p1-cta__image" />
          )}
        </div>
      </div>
    </div>
  );
}
