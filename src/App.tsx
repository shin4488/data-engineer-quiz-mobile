import { useCallback, useState } from 'react';
import { QUESTION_MAP, QUESTIONS } from './data/questions.ts';
import { useAppData } from './hooks.ts';
import type { QuestionFilter } from './lib/filter.ts';
import { filterQuestions } from './lib/filter.ts';
import { toggleMark } from './lib/progress.ts';
import {
  type CountOption,
  createSession,
  EXAM_QUESTION_COUNT,
  gradeExam,
  type QuizSession,
  selectExamAnswer,
  submitPracticeAnswer,
  summarize,
} from './lib/session.ts';
import { type AppData, addHistory } from './lib/storage.ts';
import { DataScreen } from './screens/DataScreen.tsx';
import { Home } from './screens/Home.tsx';
import { Quiz } from './screens/Quiz.tsx';
import { Result } from './screens/Result.tsx';
import { Stats } from './screens/Stats.tsx';

type Tab = 'home' | 'stats' | 'data';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '出題', icon: '✎' },
  { id: 'stats', label: '成績', icon: '▤' },
  { id: 'data', label: 'データ', icon: '⚙' },
];

function finishSession(data: AppData, now: number): AppData {
  const session = data.session;
  if (!session || session.finishedAt !== undefined) return data;
  const graded =
    session.mode === 'exam'
      ? gradeExam(session, data.progress, QUESTION_MAP, now)
      : { session: { ...session, finishedAt: now }, progress: data.progress };
  const { total, correct } = summarize(graded.session, QUESTION_MAP);
  return {
    ...data,
    session: graded.session,
    progress: graded.progress,
    history:
      total > 0
        ? addHistory(data.history, {
            mode: session.mode,
            startedAt: session.startedAt,
            finishedAt: now,
            total,
            correct,
          })
        : data.history,
  };
}

export function App() {
  const { data, setData, saveFailed } = useAppData();
  const [tab, setTab] = useState<Tab>('home');
  const [inQuiz, setInQuiz] = useState(false);
  const session = data.session;

  const updateSession = useCallback(
    (fn: (s: QuizSession) => QuizSession) =>
      setData((d) => (d.session ? { ...d, session: fn(d.session) } : d)),
    [setData],
  );

  const start = (next: QuizSession, prefs?: AppData['prefs']) => {
    setData((d) => ({ ...d, session: next, ...(prefs ? { prefs } : {}) }));
    setInQuiz(true);
    window.scrollTo?.({ top: 0 });
  };

  const onFinish = useCallback(() => setData((d) => finishSession(d, Date.now())), [setData]);

  const onToggleMark = (id: string) =>
    setData((d) => ({ ...d, progress: toggleMark(d.progress, id) }));

  // 終了した回の結果は、ホームに戻るまで表示し続ける
  if (session && session.finishedAt !== undefined) {
    return (
      <Result
        session={session}
        progress={data.progress}
        onToggleMark={onToggleMark}
        onRetryWrong={() => {
          const wrong = session.questionIds
            .filter((id) => session.results[id] === false)
            .map((id) => QUESTION_MAP.get(id))
            .filter((q) => q !== undefined);
          start(createSession('practice', wrong, 'all', Date.now()));
        }}
        onClose={() => {
          setData((d) => ({ ...d, session: null }));
          setInQuiz(false);
          setTab('home');
        }}
      />
    );
  }

  if (session && inQuiz) {
    return (
      <Quiz
        session={session}
        progress={data.progress}
        onSubmitPractice={(id, selected) => {
          const question = QUESTION_MAP.get(id);
          if (!question) return;
          setData((d) => {
            if (!d.session) return d;
            const next = submitPracticeAnswer(
              d.session,
              d.progress,
              question,
              selected,
              Date.now(),
            );
            return { ...d, session: next.session, progress: next.progress };
          });
        }}
        onSelectExam={(id, selected) => updateSession((s) => selectExamAnswer(s, id, selected))}
        onMove={(index) =>
          updateSession((s) => ({
            ...s,
            index: Math.min(Math.max(0, index), s.questionIds.length - 1),
          }))
        }
        onToggleMark={onToggleMark}
        onFinish={onFinish}
        onLeave={() => setInQuiz(false)}
      />
    );
  }

  return (
    <div className="app">
      <main>
        {tab === 'home' && (
          <Home
            progress={data.progress}
            prefs={data.prefs}
            session={session}
            onStartPractice={(filter: QuestionFilter, count: CountOption) => {
              const pool = filterQuestions(QUESTIONS, filter, data.progress);
              start(createSession('practice', pool, count, Date.now()), { filter, count });
            }}
            onStartExam={() =>
              start(createSession('exam', QUESTIONS, EXAM_QUESTION_COUNT, Date.now()))
            }
            onResume={() => {
              // 中断中に制限時間を過ぎた模擬試験は、再開せずに採点する
              if (session?.deadline !== undefined && session.deadline <= Date.now()) {
                onFinish();
                return;
              }
              setInQuiz(true);
            }}
            onDiscard={() => setData((d) => ({ ...d, session: null }))}
          />
        )}
        {tab === 'stats' && <Stats progress={data.progress} history={data.history} />}
        {tab === 'data' && <DataScreen data={data} saveFailed={saveFailed} onReplace={setData} />}
      </main>
      <nav className="tab-bar" aria-label="メニュー">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            className={tab === t.id ? 'is-active' : ''}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              window.scrollTo?.({ top: 0 });
            }}
          >
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
