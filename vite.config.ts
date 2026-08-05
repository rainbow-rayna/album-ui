import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Respect an externally-assigned port (e.g. from a preview harness) so the
// dev server doesn't collide with whatever else is already on 5173.
const port = process.env.PORT ? Number(process.env.PORT) : 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
  },
});
