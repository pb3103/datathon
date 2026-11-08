import type { Item } from './data';

export function ItemSymbol({ item }: { item: Pick<Item, 'id' | 'category'> }) {
  const category = item.category.toLocaleLowerCase('hr');
  let path = 'M5 7h14v14H5V7Zm0 0 7-4 7 4M12 7v14';
  if (category.includes('stakl'))
    path =
      item.id === 'staklenka'
        ? 'M6 5h12V2H6v3Zm1 0v3l-2 3v9c0 3 14 3 14 0v-9l-2-3V5M5 12h14'
        : 'M9 2h6v4l3 5v10H6V11l3-5V2Zm0 4h6';
  else if (category.includes('bio'))
    path =
      'M6 7c-3 3-2 10 2 13 2-2 6-2 8 0 4-3 5-10 2-13-3 2-9 2-12 0ZM12 8V3m0 2c3-4 6-3 6-3-1 4-4 4-6 3ZM7 12l2 4m8-4-2 4';
  else if (category.includes('tekstil'))
    path = 'm8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c-1 4-7 4-8 0Z';
  else if (category.includes('bater')) path = 'M9 3V1h6v2M6 4h12v18H6V4Zm7 3-4 7h5l-3 5';
  else if (category.includes('lijek')) path = 'm5 12 7-7a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7Zm3-3 7 7';
  else if (category.includes('elektr')) path = 'M7 2h10v20H7V2Zm4 3h2m-2 14h2';
  return (
    <svg
      className="guide-item-symbol"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function SortingIllustration() {
  return (
    <svg className="guide-sorting-art" viewBox="0 0 360 180" fill="none" aria-hidden="true">
      <path
        d="M26 139c-34-38 37-57 68-33 24-67 91-61 111-5 61-71 129-51 112-5 54 13 36 58-11 62H68Z"
        fill="#e7efdc"
      />
      <path
        d="m42 133 47-11m154 12 62-42M179 35V20m-19 21-8-12m46 12 8-12"
        stroke="#a9c38c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {(['#8ba96b', '#d8c374', '#82a6ad'] as const).map((color, index) => (
        <g key={color} transform={`translate(${82 + index * 70} ${index === 1 ? 50 : 63})`}>
          <path d="m5 24 6 92h49l6-92" fill={color} />
          <rect x="0" y="17" width="71" height="13" rx="4" fill={color} />
          <path d="M24 17v-6h23v6" stroke={color} strokeWidth="7" strokeLinejoin="round" />
          <path
            d="m27 52 8-7 9 15m-7-2 7 2 1-7m8 16 4 8-9 8H36m4-6-4 6 7 3m-14-3H19l-3-9 9-15m-2 7 2-7 7 2"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  );
}
