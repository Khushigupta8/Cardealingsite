// Line icons for the console. Stroke styles come from `svg` rules in console.css.
const PATHS: Record<string, React.ReactNode> = {
  queue: <path d="M4 6h16M4 12h16M4 18h10" />,
  invite: <path d="M3 7l9 6 9-6M3 7v10h18V7M3 7h18" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.5 3 5.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M21 16l-5-5-8 8" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  inbox: <path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 2.5h5L16 13h5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 16v4h16v-4" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
