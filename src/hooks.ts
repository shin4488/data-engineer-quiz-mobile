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

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
