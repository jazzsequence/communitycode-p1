// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BookingEmbed, bookingEmbedBlock, frameUrl } from "@/components/puck/podcast/booking-embed";

afterEach(cleanup);

describe("frameUrl", () => {
  it("accepts only https", () => {
    expect(frameUrl("https://book.show.fm/a/b")).toBe("https://book.show.fm/a/b");
    for (const bad of ["http://book.show.fm/a", "javascript:alert(1)", "/relative", "//evil.example", "mailto:a@b.c", "", undefined, 5]) {
      expect(frameUrl(bad)).toBeNull();
    }
  });
});

describe("BookingEmbed", () => {
  it("frames the booking page with a title and a fallback link", () => {
    const { container } = render(<BookingEmbed heading="Be a guest" url="https://book.show.fm/a/b" />);
    const frame = container.querySelector("iframe")!;
    expect(frame.getAttribute("src")).toBe("https://book.show.fm/a/b");
    expect(frame.getAttribute("title")).toBe("Be a guest");
    expect(frame.getAttribute("loading")).toBe("lazy");
    // Site-coloured card around the vendor's page, and the dark theme asked for.
    expect(frame.parentElement?.classList.contains("cc-booking-clip")).toBe(true);
    expect(frame.parentElement?.parentElement?.classList.contains("cc-card")).toBe(true);
    expect(frame.style.colorScheme).toBe("dark");
    const link = screen.getByRole("link", { name: /booking page/i });
    expect(link.getAttribute("href")).toBe("https://book.show.fm/a/b");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders no frame for an unsafe or missing url and says so", () => {
    const { container } = render(<BookingEmbed url="javascript:alert(1)" />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("note").textContent).toMatch(/isn.t available/i);
  });

  it("clamps the height", () => {
    const small = render(<BookingEmbed url="https://a.example/x" height={10} />);
    expect(small.container.querySelector("iframe")!.style.blockSize).toBe("400px");
    small.unmount();
    const big = render(<BookingEmbed url="https://a.example/x" height={99999} />);
    expect(big.container.querySelector("iframe")!.style.blockSize).toBe("1600px");
  });

  it("defaults to the booking link in site.config.ts", () => {
    expect(bookingEmbedBlock.defaultProps.url).toMatch(/^https:\/\/book\.show\.fm\//);
  });
});
