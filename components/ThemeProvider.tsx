'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function useTheme() { return useContext(ThemeCtx); }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light') setTheme('light');
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      if (next === 'light') document.documentElement.classList.add('light');
      else document.documentElement.classList.remove('light');
      return next;
    });
  };

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}
