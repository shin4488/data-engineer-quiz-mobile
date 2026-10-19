import { createHash } from 'node:crypto';

/**
 * 図の元データ（Mermaid）のハッシュ。書き出した SVG が元データと合っているかの確認に使う。
 * scripts/render-diagrams.ts とテストで共有する。
 */
export function diagramHash(code: string): string {
  return createHash('sha256').update(code).digest('hex').slice(0, 16);
}
