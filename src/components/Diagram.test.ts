import { describe, expect, it } from 'vitest';
import { diagramWidth } from './Diagram.tsx';

describe('diagramWidth', () => {
  it('画面に収まる図は元の大きさで表示する', () => {
    expect(diagramWidth(300, 330)).toBe(300);
  });

  it('少しはみ出す図は、画面幅まで縮小する', () => {
    expect(diagramWidth(400, 330)).toBe(330);
  });

  it('大きくはみ出す図は80%までの縮小にとどめ、残りは横スクロールにする', () => {
    expect(diagramWidth(660, 330)).toBe(528);
  });
});
