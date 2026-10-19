import { useLayoutEffect, useRef, useState } from 'react';
import { findDiagram } from '../data/diagrams.ts';

// 画面幅に合わせて縮小しすぎると文字が読めなくなるため、縮小はこの倍率までにして残りは横スクロールにする
const MIN_SCALE = 0.8;

/** 図の表示幅。画面に収まる図は元の大きさ、収まらない図は MIN_SCALE までの縮小で画面幅に合わせる。 */
export function diagramWidth(naturalWidth: number, containerWidth: number): number {
  if (naturalWidth <= containerWidth) return naturalWidth;
  return Math.max(containerWidth, naturalWidth * MIN_SCALE);
}

/** 解説の図。書き出し済みの SVG 画像を、端末の配色（ライト・ダーク）に合わせて表示する。 */
export function Diagram({ questionId }: { questionId: string }) {
  const image = findDiagram(questionId);
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    setContainerWidth(ref.current?.clientWidth ?? 0);
  }, []);

  if (!image) return null;
  const width = containerWidth > 0 ? diagramWidth(image.width, containerWidth) : image.width;
  return (
    <figure className="diagram-figure">
      <div className="diagram" ref={ref}>
        <picture>
          <source srcSet={image.dark} media="(prefers-color-scheme: dark)" />
          <img
            src={image.light}
            alt="解説の図"
            width={Math.round(width)}
            height={Math.round((width * image.height) / image.width)}
          />
        </picture>
      </div>
      {containerWidth > 0 && width > containerWidth + 1 && (
        <figcaption className="hint">図は横にスクロールできます</figcaption>
      )}
    </figure>
  );
}
