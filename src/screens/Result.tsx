import { useState } from 'react';
import { Explanation, QuestionView } from '../components/QuestionView.tsx';
import { Bar, formatDuration, MarkToggle, percent, StarButton } from '../components/ui.tsx';
import { DOMAINS } from '../data/categories.ts';
import { QUESTION_MAP } from '../data/questions.ts';
import type { Progress } from '../lib/progress.ts';
import { PASS_RATE, type QuizSession, summarize } from '../lib/session.ts';

interface Props {
  session: QuizSession;
  progress: Progress;
  onToggleMark: (questionId: string) => void;
  onRetryWrong: () => void;
  onClose: () => void;
}

export function Result({ session, progress, onToggleMark, onRetryWrong, onClose }: Props) {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const { total, correct, byDomain } = summarize(session, QUESTION_MAP);
  const isExam = session.mode === 'exam';
  const rate = total === 0 ? 0 : correct / total;
  const wrongCount = total - correct;
  const passNeeded = Math.ceil(total * PASS_RATE) - correct;

  if (reviewId) {
    const question = QUESTION_MAP.get(reviewId);
    const ids = session.questionIds.filter((id) => id in session.results);
    const pos = ids.indexOf(reviewId);
    if (question) {
      const marked = progress.marked.includes(reviewId);
      return (
        <div className="screen quiz">
          <header className="quiz-header">
            <button
              type="button"
              className="icon-button"
              aria-label="結果に戻る"
              onClick={() => setReviewId(null)}
            >
              ←
            </button>
            <div className="quiz-progress">
              {pos + 1} / {ids.length}
            </div>
            <StarButton marked={marked} onToggle={() => onToggleMark(reviewId)} />
          </header>
          <QuestionView
            question={question}
            order={session.choiceOrder[reviewId] ?? question.choices.map((c) => c.key)}
            selected={session.answers[reviewId] ?? []}
            revealed
          />
          <div
            className={`verdict ${session.results[reviewId] ? 'verdict-correct' : 'verdict-wrong'}`}
          >
            {session.results[reviewId]
              ? '正解'
              : session.answers[reviewId]?.length
                ? '不正解'
                : '未回答'}
          </div>
          <MarkToggle marked={marked} onToggle={() => onToggleMark(reviewId)} />
          <Explanation question={question} stat={progress.stats[reviewId]} />
          <div className="action-bar row">
            <button
              type="button"
              className="button"
              disabled={pos <= 0}
              onClick={() => setReviewId(ids[pos - 1] ?? null)}
            >
              前へ
            </button>
            <button type="button" className="button grow" onClick={() => setReviewId(null)}>
              結果に戻る
            </button>
            <button
              type="button"
              className="button"
              disabled={pos >= ids.length - 1}
              onClick={() => setReviewId(ids[pos + 1] ?? null)}
            >
              次へ
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>{isExam ? '模擬試験の結果' : '練習の結果'}</h1>
      </header>

      <section className="card score-card">
        <p className="score">{percent(correct, total)}</p>
        <p>
          {total}問中 {correct}問 正解
          {session.finishedAt !== undefined && (
            <span className="muted">
              ・{formatDuration(session.finishedAt - session.startedAt)}
            </span>
          )}
        </p>
        {isExam && (
          <p className={rate >= PASS_RATE ? 'pass' : 'fail'}>
            {rate >= PASS_RATE
              ? `合格の目安（${PASS_RATE * 100}%）を超えています`
              : `合格の目安（${PASS_RATE * 100}%）まであと${passNeeded}問`}
          </p>
        )}
      </section>

      <section className="card">
        <h2>分野別</h2>
        <ul className="stat-list">
          {DOMAINS.filter((d) => byDomain[d.id].total > 0).map((d) => (
            <li key={d.id}>
              <div className="stat-row">
                <span>{d.label}</span>
                <span className="muted">
                  {byDomain[d.id].correct}/{byDomain[d.id].total}・
                  {percent(byDomain[d.id].correct, byDomain[d.id].total)}
                </span>
              </div>
              <Bar value={byDomain[d.id].correct / byDomain[d.id].total} />
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>問題ごとの結果</h2>
        <p className="hint">タップすると解説を表示します。</p>
        <ul className="result-list">
          {session.questionIds
            .filter((id) => id in session.results)
            .map((id, i) => {
              const q = QUESTION_MAP.get(id);
              if (!q) return null;
              const ok = session.results[id];
              return (
                <li key={id}>
                  <button type="button" className="result-item" onClick={() => setReviewId(id)}>
                    <span className={ok ? 'mark-ok' : 'mark-ng'} aria-hidden="true">
                      {ok ? '○' : '×'}
                    </span>
                    <span className="sr-only">{ok ? '正解' : '不正解'}</span>
                    <span className="result-text">
                      {i + 1}. {q.question.replace(/\s+/g, ' ').slice(0, 60)}…
                    </span>
                    {progress.marked.includes(id) && <span className="star-small">★</span>}
                  </button>
                </li>
              );
            })}
        </ul>
      </section>

      <div className="action-bar column">
        {wrongCount > 0 && (
          <button type="button" className="button block" onClick={onRetryWrong}>
            間違えた{wrongCount}問をもう一度解く
          </button>
        )}
        <button type="button" className="button primary block" onClick={onClose}>
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
