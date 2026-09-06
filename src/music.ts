import { bassNames, arpNames, padNames, type Instruments } from "./instruments";
import { generateSongName } from "./songNames";
export const keys = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
export const modes = {
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Ionian: [0, 2, 4, 5, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
export type Mode = keyof typeof modes;
export type Track = "pad" | "arp" | "bass" | "drums";
export const qualities = {
  diatonic: "In key",
  major: "Major",
  minor: "Minor",
  dominant: "Dominant",
  sus2: "Sus2",
  sus4: "Sus4",
  diminished: "Diminished",
  augmented: "Augmented",
} as const;
export type Chord = {
  degree: number;
  extension: "triad" | "7" | "9";
  inversion: number;
  beats?: number;
  quality?: keyof typeof qualities;
  voicing?: "root" | "skeleton" | "full";
};
export function randomizeChord(
  chord: Chord,
  keepRoot = false,
  random = Math.random,
): Chord {
  const pick = <T>(values: T[]) => values[Math.floor(random() * values.length)];
  const voicing = pick(["root", "skeleton", "full"] as const);
  return {
    ...chord,
    degree: keepRoot ? chord.degree : pick([0, 1, 2, 3, 4, 5, 6]),
    quality: pick(Object.keys(qualities) as (keyof typeof qualities)[]),
    extension: pick(["triad", "7", "9"]),
    inversion:
      voicing === "root"
        ? 0
        : pick(voicing === "skeleton" ? [0, 1] : [0, 1, 2]),
    voicing,
    beats: keepRoot ? chord.beats : pick([2, 3, 4, 5, 7, 8, 12]),
  };
}
export type Texture = {
  bassMode: "sparse" | "wander" | "pedal";
  density: number;
  movement: number;
  phrases: number;
  accents: number;
  drift: number;
  evolve: boolean;
  salt: number;
};
export const defaultTexture: Texture = {
  bassMode: "sparse",
  density: 0.35,
  movement: 0.4,
  phrases: 0.45,
  accents: 0.2,
  drift: 0.35,
  evolve: true,
  salt: 0,
};
export type Section = {
  id: string;
  name: string;
  bars: number;
  energy: number;
  texture?: Texture;
  chords: Chord[];
  pattern: boolean[][];
  tracks: Record<Track, boolean>;
};
export type Song = {
  version: 1;
  name: string;
  seed: number;
  key: string;
  mode: Mode;
  bpm: number;
  swing: number;
  instruments?: Instruments;
  sections: Section[];
  volumes: Record<Track, number>;
  fx: {
    cutoff: number;
    resonance: number;
    mix: number;
    decay: number;
    shimmer: number;
    pitch: number;
    delay: number;
    master: number;
    compression?: number;
    dirtEnabled?: boolean;
  };
};
export const trackNames: Record<Track, string> = {
  pad: "Atmosphere",
  arp: "Particles",
  bass: "Sub orbit",
  drums: "Pulse",
};
export const tracks: Track[] = ["pad", "arp", "bass", "drums"];
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makePattern(random = Math.random): boolean[][] {
  return Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 16 }, (_, i) =>
      row === 0
        ? i === 0 || i === 8 || (i === 14 && random() > 0.65)
        : row === 1
          ? i === 4 || i === 12
          : i % 2 === 0 && random() > 0.22,
    ),
  );
}
export function generateSong(
  seed = Math.floor(Math.random() * 2147483647),
): Song {
  const r = rng(seed);
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const progression = pick([
    [0, 5, 2, 6],
    [0, 3, 5, 4],
    [0, 6, 3, 4],
    [0, 2, 5, 3],
  ]);
  // Preserve the music RNG position used by the old title picker.
  r();
  const name = generateSongName(rng(seed ^ 0x6a09e667));
  return {
    version: 1,
    seed,
    name,
    key: pick(["D", "A", "F#", "C", "E"]),
    mode: pick(["Aeolian", "Dorian", "Lydian", "Mixolydian"] as Mode[]),
    bpm: pick([68, 72, 76, 80, 84, 88]),
    swing: 0,
    instruments: {
      variation: Math.floor(r() * 2147483647),
      pad: pick(Object.keys(padNames) as (keyof typeof padNames)[]),
      bass: pick(Object.keys(bassNames) as Instruments["bass"][]),
      arp: pick(Object.keys(arpNames) as Instruments["arp"][]),
      glide: pick([0, 0.08, 0.18, 0.3]),
    },
    sections: [
      "Arrival",
      "Drift",
      "Bloom",
      "Suspension",
      "Return",
      "Dissolve",
    ].map((name, i) => ({
      id: `s${seed}-${i}`,
      name,
      bars: pick([5, 7, 9, 11, 13]),
      texture: {
        ...defaultTexture,
        bassMode: pick(["sparse", "wander", "pedal"] as const),
        density: 0.2 + r() * 0.4,
        movement: 0.3 + r() * 0.55,
        phrases: 0.25 + r() * 0.5,
        accents: 0.1 + r() * 0.35,
        drift: 0.25 + r() * 0.5,
        salt: Math.floor(r() * 1000000),
      },
      energy: [0.4, 0.6, 0.85, 0.45, 0.75, 0.3][i],
      chords: progression.map((degree, j) => ({
        degree:
          r() < 0.35
            ? Math.floor(r() * 7)
            : i === 3
              ? (degree + 3) % 7
              : degree,
        extension: pick(["7", "9"] as const),
        quality: "diatonic",
        voicing: pick(["root", "skeleton", "full"] as const),
        inversion: j % 2,
        beats: pick([2, 3, 5, 7, 8, 12]),
      })),
      pattern: makePattern(r),
      tracks: {
        pad: true,
        arp: i !== 0 && i !== 5,
        bass: i !== 5,
        drums: i === 2 || i === 4,
      },
    })),
    volumes: { pad: -15, arp: -20, bass: -15, drums: -16 },
    fx: {
      cutoff: 3200,
      resonance: 0.7,
      mix: 0.48,
      decay: 9,
      shimmer: 0.38,
      pitch: 12,
      delay: 0.22,
      master: -9,
      compression: 0.5,
      dirtEnabled: true,
    },
  };
}
export function chordMidi(
  song: Pick<Song, "key" | "mode">,
  chord: Chord,
  octave = 3,
) {
  const scale = modes[song.mode];
  const root = 12 * (octave + 1) + keys.indexOf(song.key);
  const intervals =
    chord.extension === "triad"
      ? [0, 2, 4]
      : chord.extension === "7"
        ? [0, 2, 4, 6]
        : [0, 2, 4, 6, 8];
  let notes = intervals.map(
    (d) =>
      root +
      scale[(chord.degree + d) % 7] +
      12 * Math.floor((chord.degree + d) / 7),
  );
  if (chord.quality && chord.quality !== "diatonic") {
    const shapes = {
      major: [0, 4, 7, 11, 14],
      minor: [0, 3, 7, 10, 14],
      dominant: [0, 4, 7, 10, 14],
      sus2: [0, 2, 7, 10, 14],
      sus4: [0, 5, 7, 10, 14],
      diminished: [0, 3, 6, 10, 14],
      augmented: [0, 4, 8, 11, 14],
    };
    const chordRoot = notes[0];
    notes = shapes[chord.quality]
      .slice(0, intervals.length)
      .map((n) => chordRoot + n);
  }
  if (chord.voicing === "root") return [notes[0]];
  if (chord.voicing === "skeleton") notes = [notes[0], notes[notes.length - 1]];
  for (let i = 0; i < Math.min(chord.inversion, notes.length - 1); i++)
    notes.push(notes.shift()! + 12);
  return notes.sort((a, b) => a - b);
}
export function noteName(midi: number) {
  return keys[midi % 12] + (Math.floor(midi / 12) - 1);
}
export function chordName(song: Song, chord: Chord) {
  const n = chordMidi(song, { ...chord, inversion: 0, voicing: "full" });
  const minor = n[1] - n[0] === 3;
  const dim = n[2] - n[0] === 6;
  return (
    keys[n[0] % 12] +
    (chord.quality === "sus2"
      ? "sus2"
      : chord.quality === "sus4"
        ? "sus4"
        : chord.quality === "augmented"
          ? "+"
          : dim
            ? chord.extension === "triad"
              ? "°"
              : "ø"
            : minor
              ? "m"
              : "") +
    (chord.extension === "triad"
      ? ""
      : !minor && !dim && n[3] - n[0] === 11
        ? "maj" + chord.extension
        : chord.extension)
  );
}
export function roman(song: Song, chord: Chord) {
  const n = chordMidi(song, { ...chord, inversion: 0, voicing: "full" });
  const text = ["I", "II", "III", "IV", "V", "VI", "VII"][chord.degree];
  return (
    (n[1] - n[0] === 3 ? text.toLowerCase() : text) +
    (n[2] - n[0] === 6 ? "ø" : "")
  );
}
export function locate(sections: Section[], bar: number) {
  let start = 0;
  for (let i = 0; i < sections.length; i++) {
    if (bar < start + sections[i].bars) return { index: i, bar: bar - start };
    start += sections[i].bars;
  }
  return { index: 0, bar: 0 };
}
export function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false;
  const s = value as Song;
  const number = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  return (
    s.version === 1 &&
    typeof s.name === "string" &&
    s.name.length <= 120 &&
    number(s.seed, 0, 2147483647) &&
    keys.includes(s.key) &&
    Object.hasOwn(modes, s.mode) &&
    number(s.bpm, 40, 160) &&
    number(s.swing, 0, 0.5) &&
    (s.instruments === undefined ||
      (!!s.instruments &&
        Object.hasOwn(bassNames, s.instruments.bass) &&
        (s.instruments.pad === undefined ||
          Object.hasOwn(padNames, s.instruments.pad)) &&
        Object.hasOwn(arpNames, s.instruments.arp) &&
        number(s.instruments.glide, 0, 1) &&
        (s.instruments.variation === undefined ||
          (number(s.instruments.variation, 0, 2147483647) &&
            Number.isInteger(s.instruments.variation))))) &&
    Array.isArray(s.sections) &&
    s.sections.length > 0 &&
    s.sections.length <= 24 &&
    new Set(s.sections.map((x) => x?.id)).size === s.sections.length &&
    s.sections.every(
      (x) =>
        !!x &&
        typeof x.id === "string" &&
        typeof x.name === "string" &&
        number(x.bars, 1, 32) &&
        Number.isInteger(x.bars) &&
        number(x.energy, 0.1, 1) &&
        (x.texture === undefined ||
          (!!x.texture &&
            ["sparse", "wander", "pedal"].includes(x.texture.bassMode) &&
            [
              x.texture.density,
              x.texture.movement,
              x.texture.phrases,
              x.texture.accents,
              x.texture.drift,
            ].every((v) => number(v, 0, 1)) &&
            typeof x.texture.evolve === "boolean" &&
            number(x.texture.salt, 0, 2147483647) &&
            Number.isInteger(x.texture.salt))) &&
        Array.isArray(x.chords) &&
        x.chords.length === 4 &&
        x.chords.every(
          (c) =>
            !!c &&
            number(c.degree, 0, 6) &&
            Number.isInteger(c.degree) &&
            ["triad", "7", "9"].includes(c.extension) &&
            (c.quality === undefined || Object.hasOwn(qualities, c.quality)) &&
            (c.voicing === undefined ||
              ["root", "skeleton", "full"].includes(c.voicing)) &&
            number(c.inversion, 0, 2) &&
            Number.isInteger(c.inversion) &&
            (c.beats === undefined ||
              (number(c.beats, 1, 16) && Number.isInteger(c.beats))),
        ) &&
        Array.isArray(x.pattern) &&
        x.pattern.length === 3 &&
        x.pattern.every(
          (row) =>
            Array.isArray(row) &&
            row.length === 16 &&
            row.every((v) => typeof v === "boolean"),
        ) &&
        x.tracks &&
        tracks.every((t) => typeof x.tracks[t] === "boolean"),
    ) &&
    !!s.volumes &&
    tracks.every((t) => number(s.volumes[t], -40, 0)) &&
    !!s.fx &&
    number(s.fx.cutoff, 150, 12000) &&
    number(s.fx.resonance, 0.1, 8) &&
    number(s.fx.mix, 0, 1) &&
    number(s.fx.decay, 1, 18) &&
    number(s.fx.shimmer, 0, 0.8) &&
    [7, 12, 19, 24].includes(s.fx.pitch) &&
    number(s.fx.delay, 0, 0.6) &&
    number(s.fx.master, -40, 0) &&
    (s.fx.compression === undefined || number(s.fx.compression, 0, 1)) &&
    (s.fx.dirtEnabled === undefined || typeof s.fx.dirtEnabled === "boolean")
  );
}
