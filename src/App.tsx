import {
  bassNames,
  padNames,
  type PadName,
  arpNames,
  defaultInstruments,
  type Instruments,
} from "./instruments";
import { useEffect, useRef, useState } from "react";
import Range from "./Dial";
import { flushSync } from "react-dom";
import { registerProjectTools } from "./webmcp";
import {
  Activity,
  Dices,
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  HelpCircle,
  Infinity as InfinityIcon,
  Layers,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import {
  generateSong,
  randomizeChord,
  qualities,
  defaultTexture,
  type Texture,
  chordName,
  chordMidi,
  noteName,
  roman,
  keys,
  modes,
  tracks,
  trackNames,
  makePattern,
  isSong,
  type Song,
  type Section,
  type Track,
  type Mode,
} from "./music";
import { Engine, unlock, type Position } from "./engine";
const storageKey = "astral-song-v1";
function initial() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (isSong(saved)) return saved;
  } catch {}
  return generateSong(84291);
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function Scope({
  engine,
  playing,
}: {
  engine: Engine | null;
  playing: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const w = c.width,
        h = c.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#26342e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      const values = engine?.waveform.getValue();
      ctx.strokeStyle = "#c8f397";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 128; i++) {
        const y = h / 2 + (playing && values ? Number(values[i]) * h * 2 : 0);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo((i * w) / 127, y);
      }
      ctx.stroke();
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [engine, playing]);
  return (
    <canvas
      ref={canvas}
      width="400"
      height="64"
      aria-label="Live audio waveform"
    />
  );
}
export default function App() {
  const [song, setSong] = useState<Song>(initial),
    [selected, setSelected] = useState(0),
    [position, setPosition] = useState<Position>({
      section: 0,
      bar: 0,
      step: 0,
      chord: 0,
    }),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [loop, setLoop] = useState<string | null>(null),
    [solo, setSolo] = useState<Track | null>(null),
    [recording, setRecording] = useState(false),
    [message, setMessage] = useState(""),
    [help, setHelp] = useState(false),
    [queued, setQueued] = useState<string | null>(null);
  const engine = useRef<Engine | null>(null),
    file = useRef<HTMLInputElement>(null),
    current = useRef(song);
  current.current = song;
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  const helpDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (help) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [help]);
  useEffect(
    () =>
      registerProjectTools(
        () => current.current,
        (next) => {
          if (recordingRef.current)
            throw new Error("Finish recording before replacing the project.");
          engine.current?.stop();
          if (engine.current) {
            engine.current.loopSection = null;
            engine.current.solo = null;
          }
          flushSync(() => {
            setSong(next);
            setSelected(0);
            setPlaying(false);
            setLoop(null);
            setSolo(null);
            setQueued(null);
            setPosition({ section: 0, bar: 0, step: 0, chord: 0 });
          });
        },
      ),
    [],
  );
  const section = song.sections[Math.min(selected, song.sections.length - 1)];
  const instruments = song.instruments ?? defaultInstruments;
  const editInstruments = (changes: Partial<Instruments>) =>
    setSong((s) => ({
      ...s,
      instruments: { ...(s.instruments ?? defaultInstruments), ...changes },
    }));
  const texture = section.texture ?? defaultTexture;
  const editTexture = (patch: Partial<Texture>) =>
    edit({ texture: { ...texture, ...patch } });
  const unsettle = () =>
    edit({
      chords: section.chords.map((c) => ({
        ...c,
        beats: [2, 3, 5, 7, 8, 12][Math.floor(Math.random() * 6)],
      })),
      texture: {
        ...texture,
        salt: Math.floor(Math.random() * 2147483647),
        evolve: true,
      },
    });
  const totalBars = song.sections.reduce((sum, s) => sum + s.bars, 0);
  const seconds = (totalBars * 240) / song.bpm;
  useEffect(() => {
    engine.current?.update(song);
    try {
      localStorage.setItem(storageKey, JSON.stringify(song));
    } catch {
      setMessage(
        "Local storage is unavailable. Save a project file to keep your work.",
      );
    }
  }, [song]);
  useEffect(
    () => () => {
      engine.current?.dispose();
      engine.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  const patch = (p: Partial<Song>) => setSong((s) => ({ ...s, ...p }));
  const edit = (p: Partial<Section>) =>
    setSong((s) => ({
      ...s,
      sections: s.sections.map((x) =>
        x.id === section.id ? { ...x, ...p } : x,
      ),
    }));
  const fx = (key: keyof Song["fx"], value: number) =>
    setSong((s) => ({ ...s, fx: { ...s.fx, [key]: value } }));
  async function hearPattern() {
    if (busy) return;
    setBusy(true);
    try {
      const e = await getEngine();
      const next = {
        ...current.current,
        sections: current.current.sections.map((s) =>
          s.id === section.id
            ? { ...s, tracks: { ...s.tracks, drums: true } }
            : s,
        ),
      };
      setSong(next);
      e.update(next);
      e.solo = null;
      setSolo(null);
      e.loopSection = section.id;
      e.queuedSection = section.id;
      setLoop(section.id);
      setQueued(section.id);
      if (!e.playing) e.start();
      setPlaying(true);
    } catch (error) {
      setMessage("Could not preview drums: " + String(error));
    } finally {
      setBusy(false);
    }
  }
  async function getEngine() {
    await unlock();
    if (!engine.current) {
      const e = new Engine(
        current.current,
        (p) => {
          setPosition(p);
          setQueued(engine.current?.queuedSection ?? null);
        },
        () => {
          setPlaying(false);
          setPosition({ section: 0, bar: 0, step: 0, chord: 0 });
          setMessage("Song complete. Reverb tails are still ringing.");
        },
      );
      engine.current = e;
      await e.ready();
    }
    return engine.current;
  }
  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const e = await getEngine();
      if (e.playing) {
        e.pause();
        setPlaying(false);
      } else {
        e.start();
        setPlaying(true);
      }
    } catch (err) {
      setMessage("Could not start audio: " + String(err));
    } finally {
      setBusy(false);
    }
  }
  function stop() {
    engine.current?.stop();
    setPlaying(false);
    setPosition({ section: 0, bar: 0, step: 0, chord: 0 });
    setQueued(null);
  }
  async function record() {
    if (busy) return;
    setBusy(true);
    try {
      const e = await getEngine();
      if (recording) {
        const blob = await e.finishRecord();
        download(
          blob,
          `${song.name}.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`,
        );
        setRecording(false);
        setMessage("Recording downloaded, including the live effects.");
      } else {
        await e.record();
        setRecording(true);
        if (!e.playing) {
          e.start();
          setPlaying(true);
        }
      }
    } catch (err) {
      setMessage("Recording unavailable: " + String(err));
    } finally {
      setBusy(false);
    }
  }
  function generate() {
    stop();
    const next = generateSong();
    patch(next);
    setSelected(0);
    setLoop(null);
    setSolo(null);
    if (engine.current) {
      engine.current.loopSection = null;
      engine.current.solo = null;
    }
    setMessage("New song generated.");
  }
  function loopToggle() {
    const next = loop === section.id ? null : section.id;
    setLoop(next);
    if (engine.current) {
      engine.current.loopSection = next;
      if (next) engine.current.queuedSection = next;
    }
    setQueued(playing ? next : null);
  }
  useEffect(() => {
    if (engine.current) {
      engine.current.loopSection = loop;
      engine.current.solo = solo;
    }
  }, [loop, solo, playing]);
  function move(direction: number) {
    const index = selected + direction;
    if (index < 0 || index >= song.sections.length) return;
    const sections = [...song.sections];
    [sections[selected], sections[index]] = [
      sections[index],
      sections[selected],
    ];
    patch({ sections });
    setSelected(index);
  }
  async function load(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 1000000) throw Error("File too large");
      const data = JSON.parse(await f.text());
      if (!isSong(data)) throw Error("This is not a valid Astral project");
      stop();
      patch(data);
      setSelected(0);
      setLoop(null);
      setSolo(null);
      setMessage("Project loaded.");
    } catch (err) {
      setMessage(String(err));
    }
    if (file.current) file.current.value = "";
  }
  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="#">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          astral<span className="version">/ 01</span>
        </a>
        <div className="header-note">AMBIENT MUSIC LABORATORY</div>
        <div className="header-actions">
          <span className="saved">
            <i />
            Autosaved locally
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={recording}
            onClick={() => file.current?.click()}
          >
            <FolderOpen size={16} />
            Open
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() =>
              download(
                new Blob([JSON.stringify(song, null, 2)], {
                  type: "application/json",
                }),
                `${song.name}.astral.json`,
              )
            }
          >
            <Download size={15} />
            Save project
          </button>
          <button
            className="icon-button"
            aria-label="Show help"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={19} />
          </button>
          <a
            className="icon-button"
            href="https://github.com/joeld42/astral"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Astral on GitHub (opens in a new tab)"
            title="View Astral on GitHub"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.334-5.467-5.93 0-1.31.469-2.38 1.236-3.22-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.609-2.807 5.625-5.479 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.595 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
          <input
            ref={file}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => void load(e.target.files?.[0])}
          />
        </div>
      </header>
      <main>
        <div className="song-heading">
          <div>
            <div className="eyebrow">SONG</div>
            <div className="song-title-wrap" data-value={song.name}>
              <textarea
                aria-label="Song title"
                className="song-title"
                rows={1}
                value={song.name}
                maxLength={120}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div className="song-meta">
              <span className="badge">AMBIENT / ELECTRONIC</span>
              <span>Seed {song.seed}</span>
              <span>{totalBars} bars</span>
              <span>
                {Math.floor(Math.round(seconds) / 60)}:
                {String(Math.round(seconds) % 60).padStart(2, "0")} duration
              </span>
            </div>
          </div>
          <button
            className="btn generate"
            disabled={recording}
            onClick={generate}
          >
            <Shuffle size={18} />
            Generate a song
          </button>
        </div>
        <section className="transport panel">
          <div className="transport-buttons">
            <button
              className="play-button"
              aria-label={playing ? "Pause" : "Play"}
              disabled={busy}
              onClick={() => void toggle()}
            >
              {busy ? (
                <span className="loading loading-spinner loading-sm" />
              ) : playing ? (
                <Pause size={23} fill="currentColor" />
              ) : (
                <Play size={23} fill="currentColor" />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Stop and rewind"
              onClick={stop}
            >
              <Square size={17} fill="currentColor" />
            </button>
            <button
              className={`record-button ${recording ? "recording" : ""}`}
              disabled={busy}
              onClick={() => void record()}
              title="Record live output"
            >
              <span />
              {recording ? "Finish recording" : "Record"}
            </button>
          </div>
          <div className="transport-divider" />
          <label className="compact-field">
            TEMPO
            <div>
              <input
                aria-label="Tempo"
                type="number"
                min="40"
                max="160"
                value={song.bpm}
                onChange={(e) =>
                  patch({ bpm: Math.max(40, Math.min(160, +e.target.value)) })
                }
              />
              <span>BPM</span>
            </div>
          </label>
          <label className="compact-field">
            KEY
            <select
              className="select select-ghost"
              aria-label="Key"
              value={song.key}
              onChange={(e) => patch({ key: e.target.value })}
            >
              {keys.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="compact-field mode-field">
            MODE
            <select
              className="select select-ghost"
              aria-label="Mode"
              value={song.mode}
              onChange={(e) => patch({ mode: e.target.value as Mode })}
            >
              {Object.keys(modes).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <span className="time-signature">4/4</span>
          <div className="scope">
            <Scope engine={engine.current} playing={playing} />
            <span>{playing ? "SIGNAL ACTIVE" : "READY TO EXPLORE"}</span>
          </div>
          <div className="position">
            <strong>
              {String(position.bar + 1).padStart(2, "0")}
              <span> : </span>
              {Math.floor(position.step / 4) + 1}
              <span> : </span>
              {(position.step % 4) + 1}
            </strong>
            <small>
              {playing
                ? song.sections[position.section]?.name
                : "TRANSPORT STOPPED"}
            </small>
          </div>
        </section>
        <section className="arrangement panel">
          <div className="panel-heading">
            <h2>
              <Layers size={17} />
              Song structure <span>01</span>
            </h2>
            <div className="heading-actions">
              <span>Click a section to shape it</span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={song.sections.length >= 24}
                onClick={() => {
                  patch({
                    sections: [
                      ...song.sections,
                      {
                        ...structuredClone(section),
                        id: crypto.randomUUID(),
                        name: "New passage",
                      },
                    ],
                  });
                  setSelected(song.sections.length);
                }}
              >
                <Plus size={15} />
                Add section
              </button>
            </div>
          </div>
          <div className="arrangement-ruler">
            <span>01</span>
            <span>{Math.round(totalBars * 0.25) + 1}</span>
            <span>{Math.round(totalBars * 0.5) + 1}</span>
            <span>{Math.round(totalBars * 0.75) + 1}</span>
            <span>{totalBars}</span>
          </div>
          <div className="section-timeline">
            {song.sections.map((s, i) => (
              <button
                key={s.id}
                style={{ flexGrow: s.bars }}
                className={`section-block color-${i % 4} ${selected === i ? "selected" : ""} ${playing && position.section === i ? "is-playing" : ""}`}
                onClick={() => setSelected(i)}
              >
                <span className="section-number">
                  {String(i + 1).padStart(2, "0")}{" "}
                  {loop === s.id && <InfinityIcon size={14} />}
                </span>
                <strong>{s.name}</strong>
                <span className="mini-notes" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, j) => (
                    <i
                      key={j}
                      style={{
                        height: 9 + ((j * 7 + i * 11) % 23),
                        opacity: s.energy * 0.7 + 0.15,
                      }}
                    />
                  ))}
                </span>
                <small>
                  {s.bars} bars ·{" "}
                  {s.energy < 0.5
                    ? "Sparse"
                    : s.energy < 0.75
                      ? "Evolving"
                      : "Full"}
                </small>
                {playing && position.section === i && (
                  <div
                    className="section-progress"
                    style={{
                      width: `${((position.bar + position.step / 16) / s.bars) * 100}%`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="section-toolbar">
            <input
              aria-label="Section name"
              value={section.name}
              maxLength={40}
              onChange={(e) => edit({ name: e.target.value })}
            />
            <label>
              Length{" "}
              <select
                className="select select-xs"
                aria-label="Section length"
                value={section.bars}
                onChange={(e) => edit({ bars: +e.target.value })}
              >
                {[...new Set([2, 4, 8, 12, 16, 24, 32, section.bars])]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n} bars
                    </option>
                  ))}
              </select>
            </label>
            <Range
              label="Energy"
              min={10}
              max={100}
              step={5}
              unit="%"
              value={section.energy * 100}
              onChange={(v) => edit({ energy: v / 100 })}
            />
            <div className="section-tools">
              <button
                className={`btn btn-sm ${loop === section.id ? "loop-active" : "btn-ghost"}`}
                onClick={loopToggle}
              >
                <InfinityIcon size={17} />
                {loop === section.id ? "Looping section" : "Loop section"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={!playing}
                onClick={() => {
                  if (engine.current) {
                    engine.current.queuedSection = section.id;
                    setQueued(section.id);
                    if (loop) setLoop(section.id);
                  }
                }}
              >
                {queued === section.id ? "Queued…" : "Launch next bar"}
              </button>
              <button
                className="icon-button"
                aria-label="Move section earlier"
                disabled={selected === 0}
                onClick={() => move(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Move section later"
                disabled={selected === song.sections.length - 1}
                onClick={() => move(1)}
              >
                <ChevronRight size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Delete section"
                disabled={song.sections.length === 1}
                onClick={() => {
                  if (loop === section.id) setLoop(null);
                  patch({
                    sections: song.sections.filter((s) => s.id !== section.id),
                  });
                  setSelected(Math.max(0, selected - 1));
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </section>
        <div className="workspace">
          <div className="composition">
            <section className="panel harmony">
              <div className="panel-heading">
                <h2>
                  <Music2 size={17} />
                  Harmony <span>02</span>
                </h2>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    edit({
                      chords: section.chords.map((c) => ({
                        ...c,
                        degree: Math.floor(Math.random() * 7),
                      })),
                    })
                  }
                >
                  <RefreshCw size={14} />
                  Reharmonize
                </button>
              </div>
              <div className="subheading">
                <span>
                  {section.name} <ChevronRight size={12} /> Chord progression
                </span>
                <span>
                  {section.chords.reduce((sum, c) => sum + (c.beats ?? 4), 0)}
                  -beat harmonic cycle · crosses bar lines
                </span>
              </div>
              <div className="chords">
                {section.chords.map((c, i) => (
                  <div
                    key={i}
                    className={`chord-card ${playing && position.section === selected && position.chord === i ? "current" : ""}`}
                  >
                    <div className="chord-top">
                      <span>{roman(song, c)}</span>
                      <small>0{i + 1}</small>
                    </div>
                    <div className="chord-dice">
                      <button
                        className="btn btn-xs btn-ghost"
                        aria-label={`Randomize everything for chord ${i + 1}`}
                        title="Randomize root, quality, extension, inversion, voicing and duration"
                        onClick={() =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              i === j ? randomizeChord(x) : x,
                            ),
                          })
                        }
                      >
                        <Dices size={14} />
                        All
                      </button>
                      <button
                        className="btn btn-xs btn-ghost"
                        aria-label={`Randomize chord ${i + 1} keeping root`}
                        title="Keep root and duration; vary quality, extension, inversion and voicing"
                        onClick={() =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              i === j ? randomizeChord(x, true) : x,
                            ),
                          })
                        }
                      >
                        <Dices size={14} />
                        Keep root
                      </button>
                    </div>
                    <strong>{chordName(song, c)}</strong>
                    <div className="chord-notes">
                      {chordMidi(song, c).map(noteName).join(" · ")}
                    </div>
                    <label className="chord-length">
                      Hold
                      <select
                        aria-label={`Chord ${i + 1} duration in beats`}
                        value={c.beats ?? 4}
                        onChange={(e) =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              j === i ? { ...x, beats: +e.target.value } : x,
                            ),
                          })
                        }
                      >
                        {Array.from({ length: 16 }, (_, n) => n + 1).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "beat" : "beats"}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <div className="chord-edit">
                      <select
                        aria-label={`Chord ${i + 1} degree`}
                        value={c.degree}
                        onChange={(e) =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              j === i ? { ...x, degree: +e.target.value } : x,
                            ),
                          })
                        }
                      >
                        {Array.from({ length: 7 }, (_, d) => (
                          <option key={d} value={d}>
                            {roman(song, { ...c, degree: d })}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`Chord ${i + 1} extension`}
                        value={c.extension}
                        onChange={(e) =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    extension: e.target
                                      .value as typeof c.extension,
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        <option value="triad">Triad</option>
                        <option value="7">7th</option>
                        <option value="9">9th</option>
                      </select>
                    </div>
                    <select
                      className="inversion"
                      aria-label={`Chord ${i + 1} inversion`}
                      disabled={c.voicing === "root"}
                      value={
                        c.voicing === "root"
                          ? 0
                          : c.voicing === "skeleton"
                            ? Math.min(1, c.inversion)
                            : c.inversion
                      }
                      onChange={(e) =>
                        edit({
                          chords: section.chords.map((x, j) =>
                            j === i ? { ...x, inversion: +e.target.value } : x,
                          ),
                        })
                      }
                    >
                      <option value="0">Root position</option>
                      <option value="1">1st inversion</option>
                      <option value="2" disabled={c.voicing === "skeleton"}>
                        2nd inversion
                      </option>
                    </select>
                    <label className="chord-option">
                      Quality
                      <select
                        aria-label={`Chord ${i + 1} quality`}
                        value={c.quality ?? "diatonic"}
                        onChange={(e) =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              i === j
                                ? {
                                    ...x,
                                    quality: e.target
                                      .value as keyof typeof qualities,
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        {Object.entries(qualities).map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="chord-option">
                      Voicing
                      <select
                        aria-label={`Chord ${i + 1} voicing`}
                        value={c.voicing ?? "full"}
                        onChange={(e) =>
                          edit({
                            chords: section.chords.map((x, j) =>
                              i === j
                                ? {
                                    ...x,
                                    voicing: e.target.value as
                                      "root" | "skeleton" | "full",
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        <option value="root">Root only</option>
                        <option value="skeleton">Skeleton</option>
                        <option value="full">Full chord</option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel evolution">
              <div className="panel-heading">
                <h2>
                  <Waves size={17} />
                  Sound & evolution
                </h2>
                <button className="btn btn-sm btn-outline" onClick={unsettle}>
                  <Shuffle size={14} />
                  Unsettle section
                </button>
              </div>
              <p className="evolution-note">
                {section.name} · Unsettle changes harmonic timing and rerolls
                the phrases. Signal adventure drives beat-shifted filters, dub
                feedback, stereo movement and temporary signal destruction, then
                recovery.
              </p>
              <div className="instrument-bank">
                <div className="instrument-heading">
                  <strong>Instruments · whole song</strong>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      editInstruments({
                        variation: Math.floor(Math.random() * 2147483647),
                      })
                    }
                  >
                    Vary timbres
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const bass = Object.keys(
                        bassNames,
                      ) as Instruments["bass"][];
                      const arp = Object.keys(arpNames) as Instruments["arp"][];
                      const pads = Object.keys(padNames) as PadName[];
                      editInstruments({
                        variation: Math.floor(Math.random() * 2147483647),
                        pad: pads.filter(
                          (p) => p !== (instruments.pad ?? "haze"),
                        )[Math.floor(Math.random() * (pads.length - 1))],
                        bass: bass.filter((b) => b !== instruments.bass)[
                          Math.floor(Math.random() * (bass.length - 1))
                        ],
                        arp: arp.filter((a) => a !== instruments.arp)[
                          Math.floor(Math.random() * (arp.length - 1))
                        ],
                      });
                    }}
                  >
                    <Shuffle size={14} />
                    Shuffle sounds
                  </button>
                </div>
                <div className="instrument-selectors">
                  <label>
                    Pad voice
                    <select
                      className="select select-sm"
                      aria-label="Pad instrument"
                      value={instruments.pad ?? "haze"}
                      onChange={(e) =>
                        editInstruments({ pad: e.target.value as PadName })
                      }
                    >
                      {Object.entries(padNames).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Bass synth
                    <select
                      className="select select-sm"
                      value={instruments.bass}
                      aria-label="Bass instrument"
                      onChange={(e) =>
                        editInstruments({
                          bass: e.target.value as Instruments["bass"],
                        })
                      }
                    >
                      {Object.entries(bassNames).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Particle / arp synth
                    <select
                      className="select select-sm"
                      value={instruments.arp}
                      aria-label="Arp instrument"
                      onChange={(e) =>
                        editInstruments({
                          arp: e.target.value as Instruments["arp"],
                        })
                      }
                    >
                      {Object.entries(arpNames).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Range
                  label="Bass portamento · 0 = off"
                  value={instruments.glide * 1000}
                  min={0}
                  max={1000}
                  step={10}
                  unit=" ms"
                  onChange={(v) => editInstruments({ glide: v / 1000 })}
                />
                <p>
                  Glides between bass notes while the previous note is still
                  sounding. Try Wandering phrases with more movement.
                </p>
              </div>
              <div className="bass-toolbar">
                <label>
                  <input
                    type="checkbox"
                    className="toggle toggle-xs"
                    checked={section.tracks.bass}
                    onChange={(e) =>
                      edit({
                        tracks: { ...section.tracks, bass: e.target.checked },
                      })
                    }
                  />
                  Bass enabled
                </label>
                <button
                  className={`btn btn-sm ${solo === "bass" ? "loop-active" : "btn-ghost"}`}
                  aria-pressed={solo === "bass"}
                  onClick={() => setSolo(solo === "bass" ? null : "bass")}
                >
                  Solo bass
                </button>
                <select
                  className="select select-sm"
                  aria-label="Bass behavior"
                  value={texture.bassMode}
                  onChange={(e) =>
                    editTexture({
                      bassMode: e.target.value as Texture["bassMode"],
                    })
                  }
                >
                  <option value="sparse">Sparse roots</option>
                  <option value="wander">Wandering phrases</option>
                  <option value="pedal">Tonic pedal / pulses / walks</option>
                </select>
              </div>
              <div className="evolution-controls">
                <Range
                  label="Bass density"
                  value={texture.density * 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => editTexture({ density: v / 100 })}
                />
                <Range
                  label="Bass movement"
                  value={texture.movement * 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => editTexture({ movement: v / 100 })}
                />
                <Range
                  label="Particle phrases"
                  value={texture.phrases * 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => editTexture({ phrases: v / 100 })}
                />
                <Range
                  label="High accents"
                  value={texture.accents * 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => editTexture({ accents: v / 100 })}
                />
                <Range
                  label="Signal adventure"
                  value={texture.drift * 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => editTexture({ drift: v / 100 })}
                />
                <Range
                  label="Bass level"
                  value={song.volumes.bass}
                  min={-40}
                  max={0}
                  unit=" dB"
                  onChange={(v) =>
                    patch({ volumes: { ...song.volumes, bass: v } })
                  }
                />
              </div>
              <div className="evolution-footer">
                <label>
                  <input
                    type="checkbox"
                    className="toggle toggle-xs"
                    checked={song.fx.dirtEnabled !== false}
                    onChange={(e) =>
                      patch({
                        fx: { ...song.fx, dirtEnabled: e.target.checked },
                      })
                    }
                  />
                  Distortion / bitcrush · whole song
                </label>
                <label>
                  <input
                    type="checkbox"
                    className="toggle toggle-xs"
                    checked={texture.evolve}
                    onChange={(e) => editTexture({ evolve: e.target.checked })}
                  />
                  Evolve on each loop
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    editTexture({
                      salt: Math.floor(Math.random() * 2147483647),
                    })
                  }
                >
                  <RefreshCw size={14} />
                  Reroll evolution
                </button>
              </div>
              {!section.tracks.arp && (
                <p className="evolution-note">
                  Particles are off in this section.{" "}
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() =>
                      edit({ tracks: { ...section.tracks, arp: true } })
                    }
                  >
                    Enable phrases & accents
                  </button>
                </p>
              )}
            </section>
            <section className="panel drums">
              <div className="panel-heading">
                <h2>
                  <Activity size={17} />
                  Rhythm <span>03</span>
                </h2>
                <div className="heading-actions">
                  <span className="badge">16 STEPS</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => edit({ pattern: makePattern() })}
                  >
                    <Shuffle size={14} />
                    Mutate
                  </button>
                </div>
              </div>
              <div className="drum-status">
                <span>
                  {!section.tracks.drums
                    ? `Drums are off in ${section.name}. The pattern is saved but silent.`
                    : solo && solo !== "drums"
                      ? `Drums are muted while ${trackNames[solo]} is soloed.`
                      : playing &&
                          song.sections[position.section]?.id !== section.id
                        ? `Editing ${section.name}; playing ${song.sections[position.section]?.name ?? "another section"}.`
                        : playing
                          ? `Playing drums in ${section.name}`
                          : `Drums enabled in ${section.name}. Press Play to hear them.`}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={busy}
                  onClick={() => void hearPattern()}
                >
                  <Play size={14} /> Hear this pattern
                </button>
              </div>
              <div
                className={`drum-grid ${!section.tracks.drums || (solo && solo !== "drums") ? "drum-muted" : ""}`}
              >
                <div className="step-ruler">
                  <span />
                  {Array.from({ length: 16 }, (_, i) => (
                    <small key={i}>{i % 4 === 0 ? i / 4 + 1 : "·"}</small>
                  ))}
                </div>
                {["Kick", "Snare", "Hi-hat"].map((name, row) => (
                  <div className={`drum-row drum-${row}`} key={name}>
                    <span>{name}</span>
                    {section.pattern[row].map((on, i) => (
                      <button
                        key={i}
                        aria-label={`${name} step ${i + 1}`}
                        aria-pressed={on}
                        className={`step ${on ? "on" : ""} ${i % 4 === 0 ? "beat-start" : ""} ${playing && section.tracks.drums && (!solo || solo === "drums") && position.section === selected && position.step === i ? "playhead" : ""}`}
                        onClick={() =>
                          edit({
                            pattern: section.pattern.map((r, j) =>
                              j === row
                                ? r.map((v, k) => (k === i ? !v : v))
                                : r,
                            ),
                          })
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="rhythm-footer">
                <label>
                  <input
                    type="checkbox"
                    className="toggle toggle-xs"
                    checked={section.tracks.drums}
                    onChange={(e) =>
                      edit({
                        tracks: { ...section.tracks, drums: e.target.checked },
                      })
                    }
                  />
                  Enable drums in {section.name}
                </label>
                <Range
                  label="Swing"
                  min={0}
                  max={50}
                  unit="%"
                  value={song.swing * 100}
                  onChange={(v) => patch({ swing: v / 100 })}
                />
              </div>
            </section>
            <section className="panel mixer">
              <div className="panel-heading">
                <h2>
                  <SlidersHorizontal size={17} />
                  Layers <span>04</span>
                </h2>
                <span className="muted">
                  Instrumentation for {section.name}
                </span>
              </div>
              <div className="mixer-tracks">
                {tracks.map((t, i) => (
                  <div className={`mixer-track track-${i}`} key={t}>
                    <div className="track-top">
                      <span className="track-dot" />
                      <strong>{trackNames[t]}</strong>
                      <button
                        className={`solo ${solo === t ? "active" : ""}`}
                        aria-label={`Solo ${trackNames[t]}`}
                        aria-pressed={solo === t}
                        onClick={() => setSolo(solo === t ? null : t)}
                      >
                        S
                      </button>
                      <input
                        aria-label={`Enable ${trackNames[t]}`}
                        className="toggle toggle-xs"
                        type="checkbox"
                        checked={section.tracks[t]}
                        onChange={(e) =>
                          edit({
                            tracks: {
                              ...section.tracks,
                              [t]: e.target.checked,
                            },
                          })
                        }
                      />
                    </div>
                    <small>
                      {
                        [
                          padNames[instruments.pad ?? "haze"],
                          arpNames[instruments.arp],
                          bassNames[instruments.bass],
                          "Electronic percussion",
                        ][i]
                      }
                    </small>
                    <Range
                      label="Level"
                      value={song.volumes[t]}
                      min={-40}
                      max={0}
                      unit=" dB"
                      onChange={(v) =>
                        patch({ volumes: { ...song.volumes, [t]: v } })
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside className="panel effects">
            <div className="panel-heading">
              <h2>
                <Sparkles size={17} />
                Space & texture <span>05</span>
              </h2>
              <span className="signal-dot" />
            </div>
            <div className="shimmer-hero">
              <div className="reverb-emblem">
                <Waves size={49} strokeWidth={0.8} />
                <span className="orbit orbit-one" />
                <span className="orbit orbit-two" />
              </div>

              <h3>Shimmer reverb</h3>
            </div>
            <div className="fx-content">
              <div className="preset-row">
                <span>SPACE</span>
                <select
                  className="select select-sm"
                  aria-label="Reverb preset"
                  value="custom"
                  onChange={(e) => {
                    const presets: Record<string, Partial<Song["fx"]>> = {
                      nebula: { mix: 0.48, decay: 9, shimmer: 0.38, pitch: 12 },
                      glacier: {
                        mix: 0.62,
                        decay: 15,
                        shimmer: 0.6,
                        pitch: 24,
                      },
                      chamber: { mix: 0.25, decay: 4, shimmer: 0.16, pitch: 7 },
                    };
                    if (presets[e.target.value])
                      patch({ fx: { ...song.fx, ...presets[e.target.value] } });
                  }}
                >
                  <option value="custom">Custom space</option>
                  <option value="nebula">Nebula · octave bloom</option>
                  <option value="glacier">Glacier · endless light</option>
                  <option value="chamber">Chamber · soft fifth</option>
                </select>
              </div>
              <Range
                label="Reverb mix"
                value={song.fx.mix * 100}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => fx("mix", v / 100)}
              />
              <Range
                label="Decay"
                value={song.fx.decay}
                min={1}
                max={18}
                step={0.5}
                unit=" s"
                onChange={(v) => fx("decay", v)}
              />
              <Range
                label="Shimmer"
                value={song.fx.shimmer * 100}
                min={0}
                max={80}
                unit="%"
                onChange={(v) => fx("shimmer", v / 100)}
              />
              <div className="pitch-row">
                <span>Pitch interval</span>
                <div className="join">
                  {[7, 12, 19, 24].map((p) => (
                    <button
                      key={p}
                      className={`btn btn-xs join-item ${song.fx.pitch === p ? "pitch-active" : "btn-ghost"}`}
                      onClick={() => fx("pitch", p)}
                    >
                      +{p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fx-separator">
                <span>SPECTRAL SHAPING</span>
                <Waves size={15} />
              </div>
              <Range
                label="Low-pass cutoff"
                value={song.fx.cutoff}
                min={150}
                max={12000}
                step={50}
                unit=" Hz"
                onChange={(v) => fx("cutoff", v)}
              />
              <Range
                label="Resonance"
                value={song.fx.resonance}
                min={0.1}
                max={8}
                step={0.1}
                onChange={(v) => fx("resonance", v)}
              />
              <Range
                label="Dotted eighth delay"
                value={song.fx.delay * 100}
                min={0}
                max={60}
                unit="%"
                onChange={(v) => fx("delay", v / 100)}
              />
              <Range
                label="Master compression · 0 = off"
                value={(song.fx.compression ?? 0.5) * 100}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => fx("compression", v / 100)}
              />
              <div className="master-control">
                <Volume2 size={17} />
                <Range
                  label="Master output"
                  value={song.fx.master}
                  min={-40}
                  max={0}
                  unit=" dB"
                  onChange={(v) => fx("master", v)}
                />
              </div>
            </div>
          </aside>
        </div>
        <footer>
          <span>
            <Radio size={13} />
            Local audio processing
          </span>
          <span>
            4 voices <span>·</span> 4/4 <span>·</span> {song.key} {song.mode}
            <span>·</span> Headphones recommended
          </span>
        </footer>
      </main>
      {message && (
        <div role="status" className="toast toast-center">
          <div className="alert">
            {message}
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setMessage("")}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      <dialog
        ref={helpDialog}
        className="modal"
        onClose={() => setHelp(false)}
        aria-modal="true"
        aria-label="Astral help"
        onKeyDown={(e) => {
          if (e.key === "Escape") setHelp(false);
        }}
      >
        <div className="modal-box">
          <button
            autoFocus
            className="btn btn-sm btn-circle close-help"
            aria-label="Close help"
            onClick={() => setHelp(false)}
          >
            <X size={18} />
          </button>
          <h2>How to use Astral</h2>
          <p>
            Generate a song, then press Play to enable audio. Each section has
            its own harmonic cycle, bass behavior, energy, layers, and drum
            pattern. Chords use the selected mode, including diatonic sevenths
            and ninths.
          </p>
          <p>
            Select sections to edit them. Launch next bar jumps on the next bar
            boundary. Loop section holds a passage until you release it; the
            arrangement then continues. Edits are heard at the next relevant
            note. The S buttons solo a layer across sections.
          </p>
          <p>
            Shimmer blends pitch-shifted reverb into a second long stereo
            reverb. It’s inspired by spacious hardware effects, not a BigSky
            emulation. The shared filter affects pads and particles; bass and
            drums stay clear. Lower shimmer and mix for definition.
          </p>
          <p>
            Record captures your live performance, including effects, as a
            browser-native audio file. Press Finish recording to download it.
            After a song ends, let the tails ring before finishing. Projects
            save locally in this browser; Save project creates a portable JSON
            file.
          </p>
          <p>
            Chord holds are quarter-note beats and can cross bar lines. Use
            Unsettle section for irregular timing, and Bass & evolution for
            sparse bass, pedals, phrases, and accents. Tempo is in quarter
            notes. Energy controls velocity; the layer switches control
            arrangement density. Stop rewinds. Generating replaces the song, so
            save a project first to keep an alternate version.
          </p>
          <button className="btn generate" onClick={() => setHelp(false)}>
            Start exploring
          </button>
        </div>
        <button
          className="modal-backdrop"
          aria-label="Close help"
          onClick={() => setHelp(false)}
        />
      </dialog>
    </div>
  );
}
