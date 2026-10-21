import { useEffect, useState } from 'react';
import { domainOf, serviceLabel } from '../data/categories.ts';
import type { Question } from '../data/types.ts';
import { CHOICE_LETTERS, formatQuestionForCopy } from '../lib/copy.ts';
import type { QuestionStat } from '../lib/progress.ts';
import { Diagram } from './Diagram.tsx';
import { Markdown } from './Markdown.tsx';

/** 公式ドキュメントを日本語で表示する。日本語版がないページは英語で表示される。 */
export function withJapanese(url: string): string {
  const u = new URL(url);
  u.searchParams.set('hl', 'ja');
  return u.toString();
}

export function nextSelection(question: Question, selected: string[], key: string): string[] {
  if (question.type === 'single') return [key];
  if (selected.includes(key)) return selected.filter((k) => k !== key);
  // 本番と同じく、正解の数より多くは選べない
  if (selected.length >= question.answer.length) return selected;
  return [...selected, key];
}

interface Props {
  question: Question;
  order: string[];
  selected: string[];
  /** 省略すると選択できない（模擬試験の採点後など） */
  onSelect?: (selected: string[]) => void;
  revealed: boolean;
}

export function QuestionView({ question, order, selected, onSelect, revealed }: Props) {
  const choices = new Map(question.choices.map((c) => [c.key, c]));
  return (
    <article className="question">
      <div className="chips">
        <span className="chip chip-domain">{domainOf(question.domain).short}</span>
        {question.services.map((s) => (
          <span key={s} className="chip">
            {serviceLabel(s)}
          </span>
        ))}
      </div>
      {question.type === 'multiple' && (
        <p className="multi-hint">複数選択：{question.answer.length}つ選んでください</p>
      )}
      <Markdown>{question.question}</Markdown>
      <ul className="choices">
        {order.map((key, i) => {
          const choice = choices.get(key);
          if (!choice) return null;
          const isSelected = selected.includes(key);
          const isAnswer = question.answer.includes(key);
          const state = revealed
            ? isAnswer
              ? 'is-correct'
              : isSelected
                ? 'is-wrong'
                : 'is-dim'
            : isSelected
              ? 'is-selected'
              : '';
          return (
            <li key={key}>
              <button
                type="button"
                className={`choice ${state}`}
                aria-pressed={isSelected}
                disabled={revealed || !onSelect}
                onClick={() => onSelect?.(nextSelection(question, selected, key))}
              >
                <span className="choice-letter">{CHOICE_LETTERS[i]}</span>
                <span className="choice-text">{choice.text}</span>
              </button>
              {revealed && (
                <div className={`choice-note ${isAnswer ? 'note-correct' : ''}`}>
                  {isSelected && <span className="your-answer">あなたの回答</span>}
                  {choice.note}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <CopyButton text={formatQuestionForCopy(question, order)} />
    </article>
  );
}

export function Explanation({ question, stat }: { question: Question; stat?: QuestionStat }) {
  return (
    <section className="explanation" aria-label="解説">
      <h3>解説</h3>
      <Markdown>{question.explanation}</Markdown>
      {question.diagram && <Diagram questionId={question.id} />}
      <h4>公式ドキュメント</h4>
      <ul className="refs">
        {question.references.map((r) => (
          <li key={r.url}>
            <a href={withJapanese(r.url)} target="_blank" rel="noopener noreferrer">
              {r.title}
            </a>
          </li>
        ))}
      </ul>
      {stat && (
        <p className="muted small">
          この問題の累計：正解 {stat.correct}回・不正解 {stat.wrong}回
        </p>
      )}
    </section>
  );
}

type CopyState = 'idle' | 'done' | 'failed';

/** 問題文と選択肢をクリップボードにコピーする。結果は短い間だけボタンの表示で知らせる。 */
function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(timer);
  }, [state]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('done');
    } catch {
      setState('failed');
    }
  };
  const label = {
    idle: '問題と選択肢をコピー',
    done: 'コピーしました',
    failed: 'コピーできませんでした',
  }[state];
  return (
    <button
      type="button"
      className={`copy-button ${state === 'done' ? 'is-done' : ''}`}
      onClick={copy}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        {state === 'done' ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </g>
        )}
      </svg>
      <span>{label}</span>
    </button>
  );
}
