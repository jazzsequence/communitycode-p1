// Puck's editor code (pulled in through puck-css field definitions, e.g. richtextField) touches
// ResizeObserver at import time. Neither node nor jsdom has it, and nothing under test measures layout.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
