import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { env, hasAnthropic, hasGemini, hasOpenAi } from "./env";
import { aiRouter } from "./routes/ai";

const app = express();

// In dev the browser only ever talks to Vite, which proxies /api here — so CORS
// is just a convenience for hitting the API directly (curl, a second client)
// and is scoped to localhost.
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));

// Photos reach the image route as base64 data URLs inside the JSON body, and
// base64 inflates bytes by ~33%. Six phone photos can comfortably clear the
// default 100kb limit, so this is raised well past what the composer allows.
app.use(express.json({ limit: "40mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    anthropic: hasAnthropic() ? "configured" : "missing",
    gemini: hasGemini() ? "configured" : "missing",
    openai: hasOpenAi() ? "configured" : "missing",
  });
});

app.use("/api/ai", aiRouter);

// Serve the built SPA when running `npm start` after `npm run build`; in dev
// this directory doesn't exist and Vite serves it instead.
const distDir = path.join(process.cwd(), "dist");
if (env.isProduction && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[api] unhandled error:", err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

app.listen(env.apiPort, () => {
  console.log(`▸ Album API on http://localhost:${env.apiPort}`);
  const configured = [
    hasAnthropic() ? "anthropic" : null,
    hasGemini() ? "gemini" : null,
    hasOpenAi() ? "openai" : null,
  ].filter(Boolean);
  if (configured.length === 0) {
    console.log("  no provider keys set in .env — chat uses scripted prompts and pages render locally");
  } else {
    console.log(`  providers: ${configured.join(", ")}`);
  }
});
