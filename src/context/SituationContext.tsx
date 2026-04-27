import React, { createContext, useContext, useState } from 'react';

export type SituationKey = 'love' | 'career' | 'invest' | 'weather' | null;

interface SituationContextValue {
  situationKey: SituationKey;
  setSituationKey: (key: SituationKey) => void;
}

const SituationContext = createContext<SituationContextValue | null>(null);

export const SituationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [situationKey, setSituationKey] = useState<SituationKey>(null);
  return (
    <SituationContext.Provider value={{ situationKey, setSituationKey }}>
      {children}
    </SituationContext.Provider>
  );
};

export const useSituation = (): SituationContextValue => {
  const ctx = useContext(SituationContext);
  if (!ctx) throw new Error('useSituation must be used inside SituationProvider');
  return ctx;
};
