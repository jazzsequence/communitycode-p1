import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "Foundations/Base components",
  parameters: {
    docs: {
      description: {
        component:
          "The `cc-*` building blocks every podcast block is made from. Buttons and fields use `--cc-border-strong` so their boundary clears 3:1 (WCAG 1.4.11); cards and dividers use the quieter `--cc-border`. Touch targets are at least 44px and focus is a 3px apricot ring.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div
      className="cc-container cc-section"
      style={{ display: "flex", flexWrap: "wrap", gap: "var(--cc-space-3)" }}
    >
      <a className="cc-btn cc-btn--primary" href="#primary">
        Listen now
      </a>
      <a className="cc-btn" href="#secondary">
        All episodes
      </a>
      <button className="cc-btn" disabled>
        Disabled
      </button>
      <button className="cc-btn cc-btn--primary" aria-disabled="true">
        Sending…
      </button>
    </div>
  ),
};

export const Fields: Story = {
  render: () => (
    <form
      className="cc-container cc-container--narrow cc-section cc-form"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="cc-form__field">
        <label className="cc-form__label" htmlFor="f-name">
          Name
        </label>
        <input id="f-name" className="cc-field" placeholder="Ada Moreno" />
      </div>
      <div className="cc-form__field">
        <label className="cc-form__label" htmlFor="f-email">
          Email
        </label>
        <input
          id="f-email"
          className="cc-field"
          type="email"
          aria-invalid="true"
          defaultValue="not-an-email"
          aria-describedby="f-email-err"
        />
        <p id="f-email-err" className="cc-form__error">
          Enter a valid email address.
        </p>
      </div>
      <div className="cc-form__field">
        <label className="cc-form__label" htmlFor="f-msg">
          Message
        </label>
        <textarea id="f-msg" className="cc-field cc-field--textarea" />
      </div>
      <button className="cc-btn cc-btn--primary" type="submit">
        Send
      </button>
    </form>
  ),
};

export const CardsAndPills: Story = {
  render: () => (
    <div className="cc-container cc-section cc-grid">
      {[1, 2, 3].map((n) => (
        <article
          key={n}
          className="cc-card"
          style={{
            padding: "var(--cc-space-5)",
            display: "grid",
            gap: "var(--cc-space-2)",
          }}
        >
          <p className="cc-eyebrow" style={{ margin: 0 }}>
            Season 2 · Episode {30 + n}
          </p>
          <h3 style={{ fontSize: "var(--cc-text-lg)" }}>
            Card title that may wrap onto two lines
          </h3>
          <p className="cc-muted" style={{ margin: 0 }}>
            Secondary text sits at APCA Lc 59+ on every surface.
          </p>
          <span className="cc-pill" style={{ justifySelf: "start" }}>
            57 min
          </span>
        </article>
      ))}
    </div>
  ),
};

export const FocusRing: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Tab to each control. One focus treatment everywhere; nothing removes an outline without replacing it.",
      },
    },
  },
  render: () => (
    <div
      className="cc-container cc-section"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--cc-space-4)",
        alignItems: "center",
      }}
    >
      <a href="#a">A link</a>
      <button className="cc-btn">A button</button>
      <input
        className="cc-field"
        style={{ width: "16rem" }}
        placeholder="A field"
        aria-label="A field"
      />
    </div>
  ),
};
