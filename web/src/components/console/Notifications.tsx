'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Notifications, type Unread } from '@/lib/client/api';
import { Icon } from './icons';
import { useToast } from './kit';

// Anything that changes what's unread (opening a thread, sending a message) fires this,
// so the bell and the vehicle lists refresh straight away instead of on the next poll.
const UNREAD_EVENT = 'dr:unread';
export const unreadChanged = () => window.dispatchEvent(new Event(UNREAD_EVENT));
export function useUnreadChanged(fn: () => void) {
  useEffect(() => {
    window.addEventListener(UNREAD_EVENT, fn);
    return () => window.removeEventListener(UNREAD_EVENT, fn);
  }, [fn]);
}

// "2 new" next to a vehicle in a list.
export const UnreadBadge = ({ n }: { n?: number }) =>
  n ? (
    <span className="unread-badge" title={`${n} unread message${n === 1 ? '' : 's'}`}>
      <Icon name="chat" />
      {n} new
    </span>
  ) : null;

const POLL_MS = 30_000;
const ago = (d: string) => {
  const m = Math.round((Date.now() - Date.parse(d)) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Header bell: unread conversations from the other side, polled while the page is open.
// A new arrival also shows a toast and puts the count in the browser tab title.
export function NotificationBell({ onOpen, from }: { onOpen: (vehicleId: string) => void; from: 'dealer' | 'team' }) {
  const toast = useToast();
  const [data, setData] = useState<Notifications | null>(null);
  const [open, setOpen] = useState(false);
  const seen = useRef<Map<string, string> | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.get<Notifications>('/notifications');
      // Toast for messages that arrived since the last check (not on the first load).
      if (seen.current) {
        const fresh = next.items.filter(u => (seen.current!.get(u.vehicleId) ?? '') < u.lastAt);
        if (fresh.length === 1) toast(`New message${from === 'dealer' ? ` from ${fresh[0].dealershipName ?? 'a dealership'}` : ' from your reviewer'} about the ${fresh[0].vehicleName}`);
        else if (fresh.length > 1) toast(`${fresh.length} conversations have new messages`);
      }
      const arrived = !!seen.current && next.items.some(u => (seen.current!.get(u.vehicleId) ?? '') < u.lastAt);
      seen.current = new Map(next.items.map(u => [u.vehicleId, u.lastAt]));
      setData(next);
      // New messages also change the "new" badges in the vehicle lists. (The bell's own reload
      // that this triggers finds nothing newer, so it doesn't loop.)
      if (arrived) unreadChanged();
    } catch {
      // A failed check just waits for the next one; signing out is handled by the page's own requests.
    }
  }, [toast, from]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);
  useUnreadChanged(load);

  // "(2) Admin" in the browser tab while something is unread.
  const total = data?.total ?? 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = total ? `(${total}) ${base}` : base;
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const pick = (u: Unread) => {
    setOpen(false);
    onOpen(u.vehicleId);
  };

  return (
    <div className="bell-wrap" ref={wrap}>
      <button
        className="icon-btn bell"
        id="notifications"
        aria-label={total ? `${total} unread message${total === 1 ? '' : 's'}` : 'Messages'}
        aria-expanded={open}
        aria-haspopup="true"
        title="Messages"
        onClick={() => setOpen(o => !o)}
      >
        <Icon name="bell" />
        {total > 0 && <span className="bell-count">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <div className="bell-menu" role="menu" aria-label="Unread messages">
          <p className="bell-head">Messages</p>
          {data?.items.length ? (
            data.items.map(u => (
              <button key={u.vehicleId} role="menuitem" className="bell-item" onClick={() => pick(u)}>
                <span className="bell-title">
                  {u.vehicleName}
                  <span className="bell-n">{u.count} new</span>
                </span>
                {from === 'dealer' && u.dealershipName && <span className="bell-sub">{u.dealershipName}</span>}
                <span className="bell-body">“{u.lastBody}”</span>
                <span className="bell-sub">{ago(u.lastAt)}</span>
              </button>
            ))
          ) : (
            <p className="bell-empty">
              <Icon name="check" />
              You’re all caught up.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
