import { useState } from "react";

/**
 * Fixed chrome bar: wordmark (left), interaction hint + a music toggle
 * (right) — mirrors the Wispal reference's top-bar layout. The mute toggle
 * is UI-only for now (no audio asset wired up yet); it just tracks local
 * on/off state so the control exists and is ready to wire to a real
 * <audio> element later.
 *
 * There is deliberately no "AI settings" control: provider keys live in the
 * server's .env (see .env.example), so there is nothing for a user to enter
 * here. The composer reports whether AI is on inline, next to the chat.
 */
export default function TopBar() {
  const [muted, setMuted] = useState(true);

  return (
    <div className="top-bar">
      <span className="top-bar__logo">memories</span>
      <div className="top-bar__right">
        <span className="top-bar__hint">
          drag to orbit · click cover to open · click a page (right to advance, left to go back) or ← → arrow keys to
          flip · drag left to right to close
        </span>
        <button
          type="button"
          className="top-bar__mute"
          aria-label={muted ? "Turn music on" : "Turn music off"}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "♪ off" : "♪ on"}
        </button>
      </div>
    </div>
  );
}
