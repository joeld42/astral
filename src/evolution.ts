import {
  chordMidi,
  defaultTexture,
  keys,
  modes,
  rng,
  type Section,
  type Song,
} from "./music";

/** Chord lengths are quarter-note beats; the cycle can cross bar lines. */
export function harmonyAt(section: Section, step: number) {
  const lengths = section.chords.map((c) => (c.beats ?? 4) * 4);
  const cycle = lengths.reduce((a, b) => a + b, 0);
  let offset = step % cycle;
  for (let index = 0; index < lengths.length; index++) {
    if (offset < lengths[index])
      return { index, onset: offset === 0, remaining: lengths[index] - offset };
    offset -= lengths[index];
  }
  return { index: 0, onset: true, remaining: lengths[0] };
}
function hash(text: string) {
  let n = 0;
  for (const c of text) n = (Math.imul(n, 31) + c.charCodeAt(0)) | 0;
  return n;
}
export type NoteEvent = { midi: number; steps: number; velocity: number };
/** Pure event decisions, independent of frame rate and of which layers are muted. */
export function evolutionAt(
  song: Song,
  section: Section,
  step: number,
  elapsed: number,
) {
  const t = section.texture ?? defaultTexture;
  const clock = t.evolve ? elapsed : step;
  const seed = song.seed ^ hash(section.id) ^ t.salt;
  const r = rng(seed ^ Math.imul(clock + 1, 2654435761));
  const h = harmonyAt(section, step);
  const chord = section.chords[h.index];
  const notes = chordMidi(song, chord);
  const root = chordMidi(song, { ...chord, inversion: 0 }, 1)[0];
  const tonic = 24 + keys.indexOf(song.key);
  let bass: NoteEvent | null = null;
  if (t.density > 0) {
    const pedal = t.bassMode === "pedal";
    const pedalR = rng(
      seed ^ Math.imul(Math.floor(clock / 32) + 1, 1103515245),
    );
    const pedalStyle = pedalR();
    const pulse = pedalStyle < 0.4 && t.movement > 0;
    const walk = pedalStyle >= 0.4 && pedalStyle < 0.65 && t.movement > 0;
    const eligible = pedal
      ? pulse
        ? step % 2 === 0
        : walk
          ? step % 4 === 0
          : step % 32 === 0
      : h.onset ||
        (step % 2 === 0 &&
          r() < t.movement * (t.bassMode === "wander" ? 0.32 : 0.08));
    if (eligible && (step === 0 || r() < t.density * (h.onset ? 1.5 : 1))) {
      let midi = pedal ? tonic : root;
      if (pedal && walk && step % 16 !== 0 && r() < t.movement) {
        const degree = [0, 1, 2, 4, 2, 1, 6, 0][Math.floor(step / 4) % 8];
        midi = tonic + modes[song.mode][degree];
      }
      if (!pedal && !h.onset && r() < t.movement) {
        // Chord tones, with occasional adjacent scale tones as passing motion.
        const degree =
          chord.degree +
          (r() < 0.65
            ? [2, 4, 7][Math.floor(r() * 3)]
            : [1, 6][Math.floor(r() * 2)]);
        midi =
          24 +
          keys.indexOf(song.key) +
          modes[song.mode][degree % 7] +
          12 * Math.floor(degree / 7);
      }
      bass = {
        midi,
        steps: pedal
          ? pulse
            ? 1.6
            : walk
              ? 3.4
              : 28
          : Math.min(h.remaining, r() < 0.35 ? 3 : 6 + Math.floor(r() * 10)),
        velocity: 0.55 + r() * 0.35,
      };
    }
  }
  // Each six-beat window has a reproducible motif, an offset, and breathing room.
  const phraseR = rng(seed ^ Math.imul(Math.floor(clock / 24) + 1, 1597334677));
  const phraseOn = phraseR() < t.phrases;
  const start = Math.floor(phraseR() * 8),
    spacing = [1, 2, 3, 4, 6, 8][Math.floor(phraseR() * 6)],
    count = 2 + Math.floor(phraseR() * 5);
  const offset = (clock % 24) - start;
  let phrase: NoteEvent | null = null;
  if (
    phraseOn &&
    offset >= 0 &&
    offset % spacing === 0 &&
    offset / spacing < count &&
    r() > 0.18
  ) {
    const contours = [
      [0, 2, 1, 3, 1, 0],
      [4, 3, 1, 0, 2, 1],
      [0, 1, 2, 4, 3, 2],
      [0, 3, 0, 2, 4, 1],
    ];
    const contour = contours[Math.floor(phraseR() * contours.length)];
    const degree = contour[offset / spacing];
    phrase = {
      midi: notes[degree % notes.length] + (phraseR() < 0.3 ? 24 : 12),
      steps:
        r() < 0.3
          ? 8 + Math.floor(r() * 16)
          : 1 + Math.floor(r() * Math.max(2, spacing)),
      velocity: 0.22 + r() * 0.35,
    };
  }
  const accent =
    t.accents > 0 && step % 2 === 0 && r() < t.accents * 0.035
      ? {
          midi: notes[Math.floor(r() * notes.length)] + 24,
          steps: 6 + Math.floor(r() * 10),
          velocity: 0.25 + r() * 0.3,
        }
      : null;
  const drift =
    1 +
    t.drift * (Math.sin(clock / 71 + seed) * 0.4 + Math.sin(clock / 193) * 0.2);
  const sceneR = rng(seed ^ Math.imul(Math.floor(clock / 64) + 1, 2246822519));
  const scene = ["bloom", "chop", "erode", "dub", "sweep"][
    Math.floor(sceneR() * 5)
  ];
  const phase = clock % 64;
  const recover = phase >= 48;
  const strength = t.drift;
  const damage =
    !recover && scene === "erode" ? Math.min(1, strength * 2.2) : 0;
  const motion =
    scene === "chop"
      ? Math.floor(clock / 2) % 2 === 0
        ? 0.15
        : 2.8
      : scene === "sweep"
        ? 0.08 + 3.8 * (phase / 64) ** 2
        : 0.25 + 2.8 * (0.5 + 0.5 * Math.sin(clock / 11 + seed));
  const sweepR = rng(seed ^ 0x5bd1e995);
  const progress = Math.min(1, step / Math.max(1, section.bars * 16 - 1));
  const curve = progress * progress * (3 - 2 * progress);
  const sweep = sweepR() < 0.5 ? 0.4 + 1.4 * curve : 1.8 - 1.4 * curve;
  const automation = {
    sectionSweep: sweep,
    scene: strength === 0 ? "still" : recover ? "recover" : scene,
    cutoff: Math.max(
      100,
      Math.min(
        12000,
        song.fx.cutoff *
          (1 - strength + strength * (motion * 0.25 + sweep * 0.75)),
      ),
    ),
    highpass:
      120 +
      strength *
        (recover
          ? 0
          : scene === "sweep"
            ? 1100 * (phase / 64)
            : scene === "erode"
              ? 650
              : 30),
    resonance: Math.min(
      3.5,
      song.fx.resonance + strength * (scene === "chop" ? 1.2 : 0.7),
    ),
    drive: damage * 0.85,
    crush: damage * 0.8,
    feedback: Math.min(
      0.88,
      0.3 + strength * (recover ? 0.08 : scene === "dub" ? 0.58 : 0.35),
    ),
    delaySteps: scene === "dub" ? [3, 6, 8, 12][Math.floor(sceneR() * 4)] : 6,
    delayGain: Math.min(
      0.5,
      song.fx.delay +
        strength * (recover ? 0.05 : scene === "dub" ? 0.22 : 0.08),
    ),
    gate:
      scene === "chop" && !recover && clock % 4 >= 2 ? 1 - strength * 0.85 : 1,
    pan: Math.sin(clock / 19 + seed) * strength * 0.8,
  };
  const fragmentR = rng(
    seed ^ Math.imul(Math.floor(clock / 48) + 1, 3266489917),
  );
  const fragmentOn = fragmentR() < t.phrases;
  const fragmentStart = 8 + Math.floor(fragmentR() * 12);
  const fragmentOffset = (clock % 48) - fragmentStart;
  const fragmentContour = [
    [0, 1, 4, 3, 2, 1],
    [4, 2, 3, 1, 0, 6],
    [0, 2, 4, 6, 4, 2],
  ][Math.floor(fragmentR() * 3)];
  const fragment =
    fragmentOn &&
    fragmentOffset >= 0 &&
    fragmentOffset < 12 &&
    fragmentOffset % 2 === 0
      ? {
          midi:
            120 +
            keys.indexOf(song.key) +
            modes[song.mode][
              (chord.degree + fragmentContour[fragmentOffset / 2]) % 7
            ],
          steps: fragmentOffset === 10 ? 8 : 1.3,
          velocity: 0.35 + r() * 0.3,
        }
      : null;
  const voiced = notes.map(
    (n, i) => n + (i === notes.length - 1 && sceneR() < 0.45 ? 12 : 0),
  );
  const padPulse = scene === "chop" && strength > 0 && step % 8 === 0;
  return {
    harmony: h,
    notes: voiced,
    bass,
    phrase,
    accent,
    fragment,
    drift,
    automation,
    padPulse,
  };
}
