import { describe, it, expect } from "vitest";
import { evolutionAt, harmonyAt } from "./evolution";
import { defaultTexture, generateSong, isSong, keys, modes } from "./music";
const fixture = () => {
  const song = generateSong(77);
  const section = song.sections[0];
  section.texture = {
    ...defaultTexture,
    density: 0.7,
    movement: 0.9,
    phrases: 0.8,
    accents: 0.6,
  };
  section.chords.forEach((c, i) => {
    c.beats = [3, 5, 7, 2][i];
  });
  return { song, section };
};
describe("evolving musical decisions", () => {
  it("changes harmony between bar lines and wraps an asymmetric cycle", () => {
    const { section } = fixture();
    expect(harmonyAt(section, 11)).toEqual({
      index: 0,
      onset: false,
      remaining: 1,
    });
    expect(harmonyAt(section, 12)).toEqual({
      index: 1,
      onset: true,
      remaining: 20,
    });
    expect(harmonyAt(section, 16)).toEqual({
      index: 1,
      onset: false,
      remaining: 16,
    });
    expect(harmonyAt(section, 68)).toEqual({
      index: 0,
      onset: true,
      remaining: 12,
    });
  });
  it("replays identical decisions with the same seed and performance position", () => {
    const { song, section } = fixture();
    for (let n = 0; n < 500; n++)
      expect(evolutionAt(song, section, n % 80, n)).toEqual(
        evolutionAt(structuredClone(song), structuredClone(section), n % 80, n),
      );
  });
  it("evolves loop performances, with an exact-repeat option", () => {
    const { song, section } = fixture();
    const pass = (offset: number) =>
      Array.from({ length: 80 }, (_, n) =>
        evolutionAt(song, section, n, n + offset),
      );
    expect(pass(0)).not.toEqual(pass(80));
    section.texture!.evolve = false;
    expect(pass(0)).toEqual(pass(80));
  });
  it("keeps the pedal anchored when movement is zero", () => {
    const { song, section } = fixture();
    section.texture!.bassMode = "pedal";
    section.texture!.movement = 0;
    section.texture!.density = 1;
    for (let n = 0; n < 500; n++) {
      const bass = evolutionAt(song, section, n, n).bass;
      if (bass) expect(bass.midi).toBe(24 + keys.indexOf(song.key));
    }
  });
  it("wanders through the mode while preserving gaps and bounded velocity", () => {
    const { song, section } = fixture();
    section.texture!.bassMode = "wander";
    const events = Array.from({ length: 500 }, (_, n) =>
      evolutionAt(song, section, n, n),
    );
    const bass = events.flatMap((e) => (e.bass ? [e.bass] : []));
    expect(new Set(bass.map((b) => b.midi)).size).toBeGreaterThan(3);
    expect(bass.length).toBeLessThan(200);
    for (const b of bass) {
      expect(modes[song.mode]).toContain(
        (b.midi - keys.indexOf(song.key)) % 12,
      );
      expect(b.velocity).toBeLessThanOrEqual(1);
      expect(b.steps).toBeGreaterThan(0);
    }
    expect(events.some((e) => e.phrase)).toBe(true);
    expect(events.some((e) => e.accent)).toBe(true);
  });
  it("respects zero density, phrase, accent and drift controls", () => {
    const { song, section } = fixture();
    Object.assign(section.texture!, {
      density: 0,
      phrases: 0,
      accents: 0,
      drift: 0,
    });
    for (let n = 0; n < 500; n++) {
      const e = evolutionAt(song, section, n, n);
      expect(e.bass).toBe(null);
      expect(e.phrase).toBe(null);
      expect(e.accent).toBe(null);
      expect(e.drift).toBe(1);
      expect(e.fragment).toBe(null);
      expect(e.automation.drive).toBe(0);
      expect(e.automation.crush).toBe(0);
      expect(e.automation.cutoff).toBe(song.fx.cutoff);
    }
  });
  it("lets pedal bass pulse on eighths and walk through the mode", () => {
    const { song, section } = fixture();
    Object.assign(section.texture!, {
      bassMode: "pedal",
      density: 1,
      movement: 1,
    });
    const events = Array.from(
      { length: 2048 },
      (_, n) => evolutionAt(song, section, n, n).bass,
    );
    expect(
      events.some((e, i) => e && i > 1 && events[i - 2] && e.steps === 1.6),
    ).toBe(true);
    expect(
      events.some((e) => e && e.midi !== 24 + keys.indexOf(song.key)),
    ).toBe(true);
    for (const e of events)
      if (e)
        expect(modes[song.mode]).toContain(
          (e.midi - keys.indexOf(song.key)) % 12,
        );
  });
  it("visits destruction and recovery with bounded feedback and rhythmic motion", () => {
    const { song, section } = fixture();
    section.texture!.drift = 1;
    const events = Array.from({ length: 2048 }, (_, n) =>
      evolutionAt(song, section, n, n),
    );
    expect(
      events.some((e) => e.automation.drive > 0.5 && e.automation.crush > 0.5),
    ).toBe(true);
    expect(events.some((e) => e.automation.feedback > 0.8)).toBe(true);
    expect(events.some((e) => e.automation.gate < 0.3)).toBe(true);
    expect(events.some((e) => e.fragment)).toBe(true);
    for (let n = 0; n < events.length; n++) {
      const a = events[n].automation;
      expect(a.feedback).toBeLessThan(1);
      expect(a.cutoff).toBeGreaterThanOrEqual(100);
      expect(a.cutoff).toBeLessThanOrEqual(12000);
      if (n % 64 >= 48) {
        expect(a.drive).toBe(0);
        expect(a.crush).toBe(0);
        expect(a.gate).toBe(1);
      }
    }
  });
  it("uses a major third and flat seventh in Mixolydian", () => {
    const { song, section } = fixture();
    song.mode = "Mixolydian";
    expect(isSong(song)).toBe(true);
    expect(modes.Mixolydian).toEqual([0, 2, 4, 5, 7, 9, 10]);
    for (let n = 0; n < 1000; n++) {
      const e = evolutionAt(song, section, n, n);
      if (e.fragment)
        expect(modes.Mixolydian).toContain(
          (e.fragment.midi - keys.indexOf(song.key)) % 12,
        );
    }
  });
  it("varies particle speeds and mixes short notes with held notes", () => {
    const { song, section } = fixture();
    section.texture!.phrases = 1;
    const events = Array.from(
      { length: 4096 },
      (_, n) => evolutionAt(song, section, n, n).phrase,
    );
    expect(events.some((e) => e && e.steps >= 8)).toBe(true);
    expect(events.some((e) => e && e.steps <= 2)).toBe(true);
    expect(events.some((e, n) => e && events[n + 1])).toBe(true);
    expect(
      events.some(
        (e, n) => e && !events[n + 1] && !events[n + 2] && !events[n + 3],
      ),
    ).toBe(true);
  });
  it("spreads a smooth sweep across the entire section and limits resonance", () => {
    const { song, section } = fixture();
    section.texture!.drift = 1;
    const sweep = Array.from(
      { length: section.bars * 16 },
      (_, n) => evolutionAt(song, section, n, n).automation,
    );
    const rising = sweep.at(-1)!.sectionSweep > sweep[0].sectionSweep;
    expect(
      Math.abs(sweep.at(-1)!.sectionSweep - sweep[0].sectionSweep),
    ).toBeGreaterThan(1);
    for (let i = 1; i < sweep.length; i++) {
      expect(sweep[i].resonance).toBeLessThanOrEqual(3.5);
      expect(
        rising
          ? sweep[i].sectionSweep >= sweep[i - 1].sectionSweep
          : sweep[i].sectionSweep <= sweep[i - 1].sectionSweep,
      ).toBe(true);
    }
  });
  it("loads old projects but rejects invalid new controls", () => {
    const { song, section } = fixture();
    delete section.texture;
    section.chords.forEach((c) => delete c.beats);
    expect(isSong(song)).toBe(true);
    expect(harmonyAt(section, 16).index).toBe(1);
    section.chords[0].beats = 0;
    expect(isSong(song)).toBe(false);
    section.chords[0].beats = 3;
    section.texture = { ...defaultTexture, density: NaN };
    expect(isSong(song)).toBe(false);
  });
});
