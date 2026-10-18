import type { Question } from './types.ts';
import { parseQuestionFile } from './validate.ts';

const files = import.meta.glob<unknown>('./questions/*.yaml', { eager: true, import: 'default' });

function load(): Question[] {
  const all: Question[] = [];
  for (const [path, data] of Object.entries(files)) {
    const base = path.replace(/^.*\/(.+)\.yaml$/, '$1');
    const { questions, errors } = parseQuestionFile(base, data);
    // 不正な問題はテストで検出する。配信後に1問の誤りで全体が止まらないよう、読み飛ばす。
    for (const e of errors) console.error(e);
    all.push(...questions);
  }
  return all;
}

export const QUESTIONS: readonly Question[] = load();
export const QUESTION_MAP: ReadonlyMap<string, Question> = new Map(QUESTIONS.map((q) => [q.id, q]));
