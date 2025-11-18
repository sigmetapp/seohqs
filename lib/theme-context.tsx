'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load theme from localStorage or default to dark
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      // localStorage might not be available
      console.error('Error loading theme from localStorage:', error);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      try {
        localStorage.setItem('theme', theme);
      } catch (error) {
        console.error('Error saving theme to localStorage:', error);
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values during SSR/SSG when provider is not available
    return {
      theme: 'dark' as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
