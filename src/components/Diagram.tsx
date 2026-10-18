import { useEffect, useId, useRef, useState } from 'react';
import { usePrefersDark } from '../hooks.ts';

/** Mermaid は大きいため、図を表示するときだけ読み込む。 */
export function Diagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = usePrefersDark();
  const [failed, setFailed] = useState(false);
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
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setFailed(false);
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
  return <div className="diagram" ref={ref} role="img" aria-label="解説の図" />;
}
