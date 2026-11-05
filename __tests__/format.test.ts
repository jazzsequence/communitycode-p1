import { describe, expect, it } from "vitest";
import { formatDate, formatDuration, formatEpisodeLabel } from "@/lib/format";

describe("format", () => {
  it("formats durations", () => {
    expect(formatDuration(2608)).toBe("43:28");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(62)).toBe("1:02");
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(-5)).toBe("");
  });
  it("formats dates in UTC so server and client agree", () => {
    expect(formatDate("2026-10-14T23:59:00Z")).toBe("October 14, 2026");
    expect(formatDate("garbage")).toBe("");
  });
  it("builds episode labels", () => {
    expect(formatEpisodeLabel(2, 36)).toBe("S2 E36");
    expect(formatEpisodeLabel(null, 36)).toBe("E36");
    expect(formatEpisodeLabel(null, null)).toBe("");
  });
});
