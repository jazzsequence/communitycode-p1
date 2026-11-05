import { Btn } from "@/lib/btn";
import { Icon } from "@/lib/icons";
import "./faq.css";

export interface FaqItem {
  q: string;
  a: string;
  category?: string;
}
export interface FaqProps {
  heading: string;
  items: FaqItem[];
  layout?: "accordion" | "2-col" | "with search";
  categories?: "off" | "on";
  first?: "off" | "on";
  contact?: "off" | "on";
  contactTitle?: string;
  contactText?: string;
  contactLabel?: string;
  contactHref?: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function FaqRender({ heading, items, layout = "accordion", categories = "off", first = "off", contact = "off", contactTitle = "Still have questions?", contactText = "", contactLabel = "Contact us", contactHref }: FaqProps) {
  const list = items || [];
  const cats = [...new Set(list.map((i) => (i.category ?? "").trim()).filter(Boolean))];
  // Every answer shows by default; "first" collapses the rest so only the first is open.
  const isOpen = (i: number) => layout === "2-col" || first !== "on" || i === 0;
  return (
    <div className="p1-faq p1-block" data-layout={slug(layout)} data-collapsing={layout !== "2-col" && first === "on" ? "true" : undefined}>
      <div className="p1-faq__inner">
        {heading && <h2 className="p1-faq__heading">{heading}</h2>}
        {layout === "with search" && (
          <span className="p1-faq__search" aria-hidden="true">
            <Icon name="search" className="p1-faq__search-icon" />
            Search questions
          </span>
        )}
        {categories === "on" && (
          <div className="p1-faq__chips" aria-hidden="true">
            {[...new Set(["All", ...cats])].map((c) => (
              <span key={c} className="p1-faq__chip">{c}</span>
            ))}
          </div>
        )}
        <div className="p1-faq__list">
          {list.map((item, i) => (
            <details key={i} className="p1-faq__item" open={isOpen(i)}>
              <summary className="p1-faq__question-row">
                <h3 className="p1-faq__question">{item.q}</h3>
                <Icon name="plus" className="p1-faq__icon" />
              </summary>
              <p className="p1-faq__answer">{item.a}</p>
            </details>
          ))}
        </div>
        {contact === "on" && (
          <div className="p1-faq__contact">
            <div>
              {contactTitle && <h3 className="p1-faq__contact-title">{contactTitle}</h3>}
              {contactText && <p className="p1-faq__contact-text">{contactText}</p>}
            </div>
            {contactLabel && contactHref && <Btn href={contactHref}>{contactLabel}</Btn>}
          </div>
        )}
      </div>
    </div>
  );
}
