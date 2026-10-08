'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import graySuv from '@/assets/images/gray-suv.jpg';
import bmw330 from '@/assets/images/bmw-330.jpg';
import bmw530 from '@/assets/images/bmw-530.jpg';
import { useSiteDialog, type SampleVehicle } from './SiteDialogs';

type Tab = 'Pending' | 'Needs info' | 'Completed';

// Sample data for the homepage's portal preview.
const VEHICLES: Record<Tab, SampleVehicle[]> = {
  Pending: [
    { name: '2023 BMW 530i', trim: 'M Sport', date: 'Oct 1, 2026', image: bmw530 },
    { name: '2022 Porsche Macan', trim: 'Base · 32,480 mi', date: 'Oct 1, 2026', image: graySuv },
    { name: '2021 BMW 330e', trim: 'M Sport', date: 'Sep 30, 2026', image: bmw330 },
  ],
  'Needs info': [{ name: '2022 Porsche Macan', trim: 'Rear interior photos requested', date: 'Sep 30, 2026', image: graySuv }],
  Completed: [
    { name: '2022 Porsche Macan', trim: 'Grade 4 / 5 · $39,500', date: 'Oct 1, 2026', image: graySuv },
    { name: '2021 BMW 330e', trim: 'Grade 4 / 5 · $28,500', date: 'Sep 30, 2026', image: bmw330 },
  ],
};
const TABS: { id: string; status: Tab }[] = [
  { id: 'tab-pending', status: 'Pending' },
  { id: 'tab-info', status: 'Needs info' },
  { id: 'tab-completed', status: 'Completed' },
];

export function PortalDemo() {
  const open = useSiteDialog();
  const [tab, setTab] = useState<Tab>('Pending');
  const [q, setQ] = useState('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const needle = q.toLowerCase();
  const rows = VEHICLES[tab].filter(v => `${v.name} ${v.trim}`.toLowerCase().includes(needle));

  // Arrow keys, Home and End move between tabs, as for native tab widgets.
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = TABS.length;
    const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setTab(TABS[next].status);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="portal-demo">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Dealer workspace</span>
          <h3>Westfield Motors</h3>
        </div>
        <span className="workspace-avatar">WM</span>
      </div>
      <div className="vehicle-tabs" role="tablist" aria-label="Vehicle status">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={el => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={t.id}
            aria-selected={tab === t.status}
            aria-controls="vehicle-list"
            data-status={t.status}
            tabIndex={tab === t.status ? 0 : -1}
            onClick={() => setTab(t.status)}
            onKeyDown={e => onKey(e, i)}
          >
            {t.status} <span>{VEHICLES[t.status].length}</span>
          </button>
        ))}
      </div>
      <label className="workspace-search">
        <i className="ph ph-magnifying-glass" aria-hidden="true"></i>
        <input type="search" id="vehicle-search" placeholder="Find a vehicle" aria-label="Search sample vehicles" value={q} onChange={e => setQ(e.target.value)} />
      </label>
      <div id="vehicle-list" role="tabpanel" aria-labelledby={TABS.find(t => t.status === tab)!.id}>
        {rows.length ? (
          rows.map(v => (
            <button
              key={`${tab}-${v.name}-${v.trim}`}
              className="vehicle-row"
              aria-label={`View ${v.name}`}
              onClick={() => (tab === 'Completed' ? open({ kind: 'report', vehicle: v }) : open({ kind: 'sample', vehicle: v, status: tab }))}
            >
              <Image src={v.image} alt="" sizes="96px" />
              <div>
                <h3>{v.name}</h3>
                <p>{v.trim}</p>
              </div>
              <div className="vehicle-date">
                {tab === 'Completed' ? 'Reviewed' : 'Submitted'}
                <span>{v.date}</span>
              </div>
              <span className={`status ${tab === 'Completed' ? 'complete' : tab === 'Needs info' ? 'info' : ''}`}>{tab}</span>
              <i className="ph ph-caret-right" aria-hidden="true"></i>
            </button>
          ))
        ) : (
          <p className="empty-results">
            No matching vehicles in this tab.
            <br />
            Try another name or clear your search.
          </p>
        )}
      </div>
      <p className="demo-note">
        Sample data <span>Your dealership’s vehicles only</span>
      </p>
    </div>
  );
}
