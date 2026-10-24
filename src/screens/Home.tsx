import { useMemo, useState } from 'react';
import { formatDuration } from '../components/ui.tsx';
import { DOMAINS, type DomainId, SERVICES, type ServiceId } from '../data/categories.ts';
import { QUESTIONS } from '../data/questions.ts';
import {
  countByCategory,
  EMPTY_FILTER,
  filterQuestions,
  type QuestionFilter,
} from '../lib/filter.ts';
import type { Progress } from '../lib/progress.ts';
import {
  COUNT_OPTIONS,
  type CountOption,
  EXAM_DURATION_MS,
  EXAM_QUESTION_COUNT,
  PASS_RATE,
  type QuizSession,
} from '../lib/session.ts';
import type { Prefs } from '../lib/storage.ts';

const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

// 問題が1問もないサービスは選択肢に出さない
const SERVICES_WITH_QUESTIONS = new Set(QUESTIONS.flatMap((q) => q.services));
const AVAILABLE_SERVICES = SERVICES.filter((s) => SERVICES_WITH_QUESTIONS.has(s.id));

interface Props {
  progress: Progress;
  prefs: Prefs;
  session: QuizSession | null;
  onStartPractice: (filter: QuestionFilter, count: CountOption) => void;
  onStartExam: () => void;
  onResume: () => void;
  onDiscard: () => void;
}

export function Home(props: Props) {
  const { progress, prefs, session } = props;
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const unfinished = session && session.finishedAt === undefined ? session : null;

  return (
    <div className="screen">
      <header className="app-header">
        <h1>PDE 対策問題集</h1>
        <p className="muted small">全{QUESTIONS.length}問</p>
      </header>

      {unfinished && (
        <ResumeCard session={unfinished} onResume={props.onResume} onDiscard={props.onDiscard} />
      )}

      <div className="segmented" role="tablist" aria-label="出題モード">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'practice'}
          className={mode === 'practice' ? 'is-active' : ''}
          onClick={() => setMode('practice')}
        >
          練習
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'exam'}
          className={mode === 'exam' ? 'is-active' : ''}
          onClick={() => setMode('exam')}
        >
          模擬試験
        </button>
      </div>

      {mode === 'practice' ? (
        <PracticeSetup
          key={JSON.stringify(prefs)}
          progress={progress}
          prefs={prefs}
          disabled={Boolean(unfinished)}
          onStart={props.onStartPractice}
        />
      ) : (
        <ExamSetup disabled={Boolean(unfinished)} onStart={props.onStartExam} />
      )}
    </div>
  );
}

function ResumeCard({
  session,
  onResume,
  onDiscard,
}: {
  session: QuizSession;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const total = session.questionIds.length;
  const done =
    session.mode === 'exam'
      ? Object.values(session.answers).filter((a) => a.length > 0).length
      : Object.keys(session.results).length;
  return (
    <section className="card resume-card">
      <h2>{session.mode === 'exam' ? '模擬試験' : '練習'}の途中です</h2>
      <p className="muted">
        {done} / {total}問 回答済み
        {session.deadline !== undefined &&
          `・残り ${formatDuration(session.deadline - Date.now())}`}
      </p>
      <div className="row">
        <button type="button" className="button primary" onClick={onResume}>
          続きから再開
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => {
            if (confirm('途中の回答を破棄しますか？ 回答済みの問題の成績は残ります。')) onDiscard();
          }}
        >
          破棄
        </button>
      </div>
    </section>
  );
}

function PracticeSetup({
  progress,
  prefs,
  disabled,
  onStart,
}: {
  progress: Progress;
  prefs: Prefs;
  disabled: boolean;
  onStart: (filter: QuestionFilter, count: CountOption) => void;
}) {
  const [filter, setFilter] = useState<QuestionFilter>(prefs.filter);
  const [count, setCount] = useState<CountOption>(prefs.count);
  const matched = useMemo(
    () => filterQuestions(QUESTIONS, filter, progress).length,
    [filter, progress],
  );
  const categoryCounts = useMemo(
    () => countByCategory(QUESTIONS, filter, progress),
    [filter, progress],
  );
  const toAsk = count === 'all' ? matched : Math.min(count, matched);
  const maxWrong = Math.max(0, ...Object.values(progress.stats).map((s) => s.wrong));
  const wrongOptions = Array.from({ length: Math.max(5, maxWrong) }, (_, i) => i + 1);
  const set = (patch: Partial<QuestionFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <>
      <section className="card">
        <h2>分野</h2>
        <p className="hint">
          選ばなければ全分野から出題します。数字は、ほかの絞り込み条件で出題される問題数です。
        </p>
        <div className="chip-group">
          {DOMAINS.map((d) => (
            <FilterChip
              key={d.id}
              label={d.label}
              count={categoryCounts.domains.get(d.id) ?? 0}
              selected={filter.domains.includes(d.id)}
              onClick={() => set({ domains: toggle<DomainId>(filter.domains, d.id) })}
            />
          ))}
        </div>

        <details className="service-filter" open={filter.services.length > 0}>
          <summary>
            サービスで絞り込む
            {filter.services.length > 0 && `（${filter.services.length}件選択中）`}
          </summary>
          <p className="hint">選んだサービスのどれかに関係する問題を出題します。</p>
          <div className="chip-group">
            {AVAILABLE_SERVICES.map((s) => (
              <FilterChip
                key={s.id}
                label={s.label}
                count={categoryCounts.services.get(s.id) ?? 0}
                selected={filter.services.includes(s.id)}
                onClick={() => set({ services: toggle<ServiceId>(filter.services, s.id) })}
              />
            ))}
          </div>
        </details>
      </section>

      <section className="card">
        <h2>絞り込み</h2>
        <label className="switch-row">
          <span>
            ★ 見直しの印を付けた問題だけ
            <span className="muted small">（{progress.marked.length}問）</span>
          </span>
          <input
            type="checkbox"
            checked={filter.markedOnly}
            onChange={(e) => set({ markedOnly: e.target.checked })}
          />
        </label>
        {/* 未回答の問題は間違えた回数が0回のため、2つの条件を同時に指定すると1問も当てはまらない。一方を変えたら、もう一方を解除する */}
        <label className="switch-row">
          <span>間違えた回数</span>
          <select
            value={filter.minWrong}
            onChange={(e) => set({ minWrong: Number(e.target.value), unansweredOnly: false })}
          >
            <option value={0}>指定なし</option>
            {wrongOptions.map((n) => (
              <option key={n} value={n}>
                {n}回以上
              </option>
            ))}
          </select>
        </label>
        <label className="switch-row">
          <span>まだ解いていない問題だけ</span>
          <input
            type="checkbox"
            checked={filter.unansweredOnly}
            onChange={(e) => set({ unansweredOnly: e.target.checked, minWrong: 0 })}
          />
        </label>
      </section>

      <section className="card">
        <h2>出題数</h2>
        <fieldset className="segmented small">
          <legend className="sr-only">出題数</legend>
          {COUNT_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              aria-pressed={count === c}
              className={count === c ? 'is-active' : ''}
              onClick={() => setCount(c)}
            >
              {c === 'all' ? '全部' : c}
            </button>
          ))}
        </fieldset>
      </section>

      <div className="start-bar">
        <p className="match" aria-live="polite">
          条件に合う問題 <strong>{matched}</strong>問
          {matched > 0 && <>から {toAsk}問をランダムに出題</>}
        </p>
        <div className="row">
          <button
            type="button"
            className="button ghost"
            onClick={() => {
              setFilter(EMPTY_FILTER);
              setCount(10);
            }}
          >
            条件解除
          </button>
          <button
            type="button"
            className="button primary grow"
            disabled={matched === 0 || disabled}
            onClick={() => onStart(filter, count)}
          >
            {disabled ? '途中の問題を先に終えてください' : '練習を始める'}
          </button>
        </div>
      </div>
    </>
  );
}

function FilterChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`filter-chip ${selected ? 'is-selected' : count === 0 ? 'is-empty' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
      <span className="chip-count">{count}</span>
    </button>
  );
}

function ExamSetup({ disabled, onStart }: { disabled: boolean; onStart: () => void }) {
  const count = Math.min(EXAM_QUESTION_COUNT, QUESTIONS.length);
  return (
    <section className="card">
      <h2>本番と同じ条件で解く</h2>
      <ul className="plain-list">
        <li>全範囲からランダムに {count}問</li>
        <li>制限時間 {EXAM_DURATION_MS / 60000}分。時間になると自動で採点します</li>
        <li>解説は採点後にまとめて表示します</li>
        <li>
          合格の目安は正答率 {PASS_RATE * 100}%（Google は合格点を公表していないため目安です）
        </li>
        <li>回答した問題は、練習と同じく成績と間違えた回数に記録します</li>
      </ul>
      <button type="button" className="button primary block" disabled={disabled} onClick={onStart}>
        {disabled ? '途中の問題を先に終えてください' : '模擬試験を始める'}
      </button>
    </section>
  );
}
