import { evolutionAt } from "./evolution";
import { bassPresets, arpPresets, padPresets, varyPreset } from "./instruments";
import { beforeEach, describe, expect, it, vi } from "vitest";
const audio = vi.hoisted(() => ({
  transport: {
    bpm: { rampTo: vi.fn() },
    swing: 0,
    swingSubdivision: "",
    start: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
  },
  draw: { schedule: (fn: () => void) => fn() },
}));
vi.mock("tone", () => {
  class Node {
    set = vi.fn();
    threshold = { rampTo: vi.fn() };
    ratio = { rampTo: vi.fn() };
    triggerAttack = vi.fn();
    portamento = 0;
    wet = { rampTo: vi.fn() };
    feedback = { rampTo: vi.fn() };
    delayTime = { rampTo: vi.fn() };
    pan = { rampTo: vi.fn() };
    gain = { rampTo: vi.fn() };
    frequency = { rampTo: vi.fn() };
    Q = { rampTo: vi.fn() };
    volume = { rampTo: vi.fn() };
    ready = Promise.resolve();
    decay = 9;
    pitch = 12;
    triggerAttackRelease = vi.fn();
    releaseAll = vi.fn();
    triggerRelease = vi.fn();
    connect() {
      return this;
    }
    chain = vi.fn((..._nodes: unknown[]) => this);
    toDestination() {
      return this;
    }
    start() {
      return this;
    }
    dispose() {}
    stop() {
      return Promise.resolve(new Blob());
    }
    getValue() {
      return new Float32Array(128);
    }
  }
  return {
    Compressor: Node,
    Distortion: Node,
    BitCrusher: Node,
    Panner: Node,
    Volume: Node,
    Limiter: Node,
    Filter: Node,
    Gain: Node,
    Reverb: Node,
    PitchShift: Node,
    PingPongDelay: Node,
    Recorder: Node,
    Waveform: Node,
    PolySynth: Node,
    Synth: Node,
    FMSynth: Node,
    MonoSynth: Node,
    MembraneSynth: Node,
    NoiseSynth: Node,
    Loop: Node,
    getTransport: () => audio.transport,
    getDraw: () => audio.draw,
    start: () => Promise.resolve(),
  };
});
import { Engine } from "./engine";
import { generateSong } from "./music";
describe("audio scheduler", () => {
  beforeEach(() => vi.clearAllMocks());
  const create = () => {
    const song = generateSong(5);
    song.sections.forEach((s, i) => {
      s.bars = i === 0 || i === 5 ? 4 : 8;
      if (s.texture) s.texture.drift = 0;
      s.chords.forEach((c) => {
        c.beats = 4;
        c.voicing = "full";
      });
    });
    const position = vi.fn(),
      end = vi.fn();
    const engine = new Engine(song, position, end);
    engine.playing = true;
    return { song, engine, position, end };
  };
  it("schedules chord and bass at bar start, and publishes the beat", () => {
    const { engine, song, position } = create();
    engine.tick(1);
    expect(engine.pad.triggerAttack).toHaveBeenCalledTimes(
      song.sections[0].chords[0].extension === "9" ? 5 : 4,
    );
    expect(engine.bass.triggerAttackRelease).toHaveBeenCalledTimes(1);
    expect(position).toHaveBeenCalledWith({
      section: 0,
      bar: 0,
      step: 0,
      chord: 0,
    });
    engine.tick(2);
    expect(engine.pad.triggerAttack).toHaveBeenCalledTimes(
      song.sections[0].chords[0].extension === "9" ? 5 : 4,
    );
    engine.dispose();
  });
  it("sustains pads across bar lines and uses the variable chord playhead", () => {
    const { engine, song, position } = create();
    song.sections[0].chords.forEach((c) => {
      c.beats = 7;
    });
    engine.tick(0);
    engine.step = 16;
    engine.tick(1);
    expect(engine.pad.triggerAttack).toHaveBeenCalledTimes(
      song.sections[0].chords[0].extension === "9" ? 5 : 4,
    );
    engine.step = 28;
    engine.tick(2);
    expect(engine.pad.triggerRelease).toHaveBeenCalled();
    expect(position).toHaveBeenLastCalledWith(
      expect.objectContaining({ chord: 1, step: 12 }),
    );
    engine.elapsed = 100;
    engine.stop();
    expect(engine.elapsed).toBe(0);
    engine.dispose();
  });
  it("only triggers enabled layers and respects solo", () => {
    const { engine } = create();
    engine.solo = "arp";
    engine.tick(0);
    expect(engine.pad.triggerAttack).not.toHaveBeenCalled();
    expect(engine.arp.triggerAttackRelease).not.toHaveBeenCalled();
    engine.dispose();
  });
  it("keeps saved patterns silent when drums are disabled, then schedules each enabled hit", () => {
    const { engine, song } = create();
    const section = song.sections[0];
    section.pattern = Array.from({ length: 3 }, () => Array(16).fill(true));
    engine.tick(0);
    expect(engine.kick.triggerAttackRelease).not.toHaveBeenCalled();
    expect(engine.snare.triggerAttackRelease).not.toHaveBeenCalled();
    expect(engine.hat.triggerAttackRelease).not.toHaveBeenCalled();
    engine.update({
      ...song,
      sections: song.sections.map((s, i) =>
        i === 0 ? { ...s, tracks: { ...s.tracks, drums: true } } : s,
      ),
    });
    engine.tick(1);
    expect(engine.kick.triggerAttackRelease).toHaveBeenCalledTimes(1);
    expect(engine.snare.triggerAttackRelease).toHaveBeenCalledTimes(1);
    expect(engine.hat.triggerAttackRelease).toHaveBeenCalledTimes(1);
    engine.solo = "pad";
    engine.tick(2);
    expect(engine.kick.triggerAttackRelease).toHaveBeenCalledTimes(1);
    engine.dispose();
  });
  it("launches on the next bar, not halfway through one", () => {
    const { engine, song, position } = create();
    engine.step = 3;
    engine.queuedSection = song.sections[2].id;
    engine.tick(0);
    expect(position).toHaveBeenLastCalledWith(
      expect.objectContaining({ section: 0, step: 3 }),
    );
    engine.step = 16;
    engine.tick(1);
    expect(position).toHaveBeenLastCalledWith(
      expect.objectContaining({ section: 2, bar: 0, step: 0 }),
    );
    expect(engine.queuedSection).toBe(null);
    engine.dispose();
  });
  it("wraps a section loop at its exact boundary", () => {
    const { engine, song, position } = create();
    engine.loopSection = song.sections[0].id;
    engine.step = 64;
    engine.tick(0);
    expect(position).toHaveBeenLastCalledWith({
      section: 0,
      bar: 0,
      step: 0,
      chord: 0,
    });
    expect(engine.step).toBe(1);
    engine.dispose();
  });
  it("wraps the final section instead of ending while looping", () => {
    const { engine, song, position, end } = create();
    engine.loopSection = song.sections[5].id;
    engine.step = 640;
    engine.tick(0);
    expect(position).toHaveBeenLastCalledWith(
      expect.objectContaining({ section: 5, bar: 0 }),
    );
    expect(end).not.toHaveBeenCalled();
    engine.dispose();
  });
  it("stops a complete song and rewinds", () => {
    const { engine, end } = create();
    engine.step = 640;
    engine.tick(0);
    expect(end).toHaveBeenCalledTimes(1);
    expect(engine.step).toBe(0);
    expect(engine.playing).toBe(false);
    engine.dispose();
  });
  it("applies song instruments and glide without resetting them on section edits", () => {
    const { engine, song } = create();
    const next = {
      ...song,
      instruments: {
        bass: "reese" as const,
        arp: "metal" as const,
        glide: 0.25,
      },
    };
    engine.update(next);
    expect(engine.bass.set).toHaveBeenLastCalledWith(
      varyPreset(bassPresets.reese.options, 0),
    );
    expect(engine.arp.set).toHaveBeenLastCalledWith(
      varyPreset(arpPresets.metal.options, 0),
    );
    expect(engine.bass.portamento).toBe(0.25);
    const count = vi.mocked(engine.bass.set).mock.calls.length;
    engine.update({
      ...next,
      sections: next.sections.map((s) => ({ ...s, energy: 0.5 })),
    });
    expect(engine.bass.set).toHaveBeenCalledTimes(count);
    engine.update({ ...next, instruments: { ...next.instruments, glide: 0 } });
    expect(engine.bass.portamento).toBe(0);
    engine.dispose();
  });
  it("restores compatible instrument defaults for older projects", () => {
    const { engine, song } = create();
    const legacy = { ...song };
    delete legacy.instruments;
    engine.update(legacy);
    expect(engine.bass.set).toHaveBeenLastCalledWith(
      varyPreset(bassPresets.sub.options, 0),
    );
    expect(engine.arp.set).toHaveBeenLastCalledWith(
      varyPreset(arpPresets.glass.options, 0),
    );
    expect(engine.bass.portamento).toBe(0);
    engine.dispose();
  });
  it("routes generated motion to timed audio parameters and resets destructive sends on pause", () => {
    const { engine, song } = create();
    const section = song.sections[0];
    section.texture!.drift = 1;
    const expected = evolutionAt(song, section, 0, 0).automation;
    engine.tick(3);
    expect(engine.filter.frequency.rampTo).toHaveBeenLastCalledWith(
      expected.cutoff,
      expect.any(Number),
      3,
    );
    expect(engine.distortion.wet.rampTo).toHaveBeenLastCalledWith(
      expected.drive,
      expect.any(Number),
      3,
    );
    expect(engine.crusher.wet.rampTo).toHaveBeenLastCalledWith(
      expected.crush,
      expect.any(Number),
      3,
    );
    expect(engine.delay.feedback.rampTo).toHaveBeenLastCalledWith(
      expected.feedback,
      expect.any(Number),
      3,
    );
    engine.pause();
    expect(engine.crusher.wet.rampTo).toHaveBeenLastCalledWith(0, 0.1);
    expect(engine.delay.feedback.rampTo).toHaveBeenLastCalledWith(0.3, 0.1);
    engine.dispose();
  });
  it("changes pad voices and retains pad settings for the whole song", () => {
    const { engine, song } = create();
    engine.update({
      ...song,
      instruments: { bass: "sub", arp: "glass", glide: 0, pad: "ice" },
    });
    expect(engine.pad.set).toHaveBeenLastCalledWith(
      varyPreset(padPresets.ice.options, 0),
    );
    engine.dispose();
  });
  it("holds common pad voices without retriggering and compresses the full master", () => {
    const { engine, song } = create();
    song.sections[0].chords[1] = { ...song.sections[0].chords[0] };
    engine.tick(1);
    const attacks = vi.mocked(engine.pad.triggerAttack).mock.calls.length;
    engine.step = 16;
    engine.tick(2);
    expect(engine.pad.triggerAttack).toHaveBeenCalledTimes(attacks);
    expect(engine.pad.triggerRelease).not.toHaveBeenCalled();
    expect(engine.master.chain).toHaveBeenCalledWith(
      engine.compressor,
      engine.limiter,
    );
    expect(vi.mocked(engine.reverb.chain).mock.calls.flat()).not.toContain(
      engine.compressor,
    );
    engine.update({ ...song, fx: { ...song.fx, compression: 0 } });
    expect(engine.compressor.ratio.rampTo).toHaveBeenLastCalledWith(1, 0.15);
    engine.update({ ...song, fx: { ...song.fx, compression: 1 } });
    expect(engine.compressor.ratio.rampTo).toHaveBeenLastCalledWith(6, 0.15);
    engine.dispose();
  });
  it("ramps live controls and changes the pitch interval", () => {
    const { engine, song } = create();
    engine.update({
      ...song,
      fx: { ...song.fx, cutoff: 900, pitch: 24, decay: 15 },
    });
    expect(engine.filter.frequency.rampTo).toHaveBeenLastCalledWith(900, 0.15);
    expect(engine.shift.pitch).toBe(24);
    expect(engine.reverb.decay).toBe(15);
    engine.dispose();
  });
  it("bypasses dirt immediately and during automation while retaining other movement", () => {
    const { engine, song } = create();
    song.sections[0].texture!.drift = 1;
    engine.update({ ...song, fx: { ...song.fx, dirtEnabled: false } });
    expect(engine.distortion.wet.rampTo).toHaveBeenLastCalledWith(0, 0.1);
    expect(engine.crusher.wet.rampTo).toHaveBeenLastCalledWith(0, 0.1);
    for (let n = 0; n < 128; n++) engine.tick(n * 0.2);
    expect(
      vi
        .mocked(engine.distortion.wet.rampTo)
        .mock.calls.every((args) => args[0] === 0),
    ).toBe(true);
    expect(
      vi
        .mocked(engine.crusher.wet.rampTo)
        .mock.calls.every((args) => args[0] === 0),
    ).toBe(true);
    expect(engine.filter.frequency.rampTo).toHaveBeenCalled();
    engine.dispose();
  });
});
