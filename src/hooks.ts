import { useEffect, useState } from 'react';
import { type AppData, loadData, saveData } from './lib/storage.ts';

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    setSaveFailed(!saveData(data));
  }, [data]);
  return { data, setData, saveFailed };
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() => globalThis.matchMedia?.(DARK_QUERY).matches ?? false);
  useEffect(() => {
    const media = globalThis.matchMedia?.(DARK_QUERY);
    if (!media) return;
    const onChange = () => setDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
