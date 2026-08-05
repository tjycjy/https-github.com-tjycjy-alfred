import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppMode = 'advisor' | 'client';

interface AppModeContextValue {
  mode: AppMode;
  activeClientId: string | null;
  enterClientMode: (clientId: string) => void;
  exitClientMode: () => void;
  setActiveClientId: (clientId: string | null) => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('advisor');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  const enterClientMode = (clientId: string) => {
    setActiveClientId(clientId);
    setMode('client');
  };

  const exitClientMode = () => {
    setMode('advisor');
  };

  const value: AppModeContextValue = {
    mode,
    activeClientId,
    enterClientMode,
    exitClientMode,
    setActiveClientId,
  };

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
