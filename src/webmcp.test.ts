import { describe, it, expect } from "vitest";
import { registerProjectTools } from "./webmcp";
import { generateSong } from "./music";
describe("project tool contract", () => {
  it("registers, validates replacements, reads state back, and cleans up", () => {
    let song = generateSong(1);
    const tools = new Map<string, { execute: (input: unknown) => unknown }>();
    const signals: AbortSignal[] = [];
    const cleanup = registerProjectTools(
      () => song,
      (next) => {
        song = next;
      },
      {
        registerTool(tool, options) {
          tools.set(tool.name, tool);
          signals.push(options.signal);
        },
      },
    );
    expect([...tools.keys()]).toEqual([
      "read_astral_song",
      "replace_astral_song",
    ]);
    const replacement = generateSong(2);
    expect(
      tools.get("replace_astral_song")!.execute({ song: replacement }),
    ).toMatchObject({ status: "replaced" });
    expect(tools.get("read_astral_song")!.execute({})).toEqual(replacement);
    expect(() =>
      tools.get("replace_astral_song")!.execute({ song: { bpm: -1 } }),
    ).toThrow();
    expect(song).toEqual(replacement);
    cleanup();
    expect(signals.every((s) => s.aborted)).toBe(true);
  });
});
