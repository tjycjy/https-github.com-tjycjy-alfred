import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppMode = 'advisor' | 'client';

interface AppModeContextValue {
  mode: AppMode;
  activeClientId: string | null;
  enterClientMode: (clientId: string) => void;
  exitClientMode: () => void;
  setActiveClientId: (clientId: string | null) => void;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>('advisor');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(true);

  const enterClientMode = (clientId: string) => {
    setActiveClientId(clientId);
    setMode('client');
  };

  const exitClientMode = () => {
    setMode('advisor');
  };

  const togglePrivacyMode = () => setPrivacyMode((p) => !p);

  const value: AppModeContextValue = {
    mode,
    activeClientId,
    enterClientMode,
    exitClientMode,
    setActiveClientId,
    privacyMode,
    togglePrivacyMode,
  };

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
