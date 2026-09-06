import { describe, it, expect } from "vitest";
import {
  chordMidi,
  chordName,
  generateSong,
  randomizeChord,
  isSong,
  rng,
  type Chord,
} from "./music";
describe("chord dice and reduced voicings", () => {
  const song = { ...generateSong(2), key: "C", mode: "Ionian" as const };
  it("uses root plus the highest defining tone, before inversion", () => {
    for (const [extension, top] of [
      ["triad", 55],
      ["7", 59],
      ["9", 62],
    ] as const) {
      const c: Chord = {
        degree: 0,
        inversion: 0,
        extension,
        voicing: "skeleton",
      };
      expect(chordMidi(song, c)).toEqual([48, top]);
      expect(chordMidi(song, { ...c, voicing: "root", inversion: 2 })).toEqual([
        48,
      ]);
      expect(
        chordMidi(song, { ...c, inversion: 1 })
          .map((n) => n % 12)
          .sort(),
      ).toEqual([48, top].map((n) => n % 12).sort());
    }
  });
  it("changes quality without moving the harmonic root and keeps symbols intact", () => {
    const c: Chord = {
      degree: 0,
      inversion: 0,
      extension: "7",
      quality: "minor",
      voicing: "root",
    };
    expect(chordMidi(song, { ...c, voicing: "full" })).toEqual([
      48, 51, 55, 58,
    ]);
    expect(chordName(song, c)).toBe("Cm7");
    expect(
      chordName(song, { ...c, quality: "dominant", voicing: "skeleton" }),
    ).toBe("C7");
  });
  it("preserves root and duration with the keep-root dice and varies all voicing modes", () => {
    const c: Chord = { degree: 3, inversion: 1, extension: "7", beats: 5 };
    const random = rng(23),
      voicings = new Set();
    for (let n = 0; n < 100; n++) {
      const next = randomizeChord(c, true, random);
      expect(next.degree).toBe(3);
      expect(next.beats).toBe(5);
      voicings.add(next.voicing);
      const project = structuredClone(song);
      project.sections[0].chords[0] = next;
      expect(isSong(project)).toBe(true);
    }
    expect(voicings.size).toBe(3);
    expect(
      new Set(
        Array.from(
          { length: 100 },
          () => randomizeChord(c, false, random).degree,
        ),
      ).size,
    ).toBe(7);
  });
  it("rejects malformed qualities and voicings while accepting old files", () => {
    const project = structuredClone(song);
    project.sections[0].chords[0].voicing = "invalid" as Chord["voicing"];
    expect(isSong(project)).toBe(false);
    delete project.sections[0].chords[0].voicing;
    expect(isSong(project)).toBe(true);
  });
});
