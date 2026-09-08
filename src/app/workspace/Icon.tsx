// Small stroke icons, 16px grid, currentColor. Kept inline to avoid a dependency.
const PATHS: Record<string, string> = {
  home: "M2 8.5 8 3l6 5.5M3.5 7.5V13h3V9.5h3V13h3V7.5",
  folder: "M2 4.5h4l1.5 1.5H14V13H2z",
  book: "M3 2.5h8a1 1 0 0 1 1 1V13H4a1 1 0 0 0-1 1zM3 2.5v11.5M12 11H4",
  ask: "M8 14A6 6 0 1 1 8 2a6 6 0 0 1 0 12zM6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.3M8 11.3h.01",
  shred: "M2.5 4.5h11M4 4.5V2.5h8v2M3 8.5h10M4.5 8.5v5M7 8.5v4M9 8.5v5M11.5 8.5v4",
  comply: "M3 3h10v10H3zM5.5 8l1.8 1.8L10.8 6",
  draft: "M3 13h10M4 10.5 11 3.5l1.5 1.5-7 7H4z",
  redteam: "M8 2 3 4.5v3.7c0 2.6 2 4.6 5 5.8 3-1.2 5-3.2 5-5.8V4.5zM6 8.2l1.4 1.4L10.3 6.6",
  share: "M11.5 5.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM4.5 9.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM11.5 14a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM6 7.2l4-2.4M6 8.8l4 2.4",
  vault: "M2.5 3h11v10h-11zM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4 13v1M12 13v1",
  evidence: "M4 2.5h5.5L13 6v7.5H4zM9.5 2.5V6H13M6 9h4M6 11.5h4",
  audit: "M2.5 13.5h11M4.5 11V7M8 11V4.5M11.5 11V8",
  settings: "M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1",
  menu: "M2.5 4h11M2.5 8h11M2.5 12h11",
  chevron: "M4.5 6.5 8 10l3.5-3.5",
  signout: "M6 2.5H3v11h3M10 5l3 3-3 3M13 8H6.5",
  plus: "M8 3v10M3 8h10",
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.home} />
    </svg>
  );
}
