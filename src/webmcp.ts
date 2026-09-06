import { isSong, type Song } from "./music";
interface ModelContext {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}
export function registerProjectTools(
  read: () => Song,
  replace: (song: Song) => void,
  context = (document as Document & { modelContext?: ModelContext })
    .modelContext,
) {
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools = [
    {
      name: "read_astral_song",
      title: "Read Astral song",
      description:
        "Read the current arrangement, harmony, drum patterns, mixer, and effects.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => structuredClone(read()),
    },
    {
      name: "replace_astral_song",
      title: "Replace Astral song",
      description:
        "Stop playback and replace the current project with a complete validated Astral song. This replaces and autosaves the visible project; save a project file first to keep an alternate version. Unavailable during recording.",
      inputSchema: {
        type: "object",
        properties: { song: { type: "object" } },
        required: ["song"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input: unknown) => {
        if (
          !input ||
          typeof input !== "object" ||
          !("song" in input) ||
          !isSong(input.song)
        )
          throw new Error("A complete valid Astral song is required.");
        replace(structuredClone(input.song));
        return {
          name: input.song.name,
          sections: input.song.sections.length,
          status: "replaced",
        };
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
  return () => lifecycle.abort();
}
