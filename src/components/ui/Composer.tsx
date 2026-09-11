import { useCallback, useEffect, useRef, useState } from "react";
import { useBookStore } from "../../store/useBookStore";
import { useJournalStore } from "../../store/useJournalStore";
import { navigateTo } from "../../utils/pageNav";
import { PhotoUpload } from "./PhotoUpload";
import { Chat } from "./Chat";
import { ScrapbookPage } from "./ScrapbookPage";
import type { ChatMessage, Family, JournalEntry, Photo } from "../../journal/types";
import { generatePageImage, getAiReply, getAiSummaryAndMood } from "../../journal/ai";
import { imageProvidersFor, type ImageProvider } from "../../../shared/ai";
import { pick } from "../../journal/helpers";
import { FAMILIES, FAMILY_LABELS } from "../../journal/constants";
import { generateLayout } from "../../journal/layout";

type PreviewNote = { type: "hint" | "error"; text: string } | null;

function openingMessage(hasPhotos: boolean) {
  return hasPhotos
    ? "Hi! I see you added some photos — want to tell me a bit about this moment?"
    : "Hi! What's on your mind today?";
}

const hasUserMessages = (messages: ChatMessage[]) => messages.some((m) => m.role === "user");

/**
 * Full-screen composer overlay: the "+ New Page" flow. Ported from the
 * Scrapbook Journal MVP's App.tsx composer half (upload → chat → generate →
 * save), minus the carousel — the book itself is now the carousel. Saving
 * appends to useJournalStore and turns the book to the freshly added page.
 */
export function Composer() {
  const open = useBookStore((s) => s.composerOpen);
  const closeComposer = useBookStore((s) => s.closeComposer);
  const addEntry = useJournalStore((s) => s.addEntry);
  // Booleans only — the keys themselves live in the server's .env and are never
  // sent to the browser. These just decide what the composer says and offers.
  const aiStatus = useJournalStore((s) => s.aiStatus);
  const refreshAiStatus = useJournalStore((s) => s.refreshAiStatus);
  // Pages with photos can only be drawn by Gemini (imageProvidersFor), so
  // whether AI can draw this page depends on whether it has photos.
  const canDraw = (photoCount: number) => imageProvidersFor(photoCount).some((p) => aiStatus[p]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const hasImageProvider = canDraw(photos.length);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: "assistant", content: openingMessage(false) }]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatFinished, setChatFinished] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [detectedFamily, setDetectedFamily] = useState<Family | null>(null);
  const [aiModeWarning, setAiModeWarning] = useState("");

  const [journalText, setJournalText] = useState("");
  const [journalLoading, setJournalLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionAuthor, setCaptionAuthor] = useState("");

  const [draftEntry, setDraftEntry] = useState<JournalEntry | null>(null);
  const [previewNote, setPreviewNote] = useState<PreviewNote>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ImageProvider | null>(null);
  const [step, setStep] = useState<"entry" | "preview">("entry");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const initChat = useCallback((hasPhotos: boolean) => {
    setChatMessages([{ role: "assistant", content: openingMessage(hasPhotos) }]);
    setChatDraft("");
    setChatFinished(false);
    setDetectedFamily(null);
    setAiModeWarning("");
    setJournalText("");
    setCaption("");
    setCaptionAuthor("");
  }, []);

  function resetComposer() {
    setPhotos([]);
    setDraftEntry(null);
    setPreviewNote(null);
    setStep("entry");
    initChat(false);
  }

  // Fresh composer state each time it's opened, and re-check what the server
  // has configured (the .env may have changed since the page was loaded).
  useEffect(() => {
    if (open) {
      resetComposer();
      void refreshAiStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function sendChatMessage(text: string) {
    const next = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(next);
    setChatBusy(true);
    const { reply, warning } = await getAiReply(next);
    setAiModeWarning(warning || "");
    setChatMessages([...next, { role: "assistant", content: reply }]);
    setChatBusy(false);
  }

  /**
   * Turns the chat into the journal text + reflection and fills in the
   * editable fields. Also returns the result, because generatePage needs the
   * values in the same tick — state set here isn't readable until re-render.
   */
  async function writeJournal(messages: ChatMessage[]) {
    setChatFinished(true);
    setJournalLoading(true);
    setJournalText("Writing your journal entry...");
    setCaption("Reflecting...");
    setCaptionAuthor("");
    const result = await getAiSummaryAndMood(messages);
    setJournalText(result.text);
    setCaption(result.caption);
    setCaptionAuthor(result.captionAuthor || "");
    setDetectedFamily(result.mood);
    if (result.warning) setAiModeWarning(result.warning);
    setJournalLoading(false);
    return result;
  }

  async function finishChat() {
    if (!hasUserMessages(chatMessages)) {
      alert("Share at least one message before finishing.");
      return;
    }
    await writeJournal(chatMessages);
  }

  /**
   * Asks the server for an AI-rendered page. Provider choice and the
   * try-the-other-one-on-failure retry now live in the API route, since the
   * browser no longer knows which providers have keys — it just gets back an
   * image and, if a fallback happened, a note explaining it.
   */
  async function doRender(entry: JournalEntry) {
    if (!canDraw(entry.photos.length)) {
      setPreviewLoading(false);
      setDraftEntry(entry);
      setPreviewNote({
        type: "hint",
        text:
          entry.photos.length > 0
            ? "Showing a simple layout — pages with photos are drawn with Gemini, so set GEMINI_API_KEY in the server's .env for an AI-rendered page."
            : "Showing a simple layout — set GEMINI_API_KEY and/or OPENAI_API_KEY in the server's .env for an AI-rendered page.",
      });
      return;
    }

    setPreviewLoading(true);
    setPreviewNote(null);
    setDraftEntry(entry);

    try {
      const { image, provider, warning } = await generatePageImage(entry, detectedFamily);
      setActiveProvider(provider);
      setDraftEntry({ ...entry, aiImage: image });
      if (warning) setPreviewNote({ type: "hint", text: warning });
    } catch (err) {
      console.error("AI page generation failed", err);
      setDraftEntry({ ...entry, aiImage: null });
      setPreviewNote({
        type: "error",
        text: `${(err as Error)?.message || "Couldn't generate the AI page"} — showing a simple layout instead.`,
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function generatePage() {
    // A reply typed into the chat box but never sent is still part of the
    // memory — fold it into the transcript rather than dropping it.
    const unsent = chatFinished ? "" : chatDraft.trim();
    const transcript: ChatMessage[] = unsent ? [...chatMessages, { role: "user", content: unsent }] : chatMessages;
    // Generating straight from the chat (without "Finish & write journal"
    // first) used to save an entry with an empty journal page. Write the
    // journal here instead, so this one click always produces both pages.
    const needsJournal = !chatFinished && hasUserMessages(transcript);
    if (photos.length === 0 && !needsJournal && !journalText) {
      alert("Add at least one photo, or tell the AI about your memory first.");
      return;
    }
    setStep("preview");
    setDraftEntry(null);
    setPreviewNote(null);
    setPreviewLoading(true);

    let text = journalText;
    let entryCaption = caption;
    let entryCaptionAuthor = captionAuthor;
    let family = detectedFamily;
    if (needsJournal) {
      if (unsent) {
        setChatMessages(transcript);
        setChatDraft("");
      }
      const journal = await writeJournal(transcript);
      text = journal.text;
      entryCaption = journal.caption;
      entryCaptionAuthor = journal.captionAuthor || "";
      family = journal.mood;
    }

    const now = new Date();
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      dateLabel: now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      photos: photos.map((p) => p.dataUrl),
      text,
      caption: entryCaption,
      captionAuthor: entryCaptionAuthor || undefined,
      aiImage: null,
      layoutSpec: generateLayout(photos.length, family || pick(FAMILIES)),
    };
    await doRender(entry);
  }

  async function shuffle() {
    if (!draftEntry) return;
    if (hasImageProvider) {
      await doRender(draftEntry);
    } else {
      setDraftEntry({
        ...draftEntry,
        layoutSpec: generateLayout(draftEntry.photos.length, draftEntry.layoutSpec.family),
        aiImage: null,
      });
    }
  }

  function saveAndClose() {
    if (!draftEntry) return;
    addEntry(draftEntry);
    // New entry N (1-indexed) has its image on the back of leaf N — see
    // useJournalStore's getLeafFaces — so navigating to leaf N lands
    // exactly on its full image+text spread rather than stopping mid-entry.
    const entryCount = useJournalStore.getState().entries.length;
    closeComposer();
    navigateTo(entryCount);
  }

  if (!open) return null;

  const aiModeNote =
    aiModeWarning ||
    (aiStatus.anthropic
      ? "Connected — real AI conversation is on."
      : "Using scripted prompts (set ANTHROPIC_API_KEY in the server's .env for real AI conversation).");
  const showJournalFields = chatFinished;

  return (
    <div className="composer-overlay" onClick={(e) => e.target === e.currentTarget && closeComposer()}>
      <div className={`composer-panel step-${step}`}>
        <button className="modal-close" onClick={closeComposer}>
          ✕
        </button>
        <div className="composer-scroll" ref={scrollRef}>
          {step === "entry" ? (
            <section className="composer-step">
              <div className="step-header">
                <span className="step-eyebrow">New entry · step 1 of 2</span>
                <h2>Share a Memory</h2>
                <p className="step-sub">Upload a few photos, then reflect with AI to shape the page.</p>
              </div>

              <PhotoUpload
                photos={photos}
                onAdd={(p) => setPhotos((prev) => [...prev, p])}
                onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
              />

              <Chat
                messages={chatMessages}
                disabled={chatBusy || chatFinished}
                onSend={sendChatMessage}
                draft={chatDraft}
                onDraftChange={setChatDraft}
              />
              <p className="mic-status">{aiModeNote}</p>
              <div className="chat-actions">
                <button className="btn btn-ghost" onClick={() => initChat(photos.length > 0)}>
                  Restart chat
                </button>
                <button className="btn btn-secondary" disabled={chatBusy || chatFinished} onClick={finishChat}>
                  Finish &amp; write journal
                </button>
              </div>

              {showJournalFields && (
                <>
                  <label className="field-label">Journal text (edit if you'd like)</label>
                  <textarea id="journalTextArea" value={journalText} onChange={(e) => setJournalText(e.target.value)} />

                  <label className="field-label">Reflection (edit if you'd like)</label>
                  <input
                    type="text"
                    placeholder="A thoughtful quote, saying, or proverb..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Attribution (leave blank if it's not a real quote)"
                    value={captionAuthor}
                    onChange={(e) => setCaptionAuthor(e.target.value)}
                  />
                  {detectedFamily && !journalLoading && (
                    <p className="mic-status">
                      Layout mood detected: {FAMILY_LABELS[detectedFamily]} — you can still shuffle the exact look
                      after generating.
                    </p>
                  )}
                </>
              )}

              <button
                className="btn btn-ai"
                disabled={previewLoading || chatBusy || journalLoading}
                onClick={generatePage}
              >
                {journalLoading ? "Writing your journal…" : "Generate page →"}
              </button>
            </section>
          ) : (
            <section className="composer-step">
              <div className="step-header">
                <button className="step-back" onClick={() => setStep("entry")}>
                  ← back
                </button>
                <span className="step-eyebrow">Step 2 of 2</span>
                <h2>Preview</h2>
              </div>

              <div className="page-stage">
                {previewLoading ? (
                  <div className="ai-loading">
                    {journalLoading
                      ? "Writing your journal from the chat..."
                      : hasImageProvider
                        ? "Rendering your AI page... this can take up to a minute."
                        : "Laying out your page..."}
                  </div>
                ) : draftEntry ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                    {previewNote && (
                      <div
                        className={previewNote.type === "error" ? "ai-error" : "field-hint"}
                        style={{ textAlign: "center", marginBottom: 10, maxWidth: 320 }}
                      >
                        {previewNote.text}
                      </div>
                    )}
                    <div className="preview-page">
                      <ScrapbookPage entry={draftEntry} />
                    </div>
                    {draftEntry.aiImage && activeProvider && (
                      // Photo-less pages go to either provider at random, so
                      // name the one that rendered this — otherwise the two
                      // very different looks arrive with no explanation.
                      <div className="field-hint" style={{ textAlign: "center", marginTop: 10 }}>
                        Rendered with {activeProvider === "openai" ? "OpenAI" : "Gemini"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-hint">Your generated page will appear here.</div>
                )}
              </div>
              {draftEntry && !previewLoading && (
                <div className="preview-actions">
                  <button className="btn btn-primary" onClick={saveAndClose}>
                    Save to book
                  </button>
                  <button className="btn btn-secondary" onClick={shuffle}>
                    {hasImageProvider ? "Try another AI take" : "Try another look"}
                  </button>
                  <button className="btn btn-ghost" onClick={resetComposer}>
                    Start new
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
