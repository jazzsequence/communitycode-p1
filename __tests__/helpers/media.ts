import { vi } from "vitest";

/**
 * jsdom does not implement HTMLMediaElement playback. This gives each <audio> a
 * small fake: play/pause flip `paused` and fire the events a browser would, and
 * currentTime / playbackRate are plain settable values.
 */
interface Fake {
  paused: boolean;
  currentTime: number;
  playbackRate: number;
}
const state = new WeakMap<HTMLMediaElement, Fake>();
const fake = (el: HTMLMediaElement): Fake => {
  let s = state.get(el);
  if (!s) state.set(el, (s = { paused: true, currentTime: 0, playbackRate: 1 }));
  return s;
};

export const playSpy = vi.fn();
export const pauseSpy = vi.fn();

export function installMediaMock(duration = 2608) {
  const proto = HTMLMediaElement.prototype;
  Object.defineProperty(proto, "paused", { configurable: true, get() { return fake(this).paused; } });
  Object.defineProperty(proto, "duration", { configurable: true, get() { return duration; } });
  Object.defineProperty(proto, "currentTime", {
    configurable: true,
    get() { return fake(this).currentTime; },
    set(v: number) { fake(this).currentTime = v; },
  });
  Object.defineProperty(proto, "playbackRate", {
    configurable: true,
    get() { return fake(this).playbackRate; },
    set(v: number) { fake(this).playbackRate = v; },
  });
  proto.play = function play(this: HTMLMediaElement) {
    playSpy();
    fake(this).paused = false;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  };
  proto.pause = function pause(this: HTMLMediaElement) {
    pauseSpy();
    fake(this).paused = true;
    this.dispatchEvent(new Event("pause"));
  };
}
