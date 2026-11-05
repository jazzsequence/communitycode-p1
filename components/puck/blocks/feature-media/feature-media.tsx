import { useId } from "react";
import { FallbackImg } from '@/lib/img';
import { Btn } from "@/lib/btn";
import { Icon } from "@/lib/icons";
import "./feature-media.css";


export interface FeatureMediaBullet {
  text: string;
}
export interface FeatureMediaTab {
  label: string;
  text: string;
}
export interface FeatureMediaProps {
  eyebrow: string;
  title: string;
  body: string;
  bullets: FeatureMediaBullet[];
  buttonLabel: string;
  buttonHref?: string;
  buttonTarget?: "_self" | "_blank";
  imageSrc: string;
  mediaSide: "right" | "left";
  tone: "white" | "light" | "dark";
  layout?: "image right" | "image left" | "tabs" | "centered + below";
  tabs?: FeatureMediaTab[];
  padding?: "compact" | "regular" | "spacious";
}

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function FeatureMediaRender({
  eyebrow,
  title,
  body,
  bullets,
  buttonLabel,
  buttonHref,
  buttonTarget,
  imageSrc,
  mediaSide,
  tone,
  layout,
  tabs,
  padding = "regular",
}: FeatureMediaProps) {
  const id = useId();
  const list = bullets || [];
  const tabList = tabs || [];
  const isTabs = layout === "tabs";
  const side = layout === "image left" ? "left" : layout === "image right" ? "right" : mediaSide;
  const media = (
    <div className="p1-feature-media__media">
      <div className="p1-feature-media__img-frame">
        {imageSrc && <FallbackImg src={imageSrc} alt="" className="p1-feature-media__img" />}
      </div>
    </div>
  );
  const head = (
    <>
      {eyebrow && <div className="p1-feature-media__eyebrow">{eyebrow}</div>}
      <h2 className="p1-feature-media__title">{title}</h2>
      <p className="p1-feature-media__body">{body}</p>
    </>
  );
  const cta = buttonLabel && (
    <Btn variant={tone === "dark" ? "yellow" : "primary"} href={buttonHref} target={buttonTarget}>
      {buttonLabel}
    </Btn>
  );
  return (
    <div
      className="p1-feature-media p1-block"
      data-tone={tone}
      data-mediaside={side}
      data-layout={slug(layout ?? "image right")}
      data-padding={padding}
    >
      {isTabs ? (
        <div className="p1-feature-media__inner">
          <div className="p1-feature-media__copy">
            {head}
            {cta}
          </div>
          <div className="p1-feature-media__tabs">
            {tabList.map((t, i) => (
              <div key={i} className="p1-feature-media__tab">
                <input
                  type="radio"
                  name={`${id}-tabs`}
                  id={`${id}-tab-${i}`}
                  className="p1-visually-hidden p1-feature-media__tab-input"
                  defaultChecked={i === 0}
                />
                <label htmlFor={`${id}-tab-${i}`} className="p1-feature-media__tab-label">
                  {t.label}
                </label>
                <p className="p1-feature-media__tab-panel">{t.text}</p>
              </div>
            ))}
            <span className="p1-feature-media__tabs-break" />
            {media}
          </div>
        </div>
      ) : (
      <div className="p1-feature-media__inner">
        {media}
        <div className="p1-feature-media__copy">
          {head}
          {list.length > 0 && (
            <ul className="p1-feature-media__bullets">
              {list.map((b, i) => (
                <li key={i} className="p1-feature-media__bullet">
                  <span className="p1-feature-media__check" aria-hidden="true">
                    <Icon name="check" strokeWidth={2.4} className="p1-feature-media__check-icon" />
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          )}
          {cta}
        </div>
      </div>
      )}
    </div>
  );
}
