import { describe, expect, it } from 'vitest';
import { makeQuestion } from '../test-helpers.ts';
import { formatQuestionForCopy } from './copy.ts';

describe('formatQuestionForCopy', () => {
  it('問題文の下に、画面と同じ順番・同じ記号で選択肢を並べ、末尾に改行を2つ付ける', () => {
    const q = makeQuestion('q1');
    expect(formatQuestionForCopy(q, ['c', 'a', 'd', 'b'])).toBe(
      'q1 の問題文\n\nA. 選択肢 c\nB. 選択肢 a\nC. 選択肢 d\nD. 選択肢 b\n\n',
    );
  });

  it('複数選択の問題では、選ぶ数を先頭に書く', () => {
    const q = makeQuestion('q2', {
      type: 'multiple',
      keys: ['a', 'b', 'c', 'd', 'e'],
      answer: ['a', 'c'],
    });
    expect(formatQuestionForCopy(q, ['a', 'b', 'c', 'd', 'e'])).toBe(
      '（複数選択：2つ選んでください）\nq2 の問題文\n\nA. 選択肢 a\nB. 選択肢 b\nC. 選択肢 c\nD. 選択肢 d\nE. 選択肢 e\n\n',
    );
  });

  it('正解や解説は含めない', () => {
    const text = formatQuestionForCopy(makeQuestion('q3'), ['a', 'b', 'c', 'd']);
    expect(text).not.toContain('理由');
    expect(text).not.toContain('解説');
  });
});
