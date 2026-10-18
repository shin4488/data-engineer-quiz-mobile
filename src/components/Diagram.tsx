import { useEffect, useId, useRef, useState } from 'react';
import { usePrefersDark } from '../hooks.ts';

// 画面幅に合わせて縮小しすぎると文字が読めなくなるため、縮小はこの倍率までにして残りは横スクロールにする
const MIN_SCALE = 0.8;

/** 図の表示幅。画面に収まる図は元の大きさ、収まらない図は MIN_SCALE までの縮小で画面幅に合わせる。 */
export function diagramWidth(naturalWidth: number, containerWidth: number): number {
  if (naturalWidth <= containerWidth) return naturalWidth;
  return Math.max(containerWidth, naturalWidth * MIN_SCALE);
}

/** Mermaid は大きいため、図を表示するときだけ読み込む。 */
export function Diagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = usePrefersDark();
  const [failed, setFailed] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const id = `diagram-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'neutral',
          fontFamily: 'inherit',
        });
        const { svg } = await mermaid.render(id, code);
        const box = ref.current;
        if (cancelled || !box) return;
        box.innerHTML = svg;
        setFailed(false);
        const el = box.querySelector('svg');
        const natural = el?.viewBox.baseVal?.width ?? 0;
        if (el && natural > 0 && box.clientWidth > 0) {
          const width = diagramWidth(natural, box.clientWidth);
          el.style.maxWidth = 'none';
          el.style.width = `${Math.round(width)}px`;
          setScrollable(width > box.clientWidth + 1);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, dark, id]);

  if (failed) {
    return <pre className="diagram-fallback">{code}</pre>;
  }
  return (
    <figure className="diagram-figure">
      <div className="diagram" ref={ref} role="img" aria-label="解説の図" />
      {scrollable && <figcaption className="hint">図は横にスクロールできます</figcaption>}
    </figure>
  );
}
