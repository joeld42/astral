import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// The production site is served from https://your-host/astral/ rather than
// the domain root. Vite uses this when it rewrites JS/CSS asset URLs.
export default defineConfig({
  base: "/astral/",
  plugins: [react(), tailwindcss()],
});
