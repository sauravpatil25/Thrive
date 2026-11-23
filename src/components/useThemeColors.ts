import { useEffect, useState } from 'react';

const NAMES = ['primary', 'muted', 'line', 'amber', 'ink', 'card'] as const;
type Colors = Record<(typeof NAMES)[number], string>;

function read(): Colors {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(NAMES.map((n) => [n, `rgb(${s.getPropertyValue(`--${n}`).trim().split(/\s+/).join(',')})`])) as Colors;
}

/** Resolved theme colours for libraries (charts) that need literal colour values. */
export function useThemeColors(): Colors {
  const [c, setC] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setC(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return c;
}
