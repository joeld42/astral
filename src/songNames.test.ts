import { describe, it, expect } from "vitest";
import { generateSongName } from "./songNames";
import { generateSong, rng, isSong } from "./music";

describe("song titles", () => {
  it("reproduces titles from seeds and integrates with song generation", () => {
    for (let seed = 0; seed < 50; seed++) {
      const title = generateSongName(rng(seed ^ 0x6a09e667));
      expect(generateSong(seed).name).toBe(title);
      expect(generateSongName(rng(seed ^ 0x6a09e667))).toBe(title);
      expect(isSong(generateSong(seed))).toBe(true);
    }
  });
  it("provides diverse, readable names within the title limit", () => {
    const titles = Array.from({ length: 5000 }, (_, seed) =>
      generateSongName(rng(seed)),
    );
    expect(new Set(titles).size).toBeGreaterThan(4500);
    for (const title of titles) {
      expect(title.length).toBeLessThanOrEqual(120);
      expect(title).not.toMatch(/undefined|null|\s{2,}/);
      expect(title).toBe(title.trim());
      expect(title[0]).toBe(title[0].toUpperCase());
    }
  });
});
