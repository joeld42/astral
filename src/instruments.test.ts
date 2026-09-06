import { describe, it, expect } from "vitest";
import { padPresets, bassPresets, arpPresets, varyPreset } from "./instruments";
import { generateSong, isSong } from "./music";
describe("instrument variation", () => {
  it("is repeatable, subtle, and does not mutate shared presets", () => {
    for (const preset of [
      ...Object.values(padPresets),
      ...Object.values(bassPresets),
      ...Object.values(arpPresets),
    ]) {
      const original = structuredClone(preset.options);
      const a = varyPreset(preset.options, 971);
      expect(a).toEqual(varyPreset(preset.options, 971));
      expect(a).not.toEqual(varyPreset(preset.options, 972));
      expect(preset.options).toEqual(original);
      expect(Math.abs(a.detune ?? 0)).toBeLessThanOrEqual(4);
    }
  });
  it("persists variation and rejects invalid seeds", () => {
    const song = generateSong(3);
    expect(isSong(JSON.parse(JSON.stringify(song)))).toBe(true);
    expect(
      isSong({ ...song, instruments: { ...song.instruments!, variation: -1 } }),
    ).toBe(false);
    expect(varyPreset(padPresets.haze.options, 0).detune).toBe(0);
  });
});
