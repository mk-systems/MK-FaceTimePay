import { useState, useEffect } from 'react';
import { ThemeMode } from '../types';

const THEME_STORAGE_KEY = 'ftp_theme_preference_v1';

export function getStoredThemePreference(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(THEME_STORAGE_KEY);
  if (val === 'auto' || val === 'light' || val === 'dark' || val === 'system') {
    return val;
  }
  return null;
}

export function setStoredThemePreference(theme: ThemeMode | null): void {
  if (typeof window === 'undefined') return;
  if (!theme) {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  window.dispatchEvent(new CustomEvent('ftp_theme_change', { detail: theme }));
}

/**
 * Check if the current time is between 18:00 (6:00 PM) and 06:00 (6:00 AM)
 */
export function isNightTimeAuto(): boolean {
  if (typeof window === 'undefined') return false;
  const hours = new Date().getHours();
  // 18:00 to 23:59 (18,19,20,21,22,23) or 00:00 to 05:59 (0,1,2,3,4,5)
  return hours >= 18 || hours < 6;
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return isNightTimeAuto() ? 'dark' : 'light';
  }
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

export function applyThemeToDOM(effectiveTheme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Custom hook for components to read and update the current theme
 */
export function useTheme(defaultCompanyTheme: ThemeMode = 'auto') {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = getStoredThemePreference();
    return stored || defaultCompanyTheme;
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const stored = getStoredThemePreference();
    return resolveEffectiveTheme(stored || defaultCompanyTheme);
  });

  // Sync when defaultCompanyTheme changes (unless user explicitly overrode)
  useEffect(() => {
    const stored = getStoredThemePreference();
    if (!stored) {
      setThemeModeState(defaultCompanyTheme);
    }
  }, [defaultCompanyTheme]);

  // Apply theme to DOM and respond to changes
  useEffect(() => {
    const applyCurrent = () => {
      const effective = resolveEffectiveTheme(themeMode);
      setEffectiveTheme(effective);
      applyThemeToDOM(effective);
    };

    applyCurrent();

    // If in 'auto' mode (18:00 - 06:00), check periodically every 15s to auto-switch at 18:00 or 06:00
    let autoInterval: any = null;
    if (themeMode === 'auto') {
      autoInterval = setInterval(() => {
        applyCurrent();
      }, 15000);
    }

    // If system theme, listen to OS dark/light mode toggle
    let mediaListener: (() => void) | null = null;
    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const newEff = getSystemTheme();
        setEffectiveTheme(newEff);
        applyThemeToDOM(newEff);
      };
      mediaQuery.addEventListener('change', handleChange);
      mediaListener = () => mediaQuery.removeEventListener('change', handleChange);
    }

    return () => {
      if (autoInterval) clearInterval(autoInterval);
      if (mediaListener) mediaListener();
    };
  }, [themeMode]);

  // Listen to cross-component / cross-tab theme changes
  useEffect(() => {
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode | null>;
      const newMode = customEvent.detail || defaultCompanyTheme;
      setThemeModeState(newMode);
    };

    window.addEventListener('ftp_theme_change', handleCustomChange);
    return () => window.removeEventListener('ftp_theme_change', handleCustomChange);
  }, [defaultCompanyTheme]);

  const setTheme = (mode: ThemeMode, persistToUserPref: boolean = true) => {
    setThemeModeState(mode);
    if (persistToUserPref) {
      setStoredThemePreference(mode);
    }
    const eff = resolveEffectiveTheme(mode);
    setEffectiveTheme(eff);
    applyThemeToDOM(eff);
  };

  const toggleQuickTheme = () => {
    const next: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(next, true);
  };

  return {
    themeMode,
    effectiveTheme,
    setTheme,
    toggleQuickTheme,
  };
}
