# Astral

## Dials and chord editing

Generated progressions keep quality **In key** and randomly choose root-only, skeleton, or full voicing. The song-wide **Distortion / bitcrush** switch in Sound & evolution disables both dirt effects while retaining filter, delay, pan, and other movement. It is saved with the project; existing projects default to enabled.

All continuous controls use rotary dials. Drag upward/right to increase, hold Shift while dragging for fine adjustment, use arrow keys (Home/End for limits), or type an exact value below the label.

Each chord has two dice buttons. **All** rerolls root degree, quality, extension, inversion, voicing, and duration. **Keep root** preserves degree and duration while rerolling the other chord settings. Explicit qualities can introduce notes outside the selected mode; **In key** retains diatonic chord construction.

Voicing choices are **Root only**, **Skeleton**, and **Full chord**. Skeleton keeps the harmonic root and final chord tone before applying inversion: fifth for a triad, seventh for a seventh chord, ninth for a ninth chord. Root-only has no inversion; skeleton has root position and first inversion. Chord symbols describe the underlying harmony even when fewer notes sound. These choices affect pad and chord-derived particle notes; the independent modal fragments remain scale-based. Existing projects default to full diatonic chords.

A local ambient / electronic music workstation for making game soundtracks. Built with TypeScript, React, Tone.js 15, DaisyUI 5, Tailwind CSS 4, Vite 8, and Yarn 4. Mixolydian is available in the mode selector and random song generation. All synthesis runs in your browser; no audio samples, account, or backend required.

## Run

Use Node.js 22.12+ (or a newer supported release) and Yarn 4:

```sh
cd ~/Projects/astral
yarn install
yarn dev
```

Open the URL printed by Vite and press **Play** to enable audio. Start at a comfortable playback volume.

```sh
yarn build       # Type-check and production build in dist/
yarn preview     # Serve the production build locally
yarn test        # Musical and scheduler regression tests
yarn format      # Format source and configuration
```

## Workflow

1. **Generate a song** creates an asymmetric arrangement with 5–13 bars per passage: Arrival, Drift, Bloom, Suspension, Return, Dissolve. A seed determines the key, mode, tempo, harmony, and drum variations. Generating replaces the current project; save a project file to keep alternate takes.
2. **Select a section** to change its name, duration, energy, and enabled layers. Add, remove, or move sections to reshape the arrangement. Selection is independent of the playhead.
3. **Edit harmony** using diatonic scale degrees, triads/sevenths/ninths, and inversions. Actual chord symbols and voiced note names remain visible. Each chord has an editable hold of 1–16 quarter-note beats. The harmonic cycle repeats independently of bar lines; new songs use unequal holds and varied harmony across passages. Global key/mode changes transpose and reharmonize every section diatonically.
4. **Edit rhythm** with the 16-step kick, snare, and hi-hat grid. The pattern repeats once per bar. The Enable drums switch enables drums for the selected section. Generated opening sections intentionally have drums disabled; saved steps are dimmed while muted. Hear this pattern enables drums, clears solo, and loops the selected section (launching at the next bar during playback). Swing applies to alternate eighth notes. Energy controls velocity; layer switches control density.
5. **Perform live** with quantized section launches and loops. Launch next bar jumps at a bar boundary. Loop section launches the selected section on the next bar and repeats it. Releasing the loop resumes the arrangement. Launching a different section while looping moves the loop to that section. Pause preserves the sequence position; Stop rewinds. S solos a layer, subject to the section's enabled layers.
6. **Shape the space** with reverb mix, decay, shimmer level, pitch interval (+7/+12/+19/+24 semitones), low-pass cutoff, resonance, and dotted-eighth stereo delay. Mixer gains and effects are global. Tone.js ramps continuous gain/frequency controls to reduce clicks.
7. **Record** captures the live master output, including your edits and effects. Finish recording downloads the browser's supported audio container (typically WebM/Opus, or M4A on Safari). At the song's end, allow the reverb tails to ring before finishing the recording. Convert the downloaded recording to WAV/OGG with your audio editor when required by your game engine. Offline WAV/stem export and seamless rendered-loop trimming are not implemented.
8. **Save project** downloads a portable `.astral.json` file; Open restores it after validation. Your current project is also autosaved in this browser's local storage. Clearing browser data clears that autosave. No cloud sync.

## Sound design

- **Atmosphere:** polyphonic, detuned sawtooth pad with slow attack and release.
- **Particles:** short seeded FM motifs separated by rests, with occasional high-register accents.
- **Sub orbit:** filtered triangle mono bass with sparse roots, wandering chord/passing tones, or a tonic pedal.
- **Pulse:** synthesized membrane kick and filtered noise percussion.

Pad, particle and fragment layers feed a moving high-pass, parallel-wet distortion and bitcrusher stages, resonant low-pass, stereo pan, and rhythmic gain gate, then parallel dry, stereo convolution reverb, and dotted-eighth ping-pong delay paths. Reverb also feeds a high-pass filter, pitch shifter with bounded feedback, and a second long stereo reverb. That creates a dense rising shimmer inspired by spacious hardware reverbs, **not an emulation of Strymon's proprietary BigSky algorithms**. Bass and drums bypass the shared filter and space effects to keep low-end definition. A master gain, adjustable soft-knee compressor, and −1 dB limiter sit before output/recording. Master compression defaults to 50%, with a 30 ms attack and 350 ms release. The amount adjusts threshold and ratio; zero sets a neutral 1:1 ratio. All layers and effect returns pass through it, with no automatic makeup gain.

Convolution impulses are generated by Tone.js and may vary between audio-engine instances; seeds reproduce the composition rather than bit-identical audio. Long impulse responses and multiple synth voices can be demanding on mobile hardware. Decay changes regenerate the impulse response. Audio starts only after a user gesture; browser background throttling/device suspension can affect live playback and recording. There is no microphone recording, MIDI input, arbitrary meter, or multitrack overdubbing in this version.

## Instrument bank

**Instruments · whole song**, inside Bass & evolution, selects timbres independently of per-section note behavior. Bass choices are Soft triangle, Trance stack (five detuned saws), Wide Reese (slower, wider saw beating), Pulse drive (moving pulse width), and FM growl. Particle/arp choices are Glass bells, Neon pluck, Alien metal, Velvet keys, and Acid sparks. The latter use different carrier/modulator waveforms, FM ratios, modulation depths, and envelopes.

Pads now include Analog haze, AM ghost choir, PWM ribbons, FM ice field, and Detuned cloud, with distinct oscillator behavior and envelopes. Pad changes use nearby octave placements, hold common tones, and stagger new voices and outgoing releases. Rhythmic gates move the sustained pad rather than restarting the full chord. A separate plucked triangle voice inserts generated modal fragments alongside the FM motifs (both follow the Particles layer switch and level).

New songs choose pad, bass, and arp instruments from the seeded generator. **Shuffle sounds** chooses different pad, bass, and arp presets without changing the composition or glide. Instruments are stored once per song and saved in project files; old files retain triangle bass and glass FM defaults. Brighter patches include level trims, while the mixer remains available for balancing.

**Bass portamento** is 0–1000 ms (zero is off). Tone.js glides when a new note arrives while the previous envelope is still audible; it does not sweep into a note after silence. Try Wandering phrases, increased density/movement, Trance stack or Wide Reese, and 150–300 ms glide. Pedal notes remain on the same pitch, so portamento is primarily useful for moving bass.

## Bass & evolution

For an existing project, select a passage and click **Unsettle section** to randomize its chord holds and phrase seed while preserving chord degrees and the drum grid. Old project files remain compatible; omitted chord holds mean four beats.

**Bass density** controls how often eligible notes play (zero silences bass). **Bass movement** adds occasional offbeat motion; Wandering phrases uses more passing and chord tones than Sparse roots. Tonic pedal alternates sustained anchors, eighth-note pulse passages, and occasional modal walks. Movement zero keeps it strictly anchored; higher movement allows departures that return to the tonic. Enable bass and use Solo bass to audition it.

**Particle phrases** controls the likelihood of motifs with rates from sixteenth notes to half notes, omitted notes, and occasional longer holds; **High accents** adds occasional upper-register notes. Both use the Particles layer, which must be enabled. **Signal adventure** controls generated resonant filter sweeps, high-pass thinning, rhythmic gates, stereo movement, changing delay times/feedback, and occasional distortion/bitcrush passages. Each 16-beat scene reserves its final four beats for recovery: dirt fades out, gates reopen, and feedback recedes. At zero, automated modulation and destruction are off. Feedback is bounded at 0.88 and the master limiter remains active. All these settings are stored per section; mixer levels remain global.

**Evolve on each loop** uses elapsed performance steps to change phrase, bass, and accent decisions each pass. Turn it off to repeat the same section decisions. Stop resets that performance clock; Pause preserves it. Reroll evolution changes the stored variation seed without changing chord timing. Identical seeds and playback paths reproduce note decisions, not bit-identical audio or effect tails. Drum steps remain exactly as edited.

## Source layout

- `src/music.ts`: serializable song model, seeded generation, theory helpers, import validation.
- `src/voicing.ts`: pitch-class-preserving nearest-register pad voice leading.
- `src/instruments.ts`: song-wide bass/arp preset definitions, levels, and default instrument settings.
- `src/evolution.ts`: pure, seeded harmony timing, bass, phrase/accent, and filter drift decisions.
- `src/engine.ts`: Tone.js graph and sixteenth-note scheduler, quantized launches, looping, and recording.
- `src/App.tsx`: arrangement, harmony, sequencer, mixer, effects, persistence, and transport UI.
- `src/style.css`: DaisyUI theme, responsive workstation styling.
- `src/webmcp.ts`: optional feature-detected read/replace project tools for supporting browsers. Project replacement stops playback and is blocked during recording.

The pure music tests cover seed reproducibility, modal voicings across all keys/modes, import validation, and section boundaries. Audio scheduler tests use mocked Tone nodes to verify events, solo behavior, loop/launch quantization, song completion, and live parameter routing; they do not assess audible quality. The optional project tool contract has an in-memory registry test; it has not been verified in a browser that implements WebMCP. The production TypeScript/Vite build is also checked. Manual listening and cross-browser recording verification remain useful before production use.

Official audio API reference: https://tonejs.github.io/docs/

## Filter dynamics and timbre variations

Filter automation uses at least 450 ms ramps, reduced automatic resonance (maximum Q 3.5), resonance gain compensation, and a dedicated 4:1 compressor on the melodic texture bus before the effect sends. Delay-send boosts are smaller. A smooth rising or falling sweep spans the entire section and is blended with faster modulation; its direction follows the section's variation seed.

Bass has 6 dB more gain relative to its previous preset level, pads are 2 dB lower, and the texture high-pass floor is 120 Hz, creating more low-end space. Existing mixer settings still apply.

The pad bank also includes Soft organ (custom harmonics), Slow brass, and Harmonic glass. **Vary timbres** keeps the chosen instruments but varies detune, envelope times, and applicable oscillator spread/modulation settings slightly. These variations are repeatable, saved per song, and applied only when the sound or variation seed changes. New songs and Shuffle sounds generate a fresh variation seed.
