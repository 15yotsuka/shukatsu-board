'use client';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface TimeSelectProps {
  value: string; // "HH:MM" or ""
  onChange: (value: string) => void;
  /** Extra className applied to the outer wrapper div */
  className?: string;
}

export function TimeSelect({ value, onChange, className }: TimeSelectProps) {
  const [hStr, mStr] = value ? value.split(':') : ['', ''];
  const h = hStr !== '' ? parseInt(hStr, 10) : -1;
  const m = mStr !== '' ? parseInt(mStr, 10) : -1;

  const handleHour = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newH = e.target.value;
    if (newH === '') { onChange(''); return; }
    const newM = m >= 0 ? String(m).padStart(2, '0') : '00';
    onChange(`${String(newH).padStart(2, '0')}:${newM}`);
  };

  const handleMinute = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newM = e.target.value;
    if (newM === '') { onChange(''); return; }
    const newH = h >= 0 ? String(h).padStart(2, '0') : '09';
    onChange(`${newH}:${String(newM).padStart(2, '0')}`);
  };

  const selectStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: 'var(--color-text)',
    padding: '0 2px',
    appearance: 'none',
    WebkitAppearance: 'none',
    textAlign: 'center',
    minWidth: 0,
  };

  return (
    <div
      className={`flex items-center justify-center gap-0.5 ${className ?? ''}`.trim()}
      style={{
        background: 'var(--color-bg)',
        borderRadius: '14px',
        padding: '12px 14px',
        border: '1px solid var(--color-border)',
      }}
    >
      <select value={h >= 0 ? h : ''} onChange={handleHour} style={selectStyle}>
        <option value="">--</option>
        {HOURS.map((i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
        ))}
      </select>
      <span style={{ color: 'var(--color-text)', fontSize: '15px', fontWeight: 600, lineHeight: 1 }}>:</span>
      <select value={m >= 0 && MINUTES.includes(m) ? m : ''} onChange={handleMinute} style={selectStyle}>
        <option value="">--</option>
        {MINUTES.map((i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
}
