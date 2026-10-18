import { Bar, formatDate, percent } from '../components/ui.tsx';
import { DOMAINS, SERVICES } from '../data/categories.ts';
import { QUESTIONS } from '../data/questions.ts';
import type { Question } from '../data/types.ts';
import type { Progress } from '../lib/progress.ts';
import type { SessionSummary } from '../lib/session.ts';

interface Aggregate {
  questions: number;
  answered: number;
  correct: number;
  attempts: number;
}

function aggregate(questions: readonly Question[], progress: Progress): Aggregate {
  const result = { questions: questions.length, answered: 0, correct: 0, attempts: 0 };
  for (const q of questions) {
    const s = progress.stats[q.id];
    if (!s) continue;
    result.answered++;
    result.correct += s.correct;
    result.attempts += s.correct + s.wrong;
  }
  return result;
}

function AggregateRow({ label, agg }: { label: string; agg: Aggregate }) {
  return (
    <li>
      <div className="stat-row">
        <span>{label}</span>
        <span className="muted">
          解いた {agg.answered}/{agg.questions}・正答率 {percent(agg.correct, agg.attempts)}
        </span>
      </div>
      <Bar value={agg.attempts === 0 ? null : agg.correct / agg.attempts} />
    </li>
  );
}

export function Stats({ progress, history }: { progress: Progress; history: SessionSummary[] }) {
  const all = aggregate(QUESTIONS, progress);
  const everWrong = QUESTIONS.filter((q) => (progress.stats[q.id]?.wrong ?? 0) > 0).length;
  const services = SERVICES.map((s) => ({
    ...s,
    agg: aggregate(
      QUESTIONS.filter((q) => q.services.includes(s.id)),
      progress,
    ),
  })).filter((s) => s.agg.questions > 0);

  return (
    <div className="screen">
      <header className="app-header">
        <h1>成績</h1>
      </header>

      <section className="card tiles">
        <div className="tile">
          <span className="tile-value">
            {all.answered}
            <small>/{all.questions}</small>
          </span>
          <span className="tile-label">解いた問題</span>
        </div>
        <div className="tile">
          <span className="tile-value">{percent(all.correct, all.attempts)}</span>
          <span className="tile-label">累計の正答率</span>
        </div>
        <div className="tile">
          <span className="tile-value">{everWrong}</span>
          <span className="tile-label">間違えたことがある問題</span>
        </div>
        <div className="tile">
          <span className="tile-value">{progress.marked.length}</span>
          <span className="tile-label">★ 見直しの印</span>
        </div>
      </section>

      <section className="card">
        <h2>分野別</h2>
        <ul className="stat-list">
          {DOMAINS.map((d) => (
            <AggregateRow
              key={d.id}
              label={d.label}
              agg={aggregate(
                QUESTIONS.filter((q) => q.domain === d.id),
                progress,
              )}
            />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>サービス別</h2>
        <p className="hint">1つの問題が複数のサービスに数えられます。</p>
        <ul className="stat-list">
          {services.map((s) => (
            <AggregateRow key={s.id} label={s.label} agg={s.agg} />
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>最近の結果</h2>
        {history.length === 0 ? (
          <p className="muted">まだ結果がありません。</p>
        ) : (
          <ul className="history-list">
            {history.map((h) => (
              <li key={`${h.startedAt}-${h.finishedAt}`}>
                <span>{formatDate(h.finishedAt)}</span>
                <span>{h.mode === 'exam' ? '模擬試験' : '練習'}</span>
                <span>
                  {h.correct}/{h.total}（{percent(h.correct, h.total)}）
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
