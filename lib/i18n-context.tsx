'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, getTranslation } from './i18n';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load language from localStorage or default to ru
    try {
      const savedLang = localStorage.getItem('language') as Language | null;
      if (savedLang && (savedLang === 'ru' || savedLang === 'en')) {
        setLanguageState(savedLang);
      }
    } catch (error) {
      // localStorage might not be available
      console.error('Error loading language from localStorage:', error);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      try {
        localStorage.setItem('language', language);
      } catch (error) {
        console.error('Error saving language to localStorage:', error);
      }
      // Update HTML lang attribute
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string) => {
    return getTranslation(language, key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    // Return default values during SSR/SSG when provider is not available
    return {
      language: 'ru' as Language,
      setLanguage: () => {},
      t: (key: string) => getTranslation('ru', key),
    };
  }
  return context;
}
