import { useEffect, useRef, useState } from 'react';

export function useCompactChart() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const change = () => setCompact(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  return compact;
}

// Recharts remembers touch selections; dismiss them on the next outside tap.
export function useDismissibleChartTooltip() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [touchDevice, setTouchDevice] = useState(false);
  const [active, setActive] = useState(false);
  const tapMode = touchDevice;
  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const update = () => setTouchDevice(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!tapMode) return;
    const select = (event: PointerEvent) => {
      const mark =
        event.target instanceof Element
          ? event.target.closest(
              '.recharts-bar-rectangle, .recharts-dot, .recharts-line-curve, .recharts-area-area',
            )
          : null;
      setActive(Boolean(mark && chartRef.current?.contains(mark)));
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(false);
    };
    document.addEventListener('pointerdown', select, true);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', select, true);
      document.removeEventListener('keydown', escape);
    };
  }, [tapMode]);
  return {
    chartRef,
    tooltipInteraction: {
      trigger: tapMode ? ('click' as const) : ('hover' as const),
      active: tapMode ? active : undefined,
    },
  };
}

export function compactTick(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    notation: Math.abs(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; patterned?: boolean }[];
}) {
  return (
    <ul className="chart-series-legend chart-legend-outside" aria-label="Legenda grafa">
      {items.map((item) => (
        <li key={item.label}>
          <span
            aria-hidden="true"
            style={{
              backgroundColor: item.color,
              ...(item.patterned
                ? {
                    backgroundImage:
                      'repeating-linear-gradient(135deg, transparent 0 3px, #ffffffaa 3px 4px)',
                  }
                : {}),
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export const chartTooltipStyle = {
  width: 'min(230px, calc(100vw - 80px))',
  maxWidth: '100%',
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  fontSize: 'clamp(11px, 2.8vw, 13px)',
  lineHeight: 1.4,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #dce3d9',
  boxShadow: '0 3px 12px #183c2920',
};

export function ChartCategoryTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const name = String(payload?.value ?? '');
  const words = name.split(/\s+/).flatMap((word) => word.match(/.{1,14}/gu) ?? []);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 14) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  const displayed = lines.slice(0, 3);
  if (lines.length > 3) displayed[2] += '…';
  return (
    <text x={x} y={y} textAnchor="middle" fill="#59675e" fontSize={10}>
      <title>{name}</title>
      {displayed.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 14 : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function ChartPlaceTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const name = String(payload?.value ?? '');
  const words = name.split(/\s+/).flatMap((word) => word.match(/.{1,14}/gu) ?? []);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= 14) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  const displayed = lines.slice(0, 2);
  if (lines.length > 2) displayed[1] += '…';
  return (
    <text x={x - 2} y={y} textAnchor="end" fill="#59675e" fontSize={10}>
      <title>{name}</title>
      {displayed.map((line, index) => (
        <tspan key={index} x={x - 2} dy={index === 0 ? (displayed.length > 1 ? -3 : 3) : 13}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
