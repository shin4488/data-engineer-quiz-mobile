import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

vi.mock('./data/questions.ts', async () => {
  const { makeQuestion } = await import('./test-helpers.ts');
  const QUESTIONS = [
    makeQuestion('t1', { domain: 'design' }),
    makeQuestion('t2', { domain: 'store' }),
    makeQuestion('t3', { domain: 'analyze' }),
  ];
  return { QUESTIONS, QUESTION_MAP: new Map(QUESTIONS.map((q) => [q.id, q])) };
});

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** 正解は常に「選択肢 a」。表示順はシャッフルされるため、文で選ぶ。 */
const answer = (correct: boolean) => {
  click(correct ? /選択肢 a/ : /選択肢 b/);
  click('回答する');
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('練習モード', () => {
  it('回答すると正誤と解説を表示し、最後に結果をまとめて表示する', () => {
    render(<App />);
    click('練習を始める');
    expect(screen.getByText('1 / 3')).toBeTruthy();

    answer(true);
    expect(screen.getByRole('status').textContent).toBe('正解');
    expect(screen.getByRole('region', { name: '解説' })).toBeTruthy();
    click('次の問題');

    answer(false);
    expect(screen.getByRole('status').textContent).toBe('不正解');
    click('☆ 後で見直す');
    click('次の問題');

    answer(true);
    click('結果を見る');
    expect(screen.getByText('練習の結果')).toBeTruthy();
    expect(screen.getByText(/3問中 2問 正解/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '間違えた1問をもう一度解く' })).toBeTruthy();
  });

  it('間違えた回数と見直しの印で、次の出題を絞り込める', () => {
    render(<App />);
    click('練習を始める');
    answer(false);
    click('☆ 後で見直す');
    click('中断・終了のメニュー');
    click('中断してホームへ（あとで再開できます）');
    expect(screen.getByText('練習の途中です')).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(screen.getByText(/条件に合う問題/).textContent).toContain('1問');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(screen.getByText(/条件に合う問題/).textContent).toContain('0問');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('checkbox', { name: /見直しの印を付けた問題だけ/ }));
    expect(screen.getByText(/条件に合う問題/).textContent).toContain('1問');
  });

  it('中断した練習は、アプリを開き直しても続きから再開できる', () => {
    const first = render(<App />);
    click('練習を始める');
    answer(true);
    first.unmount();

    render(<App />);
    expect(screen.getByText('1 / 3問 回答済み')).toBeTruthy();
    click('続きから再開');
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('正解');
  });
});

describe('模擬試験モード', () => {
  it('解説を出さずに回答を進め、採点すると結果を表示する', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: '模擬試験' }));
    click('模擬試験を始める');
    expect(screen.queryByRole('button', { name: '回答する' })).toBeNull();
    expect(screen.getByText(/残り 2:00:00|残り 1:59:5\d/)).toBeTruthy();

    click(/選択肢 a/);
    expect(screen.queryByRole('region', { name: '解説' })).toBeNull();
    click('一覧');
    const dialog = screen.getByRole('dialog', { name: '問題の一覧' });
    fireEvent.click(within(dialog).getByRole('button', { name: '採点する' }));

    expect(screen.getByText('模擬試験の結果')).toBeTruthy();
    expect(screen.getByText(/3問中 1問 正解/)).toBeTruthy();
    expect(screen.getByText(/合格の目安（70%）まであと2問/)).toBeTruthy();
  });
});
