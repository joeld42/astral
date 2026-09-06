import { leadVoices } from "./voicing";
import { rng } from "./music";
import {
  bassPresets,
  varyPreset,
  padPresets,
  type PadName,
  arpPresets,
  defaultInstruments,
  type Instruments,
} from "./instruments";
import * as Tone from "tone";
import { locate, noteName, type Song, type Track } from "./music";
import { evolutionAt } from "./evolution";
export type Position = {
  section: number;
  bar: number;
  step: number;
  chord: number;
};
export class Engine {
  song: Song;
  variation: number | null = null;
  padPreset: PadName | null = null;
  bassPreset: Instruments["bass"] | null = null;
  arpPreset: Instruments["arp"] | null = null;
  onPosition: (p: Position) => void;
  onEnd: () => void;
  loopSection: string | null = null;
  queuedSection: string | null = null;
  solo: Track | null = null;
  step = 0;
  elapsed = 0;
  heldPad: number[] = [];
  playing = false;
  disposed = false;
  master = new Tone.Volume(-9);
  compressor = new Tone.Compressor({
    threshold: -24,
    ratio: 3.5,
    knee: 24,
    attack: 0.03,
    release: 0.35,
  });
  limiter = new Tone.Limiter(-1).toDestination();
  filter = new Tone.Filter(3200, "lowpass", -24);
  toneCompressor = new Tone.Compressor({
    threshold: -22,
    ratio: 4,
    knee: 18,
    attack: 0.008,
    release: 0.25,
  });
  toneGain = new Tone.Gain(0.8);
  motionHighpass = new Tone.Filter(60, "highpass", -24);
  distortion = new Tone.Distortion({
    distortion: 0.85,
    oversample: "2x",
    wet: 0,
  });
  crusher = new Tone.BitCrusher(5);
  panner = new Tone.Panner(0);
  motionGate = new Tone.Gain(1);
  fragment = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.003, decay: 0.2, sustain: 0.05, release: 1.2 },
  });
  dry = new Tone.Gain(0.65);
  wet = new Tone.Gain(0.48);
  reverb = new Tone.Reverb({ decay: 9, preDelay: 0.055, wet: 1 });
  shift = new Tone.PitchShift({
    pitch: 12,
    windowSize: 0.12,
    feedback: 0.25,
    wet: 1,
  });
  shimmerVerb = new Tone.Reverb({ decay: 12, preDelay: 0.07, wet: 1 });
  shimmerGain = new Tone.Gain(0.38);
  highpass = new Tone.Filter(350, "highpass");
  delay = new Tone.PingPongDelay({ delayTime: "8n.", feedback: 0.3, wet: 1 });
  delayGain = new Tone.Gain(0.22);
  recorder = new Tone.Recorder();
  waveform = new Tone.Waveform(128);
  pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "fatsawtooth", count: 3, spread: 18 },
    envelope: { attack: 1.5, decay: 0.8, sustain: 0.6, release: 3 },
  });
  arp = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 1.6,
    envelope: { attack: 0.02, decay: 0.7, sustain: 0.1, release: 1.5 },
  });
  bass = new Tone.MonoSynth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.08, decay: 0.4, sustain: 0.45, release: 1 },
    filterEnvelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.3,
      release: 1,
      baseFrequency: 120,
      octaves: 1.5,
    },
  });
  kick = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 5,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  });
  snare = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.04 },
  });
  hat = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 },
  });
  hatFilter = new Tone.Filter(6500, "highpass");
  drumBus = new Tone.Volume(-16);
  clock: Tone.Loop;
  constructor(
    song: Song,
    onPosition: (p: Position) => void,
    onEnd: () => void,
  ) {
    this.song = song;
    this.crusher.wet.value = 0;
    this.onPosition = onPosition;
    this.onEnd = onEnd;
    this.master.chain(this.compressor, this.limiter);
    this.limiter.connect(this.recorder);
    this.limiter.connect(this.waveform);
    this.motionHighpass.chain(
      this.distortion,
      this.crusher,
      this.filter,
      this.toneGain,
      this.toneCompressor,
      this.panner,
      this.motionGate,
    );
    this.fragment.connect(this.motionHighpass);
    this.motionGate.connect(this.dry);
    this.dry.connect(this.master);
    this.motionGate.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.wet.connect(this.master);
    this.reverb.chain(
      this.highpass,
      this.shift,
      this.shimmerVerb,
      this.shimmerGain,
      this.master,
    );
    this.motionGate.chain(this.delay, this.delayGain, this.master);
    this.pad.connect(this.motionHighpass);
    this.arp.connect(this.motionHighpass);
    this.bass.connect(this.master);
    this.kick.connect(this.drumBus);
    this.snare.connect(this.drumBus);
    this.hat.chain(this.hatFilter, this.drumBus);
    this.drumBus.connect(this.master);
    this.clock = new Tone.Loop((t) => this.tick(t), "16n");
    this.clock.start(0);
    this.reverb.decay = song.fx.decay;
    this.shimmerVerb.decay = Math.min(20, song.fx.decay + 3);
    this.update(song);
  }
  async ready() {
    await Promise.all([this.reverb.ready, this.shimmerVerb.ready]);
  }
  update(song: Song) {
    const oldDecay = this.song.fx.decay;
    this.song = song;
    const instruments = song.instruments ?? defaultInstruments;
    const pad = instruments.pad ?? "haze";
    const variation = instruments.variation ?? 0;
    const changed = variation !== this.variation;
    if (this.padPreset !== pad || changed) {
      this.pad.set(varyPreset(padPresets[pad].options, variation));
      this.padPreset = pad;
    }
    if (this.bassPreset !== instruments.bass || changed) {
      this.bass.set(
        varyPreset(
          bassPresets[instruments.bass].options,
          variation ? variation + 1 : 0,
        ),
      );
      this.bassPreset = instruments.bass;
    }
    if (this.arpPreset !== instruments.arp || changed) {
      this.arp.set(
        varyPreset(
          arpPresets[instruments.arp].options,
          variation ? variation + 2 : 0,
        ),
      );
      this.arpPreset = instruments.arp;
    }
    this.variation = variation;
    this.bass.portamento = instruments.glide;
    Tone.getTransport().bpm.rampTo(song.bpm, 0.2);
    Tone.getTransport().swing = song.swing;
    Tone.getTransport().swingSubdivision = "8n";
    this.filter.frequency.rampTo(song.fx.cutoff, 0.15);
    this.filter.Q.rampTo(song.fx.resonance, 0.15);
    this.dry.gain.rampTo(1 - song.fx.mix * 0.6, 0.2);
    this.wet.gain.rampTo(song.fx.mix, 0.2);
    this.shimmerGain.gain.rampTo(song.fx.shimmer * song.fx.mix, 0.2);
    this.delayGain.gain.rampTo(song.fx.delay, 0.2);
    this.shift.pitch = song.fx.pitch;
    this.master.volume.rampTo(song.fx.master, 0.1);
    const compression = song.fx.compression ?? 0.5;
    this.compressor.threshold.rampTo(-12 - compression * 24, 0.15);
    this.compressor.ratio.rampTo(1 + compression * 5, 0.15);
    if (song.fx.dirtEnabled === false) {
      this.distortion.wet.rampTo(0, 0.1);
      this.crusher.wet.rampTo(0, 0.1);
    }
    if (oldDecay !== song.fx.decay) {
      this.reverb.decay = song.fx.decay;
      this.shimmerVerb.decay = Math.min(20, song.fx.decay + 3);
    }
    this.pad.volume.rampTo(song.volumes.pad + padPresets[pad].trim - 2, 0.1);
    this.fragment.volume.rampTo(song.volumes.arp - 3, 0.1);
    this.arp.volume.rampTo(
      song.volumes.arp + arpPresets[instruments.arp].trim,
      0.1,
    );
    this.bass.volume.rampTo(
      song.volumes.bass + bassPresets[instruments.bass].trim + 6,
      0.1,
    );
    this.drumBus.volume.rampTo(song.volumes.drums, 0.1);
    if (
      this.loopSection &&
      !song.sections.some((s) => s.id === this.loopSection)
    )
      this.loopSection = null;
  }
  start() {
    this.playing = true;
    Tone.getTransport().start("+0.05");
  }
  pause() {
    this.playing = false;
    Tone.getTransport().pause();
    this.pad.releaseAll();
    this.heldPad = [];
    this.arp.releaseAll();
    this.fragment.releaseAll();
    this.delay.feedback.rampTo(0.3, 0.1);
    this.motionGate.gain.rampTo(1, 0.05);
    this.distortion.wet.rampTo(0, 0.1);
    this.crusher.wet.rampTo(0, 0.1);
    this.bass.triggerRelease();
  }
  stop() {
    this.pause();
    Tone.getTransport().stop();
    this.step = 0;
    this.elapsed = 0;
    this.queuedSection = null;
  }
  tick(time: number) {
    const total = this.song.sections.reduce((a, s) => a + s.bars, 0) * 16;
    const before = locate(this.song.sections, Math.floor(this.step / 16));
    if (this.step % 16 === 0) {
      if (this.queuedSection) {
        const index = this.song.sections.findIndex(
          (s) => s.id === this.queuedSection,
        );
        if (index >= 0)
          this.step =
            this.song.sections.slice(0, index).reduce((a, s) => a + s.bars, 0) *
            16;
        this.queuedSection = null;
      } else if (this.loopSection) {
        const index = this.song.sections.findIndex(
          (s) => s.id === this.loopSection,
        );
        if (
          index >= 0 &&
          (this.step >= total ||
            this.song.sections[before.index].id !== this.loopSection)
        ) {
          this.step =
            this.song.sections.slice(0, index).reduce((a, s) => a + s.bars, 0) *
            16;
        }
      }
    }
    if (this.step >= total) {
      Tone.getDraw().schedule(() => {
        this.stop();
        this.onEnd();
      }, time);
      return;
    }
    const position = locate(this.song.sections, Math.floor(this.step / 16));
    const s = this.song.sections[position.index];
    const beat = this.step % 16;
    const localStep = position.bar * 16 + beat;
    const events = evolutionAt(this.song, s, localStep, this.elapsed);
    const chordIndex = events.harmony.index;
    const active = (t: Track) => s.tracks[t] && (!this.solo || this.solo === t);
    const velocity = s.energy * 0.55 + 0.15;
    const stepSeconds = 60 / this.song.bpm / 4;
    if (!active("pad") && this.heldPad.length) {
      this.pad.releaseAll(time);
      this.heldPad = [];
    }
    if (active("pad") && (events.harmony.onset || !this.heldPad.length)) {
      const next = leadVoices(events.notes, this.heldPad);
      const variation = rng(
        this.song.seed ^
          (s.texture?.evolve === false ? localStep : this.elapsed) ^
          (s.texture?.salt ?? 0),
      );
      // Common tones stay held; arrivals and departures overlap rather than
      // restarting the complete chord on a grid boundary.
      for (const note of this.heldPad)
        if (!next.includes(note))
          this.pad.triggerRelease(
            noteName(note),
            time + 0.1 + variation() * stepSeconds * 2,
          );
      for (const note of next)
        if (!this.heldPad.includes(note))
          this.pad.triggerAttack(
            noteName(note),
            time + variation() * stepSeconds * 2,
            velocity * (0.7 + variation() * 0.3),
          );
      this.heldPad = next;
    }
    if (beat % 2 === 0) {
      const a = events.automation;
      const ramp = Math.max(0.45, stepSeconds * 4);
      this.filter.frequency.rampTo(a.cutoff, ramp, time);
      this.filter.Q.rampTo(a.resonance, ramp, time);
      this.toneGain.gain.rampTo(
        1 / Math.sqrt(1 + a.resonance * 0.4),
        ramp,
        time,
      );
      this.motionHighpass.frequency.rampTo(a.highpass, ramp, time);
      this.distortion.wet.rampTo(
        this.song.fx.dirtEnabled === false ? 0 : a.drive,
        ramp,
        time,
      );
      this.crusher.wet.rampTo(
        this.song.fx.dirtEnabled === false ? 0 : a.crush,
        ramp,
        time,
      );
      this.delay.feedback.rampTo(a.feedback, ramp, time);
      this.delay.delayTime.rampTo(a.delaySteps * stepSeconds, 0.12, time);
      this.delayGain.gain.rampTo(a.delayGain, ramp, time);
      this.motionGate.gain.rampTo(a.gate, 0.12, time);
      this.panner.pan.rampTo(a.pan, stepSeconds * 2, time);
    }
    if (active("bass") && events.bass)
      this.bass.triggerAttackRelease(
        noteName(events.bass.midi),
        events.bass.steps * stepSeconds,
        time,
        velocity * events.bass.velocity,
      );
    if (active("arp")) {
      if (events.fragment)
        this.fragment.triggerAttackRelease(
          noteName(events.fragment.midi),
          events.fragment.steps * stepSeconds,
          time,
          velocity * events.fragment.velocity,
        );
      for (const event of [events.phrase, events.accent]) {
        if (event)
          this.arp.triggerAttackRelease(
            noteName(event.midi),
            event.steps * stepSeconds,
            time,
            velocity * event.velocity,
          );
      }
    }
    if (active("drums")) {
      if (s.pattern[0][beat])
        this.kick.triggerAttackRelease("C1", "8n", time, velocity);
      if (s.pattern[1][beat])
        this.snare.triggerAttackRelease("16n", time, velocity * 0.45);
      if (s.pattern[2][beat])
        this.hat.triggerAttackRelease("32n", time, velocity * 0.28);
    }
    Tone.getDraw().schedule(() => {
      if (this.playing && !this.disposed)
        this.onPosition({
          section: position.index,
          bar: position.bar,
          step: beat,
          chord: chordIndex,
        });
    }, time);
    this.step++;
    this.elapsed++;
  }
  async record() {
    await this.recorder.start();
  }
  async finishRecord() {
    return this.recorder.stop();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.clock.dispose();
    [
      this.toneCompressor,
      this.toneGain,
      this.motionHighpass,
      this.distortion,
      this.crusher,
      this.panner,
      this.motionGate,
      this.fragment,
      this.pad,
      this.arp,
      this.bass,
      this.kick,
      this.snare,
      this.hat,
      this.hatFilter,
      this.drumBus,
      this.filter,
      this.dry,
      this.wet,
      this.reverb,
      this.shift,
      this.shimmerVerb,
      this.shimmerGain,
      this.highpass,
      this.delay,
      this.delayGain,
      this.compressor,
      this.master,
      this.limiter,
      this.recorder,
      this.waveform,
    ].forEach((n) => n.dispose());
  }
}
export async function unlock() {
  await Tone.start();
}
