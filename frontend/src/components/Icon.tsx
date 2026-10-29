export type IconName =
  | 'search'
  | 'leaf'
  | 'chart'
  | 'compare'
  | 'flask'
  | 'arrow'
  | 'info'
  | 'alert'
  | 'database'
  | 'pin'
  | 'refresh'
  | 'external';
const paths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4c0 13-5 17-11 14C1 14 6 5 20 4Z" />
      <path d="m4 21 11-11" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6" />
    </>
  ),
  compare: (
    <>
      <path d="M5 5h14M5 19h14M8 2 5 5l3 3m8 8 3 3-3 3M8 12h8" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15m-5-5 5 5-5 5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.1" />
    </>
  ),
  alert: (
    <>
      <path d="m10.3 4.5-8 14A1.7 1.7 0 0 0 4 21h16a1.7 1.7 0 0 0 1.7-2.5l-8-14a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v5m0 3v.1" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
    </>
  ),
};
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
