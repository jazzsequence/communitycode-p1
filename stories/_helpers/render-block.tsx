import type { ComponentConfig } from "@puckeditor/core";
import type { ReactNode } from "react";

/**
 * Render a Puck block config the way a published page does: its `defaultProps`,
 * overridden by `props`, through `config.render`. Blocks are Puck component configs
 * (`{ fields, defaultProps, render }`), not plain React components.
 *
 * `slot(children)` builds a value for a `type: "slot"` field (Columns, Container):
 * Puck hands a slot to `render` as a component, so a story passes one too.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderBlock(config: ComponentConfig<any>, props: Record<string, unknown> = {}): ReactNode {
  const Render = config.render as unknown as React.ComponentType<Record<string, unknown>>;
  return (
    <Render
      id="story"
      {...(config.defaultProps ?? {})}
      {...props}
      puck={{ isEditing: false, metadata: {}, dragRef: null, renderDropZone: () => null }}
    />
  );
}

export const slot = (children: ReactNode) => function Slot() {
  return <>{children}</>;
};
