import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diagramHash } from './diagram-hash.ts';
import { findDiagram } from './diagrams.ts';
import { QUESTIONS } from './questions.ts';

const dir = join(import.meta.dirname, 'diagrams');
const manifest: Record<string, { hash: string }> = JSON.parse(
  readFileSync(join(dir, 'manifest.json'), 'utf8'),
);
const withDiagram = QUESTIONS.filter((q) => q.diagram);

describe('図の画像', () => {
  it('図のある問題はすべて、元データと同じ内容の画像を書き出してある（npm run render:diagrams）', () => {
    const stale = withDiagram
      .filter(
        (q) =>
          manifest[q.id]?.hash !== diagramHash(q.diagram ?? '') ||
          !existsSync(join(dir, `${q.id}.svg`)) ||
          !existsSync(join(dir, `${q.id}.dark.svg`)),
      )
      .map((q) => q.id);
    expect(stale).toEqual([]);
  });

  it('図のない問題の画像は残っていない', () => {
    const ids = new Set(withDiagram.map((q) => q.id));
    const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
    expect(files.filter((f) => !ids.has(f.replace(/(\.dark)?\.svg$/, '')))).toEqual([]);
    expect(Object.keys(manifest).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('アプリから、ライト用とダーク用の画像と大きさを取得できる', () => {
    const q = withDiagram[0];
    expect(q).toBeDefined();
    const image = findDiagram(q?.id ?? '');
    expect(image?.light).toMatch(/\.svg$/);
    expect(image?.dark).toMatch(/\.dark.*\.svg$/);
    expect(image?.width).toBeGreaterThan(0);
    expect(image?.height).toBeGreaterThan(0);
    expect(findDiagram('no-such-question')).toBeUndefined();
  });
});
