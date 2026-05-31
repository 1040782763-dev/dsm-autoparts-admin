import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh');

  const t = useCallback((key, fallback) => {
    return translations[lang]?.[key] || translations['zh']?.[key] || fallback || key;
  }, [lang]);

  const toggleLang = useCallback(() => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    localStorage.setItem('lang', next);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { t: (k, f) => f || k, lang: 'zh', toggleLang: () => {} };
  return ctx;
}

export default I18nContext;
