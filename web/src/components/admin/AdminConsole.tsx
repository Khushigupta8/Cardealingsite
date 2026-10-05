'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Me } from '@/lib/client/api';
import { Icon } from '@/components/console/icons';
import { LoginScreen, ToastProvider, Unreachable, Wordmark, useSession } from '@/components/console/kit';
import { NotificationBell } from '@/components/console/Notifications';
import { QueuePanel } from './QueuePanel';
import { InvitePanel } from './InvitePanel';
import { PeoplePanel } from './PeoplePanel';
import { EnquiriesPanel, type InvitePrefill } from './EnquiriesPanel';
import { MembershipPanel } from './MembershipPanel';
import { api } from '@/lib/client/api';

type Tab = 'queue' | 'enquiries' | 'invite' | 'people' | 'membership';

export function AdminConsole() {
  const { state, signIn, signOut, expire, retry } = useSession();

  // Dealers have their own workspace. Send them there rather than signing them out,
  // since both areas share the browser's session.
  useEffect(() => {
    if (state.status === 'signedIn' && state.me.role === 'dealer') window.location.replace('/portal');
  }, [state]);

  if (state.status === 'loading' || (state.status === 'signedIn' && state.me.role === 'dealer')) return null;
  if (state.status === 'unreachable') return <Unreachable message={state.message} onRetry={retry} />;
  if (state.status === 'signedOut') {
    return (
      <LoginScreen
        eyebrow="Dealer Review / Review team"
        quote={['EVERY VEHICLE.', 'ONE CLEAR VIEW.']}
        title="Sign in"
        intro="For reviewers and admins. Dealers sign in from the main site."
        message={state.message}
        onSignedIn={signIn}
      />
    );
  }
  return (
    <ToastProvider>
      <Shell me={state.me} onSignOut={signOut} expire={expire} />
    </ToastProvider>
  );
}

function Shell({ me, onSignOut, expire }: { me: Me; onSignOut: () => void; expire: () => void }) {
  const isAdmin = me.role === 'admin';
  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return isAdmin && (['invite', 'people', 'enquiries', 'membership'] as string[]).includes(h) ? (h as Tab) : 'queue';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const onCounts = useCallback((c: { pending: number }) => setPending(c.pending), []);
  const [newEnquiries, setNewEnquiries] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<InvitePrefill | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Badge for new enquiries, shown before the tab is opened.
  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ counts: { new: number } }>('/admin/enquiries?status=new').then(d => setNewEnquiries(d.counts.new), () => {});
  }, [isAdmin]);

  const open = (t: Tab) => {
    setTab(t);
    setMenuOpen(false);
    history.replaceState(null, '', t === 'queue' ? location.pathname : `#${t}`);
  };

  // "/" jumps to the search box of the current page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || t.matches('input, textarea, select') || document.querySelector('#drawer')) return;
      const box = [...document.querySelectorAll<HTMLInputElement>('.search input')].find(i => i.offsetParent);
      if (box) { e.preventDefault(); box.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const nav: { id: Tab; label: string; icon: 'queue' | 'invite' | 'people' | 'inbox' | 'card'; admin?: boolean }[] = [
    { id: 'queue', label: 'Review queue', icon: 'queue' },
    { id: 'enquiries', label: 'Enquiries', icon: 'inbox', admin: true },
    { id: 'invite', label: 'Invite', icon: 'invite', admin: true },
    { id: 'people', label: 'People', icon: 'people', admin: true },
    { id: 'membership', label: 'Membership', icon: 'card', admin: true },
  ];

  return (
    <div id="app-view" className="shell">
      <aside className={`sidebar${menuOpen ? ' open' : ''}`} id="sidebar">
        <div className="sidebar-top">
          <Wordmark />
          <NotificationBell
            from="dealer"
            onOpen={id => {
              open('queue');
              setOpenId(id);
            }}
          />
          <button className="icon-btn menu-btn" id="menu-btn" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="nav" onClick={() => setMenuOpen(o => !o)}>
            <Icon name="menu" />
          </button>
        </div>
        <nav className="nav" id="nav" aria-label="Admin sections">
          {nav
            .filter(n => !n.admin || isAdmin)
            .map(n => (
              <button key={n.id} className="nav-item" data-tab={n.id} aria-current={tab === n.id ? 'page' : undefined} onClick={() => open(n.id)}>
                <Icon name={n.icon} />
                {n.label}
                {n.id === 'queue' && <span className="nav-count" data-nav-count="pending">{pending || ''}</span>}
                {n.id === 'enquiries' && <span className="nav-count" data-nav-count="enquiries">{newEnquiries || ''}</span>}
              </button>
            ))}
        </nav>
        <div className="me">
          <div className="avatar" aria-hidden="true">{(me.fullName || me.email).trim()[0]?.toUpperCase()}</div>
          <div className="me-text">
            <span id="who-email" title={me.email}>{me.email}</span>
            <span className="role-badge" id="who-role">{me.role}</span>
          </div>
          <button className="icon-btn" id="logout" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
            <Icon name="out" />
          </button>
        </div>
      </aside>

      <main className="main">
        {tab === 'queue' && <QueuePanel expire={expire} onCounts={onCounts} openId={openId} setOpenId={setOpenId} />}
        {tab === 'enquiries' && isAdmin && (
          <EnquiriesPanel
            expire={expire}
            onCounts={setNewEnquiries}
            onInvite={p => {
              setPrefill(p);
              open('invite');
            }}
          />
        )}
        {tab === 'invite' && isAdmin && <InvitePanel expire={expire} prefill={prefill} onUsedPrefill={() => setPrefill(null)} />}
        {tab === 'membership' && isAdmin && <MembershipPanel expire={expire} />}
        {tab === 'people' && isAdmin && <PeoplePanel expire={expire} onInvite={() => open('invite')} meId={me.id} />}
      </main>
    </div>
  );
}
