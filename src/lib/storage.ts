import { DOMAIN_IDS, SERVICE_IDS } from '../data/categories.ts';
import { EMPTY_FILTER, type QuestionFilter } from './filter.ts';
import { EMPTY_PROGRESS, type Progress, type QuestionStat } from './progress.ts';
import {
  COUNT_OPTIONS,
  type CountOption,
  type QuizSession,
  type SessionSummary,
} from './session.ts';

const STORAGE_KEY = 'pde-quiz:v1';
const EXPORT_APP_ID = 'pde-quiz';
const HISTORY_LIMIT = 30;

export interface Prefs {
  filter: QuestionFilter;
  count: CountOption;
}

export interface AppData {
  progress: Progress;
  session: QuizSession | null;
  history: SessionSummary[];
  prefs: Prefs;
}

export const DEFAULT_DATA: AppData = {
  progress: EMPTY_PROGRESS,
  session: null,
  history: [],
  prefs: { filter: EMPTY_FILTER, count: 10 },
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function parseProgress(v: unknown): Progress | null {
  if (!isRecord(v) || !isRecord(v.stats) || !Array.isArray(v.marked)) return null;
  const stats: Record<string, QuestionStat> = {};
  for (const [id, s] of Object.entries(v.stats)) {
    if (!isRecord(s) || !isCount(s.correct) || !isCount(s.wrong)) return null;
    stats[id] = {
      correct: s.correct,
      wrong: s.wrong,
      lastResult: s.lastResult === 'correct' ? 'correct' : 'wrong',
      lastAnsweredAt: typeof s.lastAnsweredAt === 'number' ? s.lastAnsweredAt : 0,
    };
  }
  const marked = v.marked.filter((id): id is string => typeof id === 'string');
  return { stats, marked: [...new Set(marked)] };
}

function parseFilter(v: unknown): QuestionFilter {
  if (!isRecord(v)) return EMPTY_FILTER;
  const pick = <T extends string>(arr: unknown, allowed: readonly string[]) =>
    (Array.isArray(arr) ? arr.filter((x) => allowed.includes(x)) : []) as T[];
  return {
    domains: pick(v.domains, DOMAIN_IDS),
    services: pick(v.services, SERVICE_IDS),
    markedOnly: v.markedOnly === true,
    minWrong: isCount(v.minWrong) ? v.minWrong : 0,
    unansweredOnly: v.unansweredOnly === true,
  };
}

function parseSession(v: unknown): QuizSession | null {
  if (!isRecord(v)) return null;
  if (v.mode !== 'practice' && v.mode !== 'exam') return null;
  if (!Array.isArray(v.questionIds) || !isRecord(v.choiceOrder) || !isRecord(v.answers))
    return null;
  if (!isRecord(v.results) || !isCount(v.index) || typeof v.startedAt !== 'number') return null;
  return v as unknown as QuizSession;
}

function parseHistory(v: unknown): SessionSummary[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (h): h is SessionSummary =>
        isRecord(h) &&
        (h.mode === 'practice' || h.mode === 'exam') &&
        isCount(h.total) &&
        isCount(h.correct) &&
        typeof h.finishedAt === 'number',
    )
    .slice(0, HISTORY_LIMIT);
}

function parseData(v: unknown): AppData | null {
  if (!isRecord(v)) return null;
  const progress = parseProgress(v.progress);
  if (!progress) return null;
  const prefs = isRecord(v.prefs) ? v.prefs : {};
  return {
    progress,
    session: parseSession(v.session),
    history: parseHistory(v.history),
    prefs: {
      filter: parseFilter(prefs.filter),
      count: COUNT_OPTIONS.includes(prefs.count as CountOption)
        ? (prefs.count as CountOption)
        : DEFAULT_DATA.prefs.count,
    },
  };
}

/** 保存領域が使えない環境（プライベートブラウズなど）でも、初期状態で起動できるようにする。 */
export function loadData(storage: Storage | undefined = globalThis.localStorage): AppData {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return parseData(JSON.parse(raw)) ?? DEFAULT_DATA;
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(
  data: AppData,
  storage: Storage | undefined = globalThis.localStorage,
): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function addHistory(history: SessionSummary[], summary: SessionSummary): SessionSummary[] {
  return [summary, ...history].slice(0, HISTORY_LIMIT);
}

export function exportData(data: AppData, now: number): string {
  return JSON.stringify(
    { app: EXPORT_APP_ID, version: 1, exportedAt: new Date(now).toISOString(), ...data },
    null,
    2,
  );
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; message: string };

export function importData(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: 'JSON として読み込めませんでした。' };
  }
  if (!isRecord(json) || json.app !== EXPORT_APP_ID || json.version !== 1) {
    return { ok: false, message: 'このアプリで書き出したデータではありません。' };
  }
  const data = parseData(json);
  if (!data) return { ok: false, message: 'データの形式が正しくありません。' };
  return { ok: true, data };
}

/** ブラウザに保存データを自動削除しないよう依頼する。結果は対応状況により変わる。 */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
