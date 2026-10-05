'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Message } from '@/lib/client/api';
import { Icon } from './icons';
import { useToast } from './kit';
import { unreadChanged } from './Notifications';

const when = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// The conversation about one vehicle between the dealership and the review team.
export function Thread({ vehicleId, viewer, errorText, refreshKey = 0 }: { vehicleId: string; viewer: 'dealer' | 'team'; errorText: (e: unknown) => string; refreshKey?: number }) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const shown = useRef<number | null>(null);
  // Opening the thread marks it read on the server, so the bell and lists refresh afterwards.
  const load = useCallback(() => {
    api.get<Message[]>(`/vehicles/${encodeURIComponent(vehicleId)}/messages`).then(
      next => {
        if (shown.current !== next.length) unreadChanged();
        shown.current = next.length;
        setMessages(next);
      },
      err => {
        const msg = errorText(err);
        if (msg) toast(msg, 'error');
        setMessages(m => m ?? []);
      },
    );
  }, [vehicleId, errorText, toast]);
  useEffect(load, [load, refreshKey]);
  // Keep the conversation live while it's open.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 15_000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const m = await api.post<Message>(`/vehicles/${encodeURIComponent(vehicleId)}/messages`, { body });
      setMessages(ms => [...(ms ?? []), m]);
      setDraft('');
    } catch (err) {
      const msg = errorText(err);
      if (msg) toast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const mine = (m: Message) => (viewer === 'dealer' ? m.authorRole === 'dealer' : m.authorRole !== 'dealer');
  const who = (m: Message) =>
    m.authorRole === 'dealer' ? (viewer === 'dealer' ? 'You' : m.authorName || 'Dealer') : viewer === 'dealer' ? 'Your reviewer' : m.authorName || 'Review team';

  return (
    <div className="thread" id="thread">
      <p className="section-title">Conversation{messages?.length ? ` (${messages.length})` : ''}</p>
      {messages === null ? (
        <p className="hint">Loading…</p>
      ) : messages.length ? (
        <ol className="thread-list">
          {messages.map(m => (
            <li key={m.id} className={mine(m) ? 'mine' : ''}>
              <span className="thread-meta">{who(m)} · {when(m.createdAt)}</span>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hint">{viewer === 'dealer' ? 'No messages yet. Ask your reviewer anything about this vehicle.' : 'No messages yet. Questions you send appear in the dealer’s workspace and by email.'}</p>
      )}
      <form className="thread-compose" onSubmit={send}>
        <textarea
          name="body"
          aria-label="Write a message"
          placeholder={viewer === 'dealer' ? 'Message your reviewer' : 'Message the dealership'}
          value={draft}
          maxLength={4000}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e);
          }}
        />
        <button className="btn" type="submit" disabled={busy || !draft.trim()} id="thread-send">
          <Icon name="invite" />
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

// Download the branded PDF for a completed vehicle.
export function ReportButton({ vehicleId, errorText, primary = false }: { vehicleId: string; errorText: (e: unknown) => string; primary?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`btn${primary ? ' btn-primary' : ''}`}
      id="download-report"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const name = await api.downloadReport(vehicleId);
          toast(`Downloaded ${name}`);
        } catch (err) {
          const msg = errorText(err);
          if (msg) toast(msg, 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name="download" />
      {busy ? 'Preparing PDF…' : 'Download PDF report'}
    </button>
  );
}
