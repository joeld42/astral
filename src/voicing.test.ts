import { describe, it, expect } from "vitest";
import { leadVoices } from "./voicing";
describe("pad voice leading", () => {
  it("keeps identical chords and common tones in the same register", () => {
    expect(leadVoices([60, 64, 67], [60, 64, 67])).toEqual([60, 64, 67]);
    expect(leadVoices([65, 69, 72], [60, 64, 67])).toEqual([60, 65, 69]);
  });
  it("retains pitch classes without duplicate voices across inversions", () => {
    for (let n = 0; n < 12; n++) {
      const target = [48 + n, 52 + n, 55 + n, 59 + n];
      const result = leadVoices(target, [60, 64, 67, 71]);
      expect(result.map((v) => v % 12).sort()).toEqual(
        target.map((v) => v % 12).sort(),
      );
      expect(new Set(result).size).toBe(result.length);
      expect(result.every((v) => v >= 45 && v <= 88)).toBe(true);
    }
  });
});
