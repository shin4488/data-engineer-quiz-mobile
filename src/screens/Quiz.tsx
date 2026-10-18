import { useEffect, useRef, useState } from 'react';
import { Explanation, QuestionView } from '../components/QuestionView.tsx';
import { formatDuration, MarkToggle, Sheet, StarButton } from '../components/ui.tsx';
import { QUESTION_MAP } from '../data/questions.ts';
import { useNow } from '../hooks.ts';
import type { Progress } from '../lib/progress.ts';
import type { QuizSession } from '../lib/session.ts';

interface Props {
  session: QuizSession;
  progress: Progress;
  onSubmitPractice: (questionId: string, selected: string[]) => void;
  onSelectExam: (questionId: string, selected: string[]) => void;
  onMove: (index: number) => void;
  onToggleMark: (questionId: string) => void;
  onFinish: () => void;
  onLeave: () => void;
}

export function Quiz(props: Props) {
  const { session, progress } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const id = session.questionIds[session.index] as string;
  const question = QUESTION_MAP.get(id);
  const isExam = session.mode === 'exam';
  const total = session.questionIds.length;
  const marked = progress.marked.includes(id);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 問題が変わったら先頭から読めるようにする
  // biome-ignore lint/correctness/useExhaustiveDependencies: 問題の切り替えだけを契機にする
  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: 0 });
    window.scrollTo?.({ top: 0 });
  }, [session.index]);

  if (!question) {
    return (
      <div className="screen">
        <p>この問題は削除されました。</p>
        <button
          type="button"
          className="button primary"
          onClick={() => props.onMove(session.index + 1)}
        >
          次へ
        </button>
      </div>
    );
  }

  return (
    <div className="screen quiz" ref={scrollRef}>
      <header className="quiz-header">
        <button
          type="button"
          className="icon-button"
          aria-label="中断・終了のメニュー"
          onClick={() => setMenuOpen(true)}
        >
          ✕
        </button>
        <div className="quiz-progress">
          <span>
            {session.index + 1} / {total}
          </span>
          {isExam && session.deadline !== undefined && (
            <ExamTimer deadline={session.deadline} onTimeUp={props.onFinish} />
          )}
        </div>
        <StarButton marked={marked} onToggle={() => props.onToggleMark(id)} />
      </header>
      <div className="progress-track" aria-hidden="true">
        <div
          className="progress-fill"
          style={{ width: `${((session.index + 1) / total) * 100}%` }}
        />
      </div>

      {isExam ? (
        <ExamBody {...props} questionId={id} />
      ) : (
        <PracticeBody key={id} {...props} questionId={id} marked={marked} />
      )}

      <Sheet open={menuOpen} title="メニュー" onClose={() => setMenuOpen(false)}>
        <button type="button" className="button block" onClick={props.onLeave}>
          中断してホームへ（あとで再開できます）
        </button>
        {isExam && <p className="hint">模擬試験の制限時間は、中断しても進み続けます。</p>}
        <button
          type="button"
          className="button block"
          onClick={() => {
            const msg = isExam
              ? '採点して模擬試験を終了しますか？ 未回答の問題は不正解になります。'
              : 'ここで終了して結果を表示しますか？';
            if (confirm(msg)) props.onFinish();
          }}
        >
          {isExam ? '採点して終了' : 'ここで終了して結果を見る'}
        </button>
        <button type="button" className="button ghost block" onClick={() => setMenuOpen(false)}>
          キャンセル
        </button>
      </Sheet>
    </div>
  );
}

function PracticeBody({
  session,
  progress,
  questionId,
  marked,
  onSubmitPractice,
  onMove,
  onToggleMark,
  onFinish,
}: Props & { questionId: string; marked: boolean }) {
  const question = QUESTION_MAP.get(questionId);
  const answered = questionId in session.results;
  const [selected, setSelected] = useState<string[]>(session.answers[questionId] ?? []);
  if (!question) return null;
  const isLast = session.index === session.questionIds.length - 1;
  const ready = selected.length === question.answer.length;
  const correct = session.results[questionId];

  return (
    <>
      <QuestionView
        question={question}
        order={session.choiceOrder[questionId] ?? question.choices.map((c) => c.key)}
        selected={answered ? (session.answers[questionId] ?? []) : selected}
        onSelect={setSelected}
        revealed={answered}
      />
      {answered && (
        <>
          <div className={`verdict ${correct ? 'verdict-correct' : 'verdict-wrong'}`} role="status">
            {correct ? '正解' : '不正解'}
          </div>
          <MarkToggle marked={marked} onToggle={() => onToggleMark(questionId)} />
          <Explanation question={question} stat={progress.stats[questionId]} />
        </>
      )}
      <div className="action-bar">
        {answered ? (
          <button
            type="button"
            className="button primary block"
            onClick={() => (isLast ? onFinish() : onMove(session.index + 1))}
          >
            {isLast ? '結果を見る' : '次の問題'}
          </button>
        ) : (
          <button
            type="button"
            className="button primary block"
            disabled={!ready}
            onClick={() => onSubmitPractice(questionId, selected)}
          >
            {ready || question.type === 'single'
              ? '回答する'
              : `あと${question.answer.length - selected.length}つ選んでください`}
          </button>
        )}
      </div>
    </>
  );
}

function ExamBody({
  session,
  progress,
  questionId,
  onSelectExam,
  onMove,
  onFinish,
}: Props & { questionId: string }) {
  const question = QUESTION_MAP.get(questionId);
  const [paletteOpen, setPaletteOpen] = useState(false);
  if (!question) return null;
  const isFirst = session.index === 0;
  const isLast = session.index === session.questionIds.length - 1;
  const unanswered = session.questionIds.filter((id) => !session.answers[id]?.length).length;

  return (
    <>
      <QuestionView
        question={question}
        order={session.choiceOrder[questionId] ?? question.choices.map((c) => c.key)}
        selected={session.answers[questionId] ?? []}
        onSelect={(selected) => onSelectExam(questionId, selected)}
        revealed={false}
      />
      <div className="action-bar row">
        <button
          type="button"
          className="button"
          disabled={isFirst}
          onClick={() => onMove(session.index - 1)}
        >
          前へ
        </button>
        <button type="button" className="button" onClick={() => setPaletteOpen(true)}>
          一覧
        </button>
        {isLast ? (
          <button
            type="button"
            className="button primary grow"
            onClick={() => setPaletteOpen(true)}
          >
            採点へ
          </button>
        ) : (
          <button
            type="button"
            className="button primary grow"
            onClick={() => onMove(session.index + 1)}
          >
            次へ
          </button>
        )}
      </div>

      <Sheet open={paletteOpen} title="問題の一覧" onClose={() => setPaletteOpen(false)}>
        <p className="hint">未回答 {unanswered}問・★は見直しの印。番号をタップすると移動します。</p>
        <div className="palette">
          {session.questionIds.map((id, i) => {
            const done = Boolean(session.answers[id]?.length);
            const star = progress.marked.includes(id);
            return (
              <button
                type="button"
                key={id}
                className={`palette-item ${done ? 'is-done' : ''} ${i === session.index ? 'is-current' : ''}`}
                onClick={() => {
                  onMove(i);
                  setPaletteOpen(false);
                }}
                aria-label={`${i + 1}問目${done ? '（回答済み）' : '（未回答）'}${star ? '（見直し）' : ''}`}
              >
                {i + 1}
                {star && <span className="palette-star">★</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="button primary block"
          onClick={() => {
            const msg =
              unanswered > 0
                ? `未回答の問題が${unanswered}問あります。採点しますか？ 未回答は不正解になります。`
                : '採点しますか？';
            if (confirm(msg)) onFinish();
          }}
        >
          採点する
        </button>
      </Sheet>
    </>
  );
}

function ExamTimer({ deadline, onTimeUp }: { deadline: number; onTimeUp: () => void }) {
  const now = useNow(1000);
  const remaining = deadline - now;
  const fired = useRef(false);
  useEffect(() => {
    if (remaining <= 0 && !fired.current) {
      fired.current = true;
      onTimeUp();
    }
  }, [remaining, onTimeUp]);
  return (
    <span className={`timer ${remaining < 10 * 60 * 1000 ? 'is-low' : ''}`}>
      残り {formatDuration(remaining)}
    </span>
  );
}
