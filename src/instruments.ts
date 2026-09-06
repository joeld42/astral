import type * as Tone from "tone";
export const bassNames = {
  sub: "Soft triangle",
  trance: "Trance stack",
  reese: "Wide Reese",
  pulse: "Pulse drive",
  fm: "FM growl",
} as const;
export const arpNames = {
  glass: "Glass bells",
  pluck: "Neon pluck",
  metal: "Alien metal",
  soft: "Velvet keys",
  acid: "Acid sparks",
} as const;
export const padNames = {
  haze: "Analog haze",
  choir: "AM ghost choir",
  ribbons: "PWM ribbons",
  ice: "FM ice field",
  cloud: "Detuned cloud",
  organ: "Soft organ",
  brass: "Slow brass",
  shimmer: "Harmonic glass",
} as const;
export type PadName = keyof typeof padNames;
export type Instruments = {
  pad?: PadName;
  bass: keyof typeof bassNames;
  arp: keyof typeof arpNames;
  glide: number;
  variation?: number;
};
export const defaultInstruments: Instruments = {
  pad: "haze",
  bass: "sub",
  arp: "glass",
  glide: 0,
};
type BassOptions = NonNullable<ConstructorParameters<typeof Tone.MonoSynth>[0]>;
type ArpOptions = NonNullable<ConstructorParameters<typeof Tone.FMSynth>[0]>;
export const bassPresets: Record<
  Instruments["bass"],
  { trim: number; options: BassOptions }
> = {
  sub: {
    trim: 0,
    options: {
      oscillator: { type: "triangle" },
      filter: { type: "lowpass", Q: 1, rolloff: -24 },
      envelope: { attack: 0.08, decay: 0.4, sustain: 0.45, release: 1 },
      filterEnvelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.3,
        release: 1,
        baseFrequency: 120,
        octaves: 1.5,
      },
    },
  },
  trance: {
    trim: -5,
    options: {
      oscillator: { type: "fatsawtooth", count: 5, spread: 28 },
      filter: { type: "lowpass", Q: 1.8, rolloff: -24 },
      envelope: { attack: 0.015, decay: 0.3, sustain: 0.7, release: 0.7 },
      filterEnvelope: {
        attack: 0.015,
        decay: 0.5,
        sustain: 0.35,
        release: 0.8,
        baseFrequency: 190,
        octaves: 3.2,
      },
    },
  },
  reese: {
    trim: -5,
    options: {
      oscillator: { type: "fatsawtooth", count: 3, spread: 48 },
      filter: { type: "lowpass", Q: 0.8, rolloff: -24 },
      envelope: { attack: 0.12, decay: 0.5, sustain: 0.8, release: 1.8 },
      filterEnvelope: {
        attack: 0.7,
        decay: 0.8,
        sustain: 0.6,
        release: 1.7,
        baseFrequency: 130,
        octaves: 2.8,
      },
    },
  },
  pulse: {
    trim: -6,
    options: {
      oscillator: { type: "pwm", modulationFrequency: 0.35 },
      filter: { type: "lowpass", Q: 2.5, rolloff: -24 },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 1 },
      filterEnvelope: {
        attack: 0.04,
        decay: 0.7,
        sustain: 0.25,
        release: 1,
        baseFrequency: 180,
        octaves: 3,
      },
    },
  },
  fm: {
    trim: -7,
    options: {
      oscillator: {
        type: "fmsawtooth",
        harmonicity: 0.5,
        modulationIndex: 3,
        modulationType: "sine",
      },
      filter: { type: "lowpass", Q: 1.2, rolloff: -24 },
      envelope: { attack: 0.025, decay: 0.4, sustain: 0.6, release: 1.2 },
      filterEnvelope: {
        attack: 0.3,
        decay: 0.6,
        sustain: 0.4,
        release: 1.3,
        baseFrequency: 160,
        octaves: 3,
      },
    },
  },
};
export const arpPresets: Record<
  Instruments["arp"],
  { trim: number; options: ArpOptions }
> = {
  glass: {
    trim: 0,
    options: {
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      harmonicity: 2,
      modulationIndex: 1.6,
      envelope: { attack: 0.02, decay: 0.7, sustain: 0.1, release: 1.5 },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.6,
        sustain: 0.1,
        release: 1,
      },
    },
  },
  pluck: {
    trim: -3,
    options: {
      oscillator: { type: "sawtooth" },
      modulation: { type: "triangle" },
      harmonicity: 1,
      modulationIndex: 0.6,
      envelope: { attack: 0.003, decay: 0.25, sustain: 0.03, release: 0.5 },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.3,
      },
    },
  },
  metal: {
    trim: -5,
    options: {
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      harmonicity: 3.47,
      modulationIndex: 7,
      envelope: { attack: 0.003, decay: 1.2, sustain: 0.05, release: 2.5 },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.8,
        sustain: 0.15,
        release: 2,
      },
    },
  },
  soft: {
    trim: 0,
    options: {
      oscillator: { type: "triangle" },
      modulation: { type: "sine" },
      harmonicity: 1,
      modulationIndex: 0.3,
      envelope: { attack: 0.15, decay: 0.7, sustain: 0.25, release: 2 },
      modulationEnvelope: {
        attack: 0.2,
        decay: 0.7,
        sustain: 0.1,
        release: 1.5,
      },
    },
  },
  acid: {
    trim: -6,
    options: {
      oscillator: { type: "square" },
      modulation: { type: "sawtooth" },
      harmonicity: 0.5,
      modulationIndex: 2.5,
      envelope: { attack: 0.005, decay: 0.18, sustain: 0.1, release: 0.6 },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.25,
      },
    },
  },
};

type PadOptions = NonNullable<ConstructorParameters<typeof Tone.Synth>[0]>;
export const padPresets: Record<
  PadName,
  { trim: number; options: PadOptions }
> = {
  organ: {
    trim: -3,
    options: {
      oscillator: { type: "custom", partials: [1, 0.5, 0.25, 0.08] },
      envelope: { attack: 0.35, decay: 0.7, sustain: 0.7, release: 3 },
    },
  },
  brass: {
    trim: -6,
    options: {
      oscillator: { type: "fatsquare", count: 3, spread: 12 },
      envelope: { attack: 2, decay: 0.9, sustain: 0.45, release: 4 },
    },
  },
  shimmer: {
    trim: -5,
    options: {
      oscillator: {
        type: "fmsine",
        harmonicity: 3,
        modulationIndex: 0.7,
        modulationType: "sine",
      },
      envelope: { attack: 0.6, decay: 2, sustain: 0.35, release: 5 },
    },
  },
  haze: {
    trim: 0,
    options: {
      oscillator: { type: "fatsawtooth", count: 3, spread: 18 },
      envelope: { attack: 1.5, decay: 0.8, sustain: 0.6, release: 3 },
    },
  },
  choir: {
    trim: -2,
    options: {
      oscillator: { type: "amsine", harmonicity: 1.5, modulationType: "sine" },
      envelope: { attack: 0.8, decay: 1.8, sustain: 0.7, release: 5 },
    },
  },
  ribbons: {
    trim: -5,
    options: {
      oscillator: { type: "pwm", modulationFrequency: 0.17 },
      envelope: { attack: 0.45, decay: 1.2, sustain: 0.55, release: 3.5 },
    },
  },
  ice: {
    trim: -5,
    options: {
      oscillator: {
        type: "fmsine",
        harmonicity: 2.01,
        modulationIndex: 3,
        modulationType: "triangle",
      },
      envelope: { attack: 0.15, decay: 2, sustain: 0.25, release: 4 },
    },
  },
  cloud: {
    trim: -5,
    options: {
      oscillator: { type: "fattriangle", count: 5, spread: 55 },
      envelope: { attack: 2.2, decay: 1, sustain: 0.8, release: 6 },
    },
  },
};

/** Small reproducible variations; never mutate the shared preset bank. */
export function varyPreset<T extends object>(options: T, seed: number): T {
  const result = structuredClone(options);
  if (seed === 0) return Object.assign(result, { detune: 0 });
  let state = seed | 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
  const v = result as {
    detune?: number;
    envelope?: Record<string, unknown>;
    oscillator?: Record<string, unknown>;
    filterEnvelope?: Record<string, unknown>;
    harmonicity?: number;
    modulationIndex?: number;
  };
  v.detune = (random() - 0.5) * 8;
  for (const group of [v.envelope, v.filterEnvelope])
    if (group)
      for (const key of ["attack", "decay", "release"]) {
        const value = group[key];
        if (typeof value === "number")
          group[key] = value * (0.8 + random() * 0.4);
      }
  if (v.oscillator)
    for (const key of ["spread", "modulationFrequency", "modulationIndex"]) {
      const value = v.oscillator[key];
      if (typeof value === "number")
        v.oscillator[key] = value * (0.85 + random() * 0.3);
    }
  if (v.modulationIndex !== undefined)
    v.modulationIndex *= 0.85 + random() * 0.3;
  return result;
}
