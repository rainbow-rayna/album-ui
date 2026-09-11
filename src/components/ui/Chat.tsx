import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { ChatMessage } from '../../journal/types';

interface Props {
  messages: ChatMessage[];
  disabled: boolean;
  onSend: (text: string) => void;
  // The unsent reply is owned by the composer, not kept locally, so that
  // "Generate page" can fold a typed-but-never-sent message into the journal
  // instead of silently dropping it.
  draft: string;
  onDraftChange: (text: string) => void;
}

export function Chat({ messages, disabled, onSend, draft, onDraftChange }: Props) {
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  function send() {
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    onDraftChange('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') send();
  }

  return (
    <>
      <label className="field-label">Reflect with AI</label>
      <div className="chat-box">
        <div className="chat-messages" ref={messagesRef}>
          {messages.map((m, i) => (
            <div className={'chat-bubble ' + m.role} key={i}>
              {m.content}
            </div>
          ))}
        </div>
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type your reply..."
          value={draft}
          disabled={disabled}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-secondary" disabled={disabled} onClick={send}>
          Send
        </button>
      </div>
    </>
  );
}
