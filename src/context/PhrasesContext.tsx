import React, { createContext, useContext, useState, useEffect } from 'react';

export type PhraseKey = 'love' | 'career' | 'invest' | 'weather' | 'global';

type PhrasesMap = Record<PhraseKey, string[]>;

interface PhrasesContextType {
  phrases: PhrasesMap;
  addPhrase: (key: PhraseKey, text: string) => void;
  deletePhrase: (key: PhraseKey, index: number) => void;
}

const PhrasesContext = createContext<PhrasesContextType | undefined>(undefined);

const STORAGE_KEY = 'qimen_phrases_v1';

const DEFAULT_PHRASES: PhrasesMap = { love: [], career: [], invest: [], weather: [], global: [] };

export const PhrasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phrases, setPhrases] = useState<PhrasesMap>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_PHRASES, ...JSON.parse(saved) };
      } catch {
        // ignore
      }
    }
    return DEFAULT_PHRASES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
  }, [phrases]);

  const addPhrase = (key: PhraseKey, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPhrases(prev => {
      if (prev[key].includes(trimmed)) return prev;
      return { ...prev, [key]: [...prev[key], trimmed] };
    });
  };

  const deletePhrase = (key: PhraseKey, index: number) => {
    setPhrases(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  return (
    <PhrasesContext.Provider value={{ phrases, addPhrase, deletePhrase }}>
      {children}
    </PhrasesContext.Provider>
  );
};

export const usePhrases = () => {
  const context = useContext(PhrasesContext);
  if (context === undefined) {
    throw new Error('usePhrases must be used within a PhrasesProvider');
  }
  return context;
};
