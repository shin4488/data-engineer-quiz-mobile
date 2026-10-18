import { type ReactNode, useEffect } from 'react';

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-layer">
      <button type="button" className="sheet-backdrop" aria-label="閉じる" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function StarButton({ marked, onToggle }: { marked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`icon-button star ${marked ? 'is-on' : ''}`}
      aria-pressed={marked}
      aria-label={marked ? '見直しの印を外す' : '後で見直す印を付ける'}
      onClick={onToggle}
    >
      {marked ? '★' : '☆'}
    </button>
  );
}

export function MarkToggle({ marked, onToggle }: { marked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`mark-toggle ${marked ? 'is-on' : ''}`}
      aria-pressed={marked}
      onClick={onToggle}
    >
      {marked ? '★ 見直しの印あり（タップで外す）' : '☆ 後で見直す'}
    </button>
  );
}

export function Bar({ value }: { value: number | null }) {
  const pct = value === null ? 0 : Math.round(value * 100);
  return (
    <div className="bar" aria-hidden="true">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export const percent = (correct: number, total: number) =>
  total === 0 ? '—' : `${Math.round((correct / total) * 100)}%`;

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
