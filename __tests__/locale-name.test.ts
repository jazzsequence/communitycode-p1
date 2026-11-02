import { describe, expect, it } from "vitest";
import { localeName } from "../lib/locale-name";

describe("localeName", () => {
  it("names a locale in its own language", () => {
    expect(localeName("fr")).toBe("Français");
    expect(localeName("de")).toBe("Deutsch");
  });

  it("names a regional locale in its own language", () => {
    expect(localeName("es-MX")).toBe("Español de México");
  });

  it("throws for a value that is not a language tag", () => {
    expect(() => localeName("not a locale")).toThrow(RangeError);
  });
});
