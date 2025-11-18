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
    setMounted(true);
    // Load language from localStorage or default to ru
    const savedLang = localStorage.getItem('language') as Language | null;
    if (savedLang && (savedLang === 'ru' || savedLang === 'en')) {
      setLanguageState(savedLang);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('language', language);
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

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
