import { describe, it, expect } from "vitest";
import {
  generateSong,
  isSong,
  chordMidi,
  chordName,
  locate,
  modes,
  keys,
  makePattern,
  rng,
} from "./music";
describe("generation and music theory", () => {
  it("reproduces an entire song from its seed", () =>
    expect(generateSong(92)).toEqual(generateSong(92)));
  it("generates varied, valid complete arrangements", () => {
    for (let seed = 0; seed < 100; seed++) {
      const s = generateSong(seed);
      expect(isSong(s)).toBe(true);
      expect(
        s.sections
          .flatMap((x) => x.chords)
          .every((c) => c.quality === "diatonic"),
      ).toBe(true);
      expect(
        new Set(
          Array.from({ length: 10 }, (_, n) => generateSong(n)).flatMap((s) =>
            s.sections.flatMap((x) => x.chords.map((c) => c.voicing)),
          ),
        ),
      ).toEqual(new Set(["root", "skeleton", "full"]));
      expect(s.sections.reduce((n, x) => n + x.bars, 0)).toBeGreaterThanOrEqual(
        30,
      );
      expect(s.sections.every((x) => x.bars % 2 === 1)).toBe(true);
      expect(
        s.sections.flatMap((x) => x.chords).some((c) => c.beats !== 4),
      ).toBe(true);
      expect(s.sections.some((x) => x.tracks.drums)).toBe(true);
    }
    expect(generateSong(2)).not.toEqual(generateSong(3));
  });
  it("builds diatonic extensions and ordered inversions in every key and mode", () => {
    for (const key of keys)
      for (const mode of Object.keys(modes) as (keyof typeof modes)[])
        for (let degree = 0; degree < 7; degree++)
          for (let inversion = 0; inversion < 3; inversion++) {
            const notes = chordMidi(
              { key, mode },
              { degree, extension: "9", inversion },
            );
            expect(notes).toHaveLength(5);
            expect(new Set(notes).size).toBe(5);
            notes.forEach((n) =>
              expect(modes[mode]).toContain((n - keys.indexOf(key)) % 12),
            );
            expect([...notes].sort((a, b) => a - b)).toEqual(notes);
          }
  });
  it("names the tonic and relative major extensions accurately", () => {
    const s = { ...generateSong(1), key: "D", mode: "Aeolian" as const };
    expect(chordName(s, { degree: 0, extension: "9", inversion: 0 })).toBe(
      "Dm9",
    );
    expect(chordName(s, { degree: 2, extension: "7", inversion: 1 })).toBe(
      "Fmaj7",
    );
  });
  it("finds section boundaries without an off-by-one", () => {
    const sections = generateSong(1).sections;
    sections.forEach((s, i) => {
      s.bars = i === 0 || i === 5 ? 4 : 8;
    });
    expect(locate(sections, 3)).toEqual({ index: 0, bar: 3 });
    expect(locate(sections, 4)).toEqual({ index: 1, bar: 0 });
    expect(locate(sections, 39)).toEqual({ index: 5, bar: 3 });
  });
  it("makes reproducible 3 by 16 boolean patterns", () => {
    const p = makePattern(rng(12));
    expect(p).toEqual(makePattern(rng(12)));
    expect(p).toHaveLength(3);
    for (const row of p) {
      expect(row).toHaveLength(16);
      expect(row.every((x) => typeof x === "boolean")).toBe(true);
    }
  });
  it("persists instrument choices and rejects invalid patches", () => {
    const song = generateSong(97);
    expect(isSong(JSON.parse(JSON.stringify(song)))).toBe(true);
    expect(
      isSong({
        ...song,
        instruments: { bass: "unknown", arp: "glass", glide: 0 },
      }),
    ).toBe(false);
    expect(
      isSong({
        ...song,
        instruments: { bass: "trance", arp: "glass", glide: 2 },
      }),
    ).toBe(false);
    const sounds = new Set(
      Array.from({ length: 40 }, (_, n) => generateSong(n).instruments!.bass),
    );
    expect(sounds.size).toBe(5);
  });
  it("rejects corrupt and unsafe imported settings", () => {
    const s = generateSong(1);
    expect(isSong({ ...s, bpm: Infinity })).toBe(false);
    expect(isSong({ ...s, mode: "__proto__" })).toBe(false);
    expect(isSong({ ...s, fx: { ...s.fx, shimmer: 9 } })).toBe(false);
    expect(isSong({ ...s, sections: [] })).toBe(false);
    expect(
      isSong({ ...s, sections: [{ ...s.sections[0], pattern: [[true]] }] }),
    ).toBe(false);
    expect(isSong(null)).toBe(false);
    expect(isSong({ ...s, sections: [null] })).toBe(false);
    expect(isSong({ ...s, sections: [s.sections[0], s.sections[0]] })).toBe(
      false,
    );
  });
});
