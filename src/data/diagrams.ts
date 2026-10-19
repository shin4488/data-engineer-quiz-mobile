import manifest from './diagrams/manifest.json';

/** 問題の図。scripts/render-diagrams.ts で Mermaid から書き出した SVG 画像。 */
export interface DiagramImage {
  light: string;
  dark: string;
  width: number;
  height: number;
}

const urls = import.meta.glob<string>('./diagrams/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const sizes: Readonly<Record<string, { width: number; height: number }>> = manifest;

export function findDiagram(questionId: string): DiagramImage | undefined {
  const size = sizes[questionId];
  const light = urls[`./diagrams/${questionId}.svg`];
  const dark = urls[`./diagrams/${questionId}.dark.svg`];
  if (!size || !light || !dark) return undefined;
  return { light, dark, width: size.width, height: size.height };
}
