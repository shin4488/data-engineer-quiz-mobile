import type { Question } from '../data/types.ts';

export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * AI チャットなどに貼り付けて質問できるよう、問題文と選択肢をテキストにまとめる。
 * 選択肢の記号は、画面に表示している順番（シャッフル後）に合わせる。
 * 貼り付けたあとに続けて質問を書けるよう、末尾に改行を2つ付ける。
 */
export function formatQuestionForCopy(question: Question, order: readonly string[]): string {
  const choices = new Map(question.choices.map((c) => [c.key, c.text]));
  const lines = order
    .filter((key) => choices.has(key))
    .map((key, i) => `${CHOICE_LETTERS[i]}. ${choices.get(key)}`);
  const hint =
    question.type === 'multiple' ? `（複数選択：${question.answer.length}つ選んでください）\n` : '';
  return `${hint}${question.question}\n\n${lines.join('\n')}\n\n`;
}
