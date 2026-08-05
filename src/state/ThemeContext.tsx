import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSettings, saveSettings } from '../db/settings';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedDark: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveDark(theme: ThemePreference): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [resolvedDark, setResolvedDark] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      setThemeState(settings.theme);
      const dark = resolveDark(settings.theme);
      setResolvedDark(dark);
      applyTheme(dark);
    });
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setResolvedDark(mq.matches);
      applyTheme(mq.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback(async (next: ThemePreference) => {
    const settings = await getSettings();
    settings.theme = next;
    await saveSettings(settings);
    setThemeState(next);
    const dark = resolveDark(next);
    setResolvedDark(dark);
    applyTheme(dark);
  }, []);

  const toggleTheme = useCallback(async () => {
    await setTheme(resolvedDark ? 'light' : 'dark');
  }, [resolvedDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedDark, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
