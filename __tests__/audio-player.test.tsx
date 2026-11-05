// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AudioPlayer } from "@/components/podcast/audio-player";
import { seekPlayer } from "@/components/podcast/player-context";
import { installMediaMock, pauseSpy, playSpy } from "./helpers/media";

beforeAll(() => installMediaMock(2608));
beforeEach(() => {
  playSpy.mockClear();
  pauseSpy.mockClear();
});
afterEach(cleanup);

const audioOf = (c: HTMLElement) => c.querySelector("audio") as HTMLAudioElement;
const slider = () => screen.getByRole("slider", { name: "Seek" }) as HTMLInputElement;

function setup(props: Partial<Parameters<typeof AudioPlayer>[0]> = {}) {
  return render(<AudioPlayer src="https://example.test/a.mp3" title="Ep 1" durationHint={2608} {...props} />);
}

describe("AudioPlayer", () => {
  it("uses preload=metadata, has no native controls, and a named group", () => {
    const { container } = setup();
    const a = audioOf(container);
    expect(a.getAttribute("preload")).toBe("metadata");
    expect(a.hasAttribute("controls")).toBe(false);
    expect(screen.getByRole("group", { name: "Audio player: Ep 1" })).toBeTruthy();
  });

  it("toggles play and pause", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("is operable from the keyboard", async () => {
    setup();
    await userEvent.tab(); // back 15
    await userEvent.tab(); // play
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Play" }));
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });

  it("exposes aria-valuetext as 'current of total' and updates on seek", () => {
    const { container } = setup();
    expect(slider().getAttribute("aria-valuetext")).toBe("0:00 of 43:28");
    fireEvent.change(slider(), { target: { value: "62" } });
    expect(audioOf(container).currentTime).toBe(62);
    expect(slider().getAttribute("aria-valuetext")).toBe("1:02 of 43:28");
    expect(slider().getAttribute("max")).toBe("2608");
  });

  it("disables the slider until a duration is known", () => {
    const { container } = setup({ durationHint: null });
    // The mock reports a duration once metadata loads.
    expect(slider().disabled).toBe(true);
    fireEvent.loadedMetadata(audioOf(container));
    expect(slider().disabled).toBe(false);
  });

  it("skips back 15s (clamped at 0) and forward 30s", async () => {
    const { container } = setup();
    const a = audioOf(container);
    await userEvent.click(screen.getByRole("button", { name: "Forward 30 seconds" }));
    expect(a.currentTime).toBe(30);
    await userEvent.click(screen.getByRole("button", { name: "Back 15 seconds" }));
    expect(a.currentTime).toBe(15);
    await userEvent.click(screen.getByRole("button", { name: "Back 15 seconds" }));
    expect(a.currentTime).toBe(0);
  });

  it("clamps skip-forward at the end", async () => {
    const { container } = setup();
    const a = audioOf(container);
    a.currentTime = 2600;
    fireEvent.timeUpdate(a);
    await userEvent.click(screen.getByRole("button", { name: "Forward 30 seconds" }));
    expect(a.currentTime).toBe(2608);
  });

  it("changes playback speed", async () => {
    const { container } = setup();
    const select = screen.getByLabelText("Speed") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["0.75", "1", "1.25", "1.5", "2"]);
    await userEvent.selectOptions(select, "1.5");
    expect(audioOf(container).playbackRate).toBe(1.5);
  });

  it("shows the current time without announcing every timeupdate", () => {
    const { container } = setup();
    const a = audioOf(container);
    const live = screen.getByRole("status");
    for (const t of [1, 2, 3, 4, 5]) {
      a.currentTime = t;
      fireEvent.timeUpdate(a);
    }
    expect(slider().getAttribute("aria-valuetext")).toBe("0:05 of 43:28");
    expect(live.textContent).toBe("");
    // The visible readout is hidden from AT; the slider is the accessible time.
    expect(screen.getByText("0:05 / 43:28").getAttribute("aria-hidden")).toBe("true");
  });

  it("announces a load failure and offers the file", () => {
    const { container } = setup();
    fireEvent.error(audioOf(container));
    expect(screen.getByRole("status").textContent).toContain("could not be loaded");
    expect(screen.getByRole("link", { name: /Open the file directly/ }).getAttribute("href")).toBe("https://example.test/a.mp3");
  });

  it("links to YouTube only for https URLs", () => {
    const { unmount } = setup({ youtubeUrl: "https://youtu.be/abc" });
    const link = screen.getByRole("link", { name: /Watch on YouTube/ });
    expect(link.getAttribute("href")).toBe("https://youtu.be/abc");
    expect(link.getAttribute("rel")).toContain("noopener");
    unmount();
    setup({ youtubeUrl: "javascript:alert(1)" });
    expect(screen.queryByRole("link", { name: /Watch on YouTube/ })).toBeNull();
  });

  it("can be driven by the transcript through the channel (seek + play)", () => {
    const { container } = setup({ channelKey: "audio-test-1" });
    act(() => seekPlayer("audio-test-1", 125));
    expect(audioOf(container).currentTime).toBe(125);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(slider().getAttribute("aria-valuetext")).toBe("2:05 of 43:28");
  });

  it("works standalone: seekPlayer for another key does nothing", () => {
    const { container } = setup({ channelKey: "audio-test-2" });
    act(() => seekPlayer("somebody-else", 99));
    expect(audioOf(container).currentTime).toBe(0);
  });
});
