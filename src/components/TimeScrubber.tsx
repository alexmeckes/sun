import { useMemo } from 'react';

type Props = {
  time: Date;
  setTime: (t: Date) => void;
  onResetToNow: () => void;
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function TimeScrubber({ time, setTime, onResetToNow }: Props) {
  const dayOfYear = useMemo(() => {
    const start = new Date(time.getFullYear(), 0, 0);
    return Math.floor((time.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  }, [time]);

  const minutes = time.getHours() * 60 + time.getMinutes();

  const setDay = (d: number) => {
    const next = new Date(time.getFullYear(), 0, d);
    next.setHours(time.getHours(), time.getMinutes(), 0, 0);
    setTime(next);
  };
  const setMinutes = (m: number) => {
    const next = new Date(time);
    next.setHours(Math.floor(m / 60), m % 60, 0, 0);
    setTime(next);
  };

  return (
    <div className="scrubber">
      <div className="scrubber-row">
        <label className="scrubber-label">
          <span className="scrubber-name">Day</span>
          <span className="scrubber-value">{formatDate(time)}</span>
        </label>
        <input
          type="range"
          min={1}
          max={365}
          value={dayOfYear}
          onChange={(e) => setDay(parseInt(e.target.value))}
        />
      </div>
      <div className="scrubber-row">
        <label className="scrubber-label">
          <span className="scrubber-name">Time</span>
          <span className="scrubber-value">{formatTime(time)}</span>
        </label>
        <input
          type="range"
          min={0}
          max={1439}
          step={15}
          value={minutes}
          onChange={(e) => setMinutes(parseInt(e.target.value))}
        />
      </div>
      <button className="scrubber-now" onClick={onResetToNow}>
        Now
      </button>
    </div>
  );
}

function formatDate(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}
