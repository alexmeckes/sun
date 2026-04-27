type Props = {
  data: { monthIndex: number; hours: number }[];
  minHours: number;
  idealHours: number;
};

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const W_BAR = 22;
const H = 70;
const PAD_TOP = 8;
const PAD_BOTTOM = 14;
const MAX_HOURS = 12;

export function MonthlyChart({ data, minHours, idealHours }: Props) {
  if (!data.length) return <div className="hint-small">No data yet</div>;
  const width = data.length * W_BAR + 16;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const minLine = PAD_TOP + innerH * (1 - minHours / MAX_HOURS);
  const idealLine = PAD_TOP + innerH * (1 - idealHours / MAX_HOURS);

  return (
    <div className="monthly-chart">
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
        <line x1={8} x2={width - 8} y1={idealLine} y2={idealLine} className="thresh ideal" />
        <line x1={8} x2={width - 8} y1={minLine} y2={minLine} className="thresh min" />
        {data.map((d, i) => {
          const h = Math.min(MAX_HOURS, d.hours);
          const barH = (h / MAX_HOURS) * innerH;
          const x = 8 + i * W_BAR;
          const y = PAD_TOP + innerH - barH;
          let color = '#f85149';
          if (h >= idealHours) color = '#3fb950';
          else if (h >= minHours) color = '#d29922';
          return (
            <g key={d.monthIndex}>
              <rect x={x + 2} y={y} width={W_BAR - 6} height={barH} fill={color} rx={2} />
              <text
                x={x + (W_BAR - 4) / 2}
                y={H - 2}
                textAnchor="middle"
                className="month-lbl"
              >
                {MONTHS[d.monthIndex]}
              </text>
              <text
                x={x + (W_BAR - 4) / 2}
                y={y - 2}
                textAnchor="middle"
                className="bar-val"
              >
                {h.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span><span className="dot ideal" /> ideal {idealHours}h</span>
        <span><span className="dot min" /> min {minHours}h</span>
      </div>
    </div>
  );
}
