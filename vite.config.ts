import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Respect an externally-assigned port (e.g. from a preview harness), else
// default to 5180. Deliberately not Vite's usual 5173: the earlier Scrapbook
// Journal prototype (a separate project) holds that port, and `strictPort`
// below means a collision is a hard failure rather than a silent fallback —
// which previously left this server dead and the browser showing a stale tab.
const port = process.env.PORT ? Number(process.env.PORT) : 5180;

// The Express API runs as a separate process (`npm run dev:server`) and is the
// only place the provider keys exist. It's proxied through Vite so the browser
// only ever talks to one origin — no CORS in dev, and `/api/...` resolves the
// same way in dev and in production. Vite is deliberately never handed the
// server's .env, so no key can reach a browser bundle.
const apiPort = process.env.API_PORT ? Number(process.env.API_PORT) : 5185;

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
    proxy: {
      "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
});
