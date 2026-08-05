'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '@/lib/translations';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '@/lib/utils';

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (iso: string) => string;
  formatDateTime: (iso: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('pt'); // Default to PT or allow stored setting

  useEffect(() => {
    const stored = localStorage.getItem('workshop_language') as Language;
    if (stored === 'en' || stored === 'pt') {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('workshop_language', newLang);
  };

  const t = (key: string): string => {
    const dict = translations[lang] as Record<string, string>;
    const fallback = translations.en as Record<string, string>;
    return dict[key] || fallback[key] || String(key);
  };

  const formatCurrency = (amount: number) => formatCurrencyUtil(amount, lang);
  const formatDate = (iso: string) => formatDateUtil(iso, lang);
  const formatDateTime = (iso: string) => formatDateTimeUtil(iso, lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, formatCurrency, formatDate, formatDateTime }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
