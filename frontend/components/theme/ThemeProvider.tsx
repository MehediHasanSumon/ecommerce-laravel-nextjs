'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme | ((theme: Theme) => Theme)) => void;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
  forcedTheme?: Theme;
};

type ThemeProviderProps = {
  children: ReactNode;
  attribute?: 'class';
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEMES: Theme[] = ['light', 'dark', 'system'];

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function getStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') return defaultTheme;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

function applyTheme(theme: Theme, systemTheme: ResolvedTheme) {
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(defaultTheme));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme = theme === 'system' && enableSystem ? systemTheme : theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    applyTheme(theme, systemTheme);
  }, [theme, systemTheme]);

  useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);
    const handleChange = () => setSystemTheme(media.matches ? 'dark' : 'light');

    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((value: Theme | ((theme: Theme) => Theme)) => {
    setThemeState((currentTheme) => {
      const nextTheme = typeof value === 'function' ? value(currentTheme) : value;

      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage failures in private browsing or locked-down environments.
      }

      return nextTheme;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem ? THEMES : THEMES.filter((item) => item !== 'system'),
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return (
    useContext(ThemeContext) ?? {
      theme: 'system' as Theme,
      setTheme: () => {},
      resolvedTheme: 'light' as ResolvedTheme,
      systemTheme: 'light' as ResolvedTheme,
      themes: THEMES,
    }
  );
}
