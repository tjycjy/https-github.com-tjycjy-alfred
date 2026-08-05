import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSettings, saveSettings } from '../db/settings';
import { hashPin, randomSalt } from '../lib/crypto';
import { isWebAuthnSupported, registerBiometricCredential, verifyBiometricCredential } from '../lib/webauthn';

interface AuthContextValue {
  loading: boolean;
  pinConfigured: boolean;
  biometricConfigured: boolean;
  biometricSupported: boolean;
  locked: boolean;
  onboardingComplete: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  setupPin: (pin: string) => Promise<void>;
  setupBiometric: (advisorName: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [pinSalt, setPinSalt] = useState<string | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [locked, setLocked] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  const refresh = useCallback(async () => {
    const settings = await getSettings();
    setPinHash(settings.pinHash);
    setPinSalt(settings.pinSalt);
    setCredentialId(settings.webauthnCredentialId);
    setBiometricEnabled(settings.biometricEnabled);
    setOnboardingComplete(settings.onboardingComplete);
    setLoading(false);
    if (!settings.pinHash) {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unlockWithPin = useCallback(
    async (pin: string) => {
      if (!pinHash || !pinSalt) return false;
      const attempt = await hashPin(pin, pinSalt);
      const ok = attempt === pinHash;
      if (ok) setLocked(false);
      return ok;
    },
    [pinHash, pinSalt],
  );

  const unlockWithBiometric = useCallback(async () => {
    if (!credentialId) return false;
    const ok = await verifyBiometricCredential(credentialId);
    if (ok) setLocked(false);
    return ok;
  }, [credentialId]);

  const lock = useCallback(() => setLocked(true), []);

  const setupPin = useCallback(async (pin: string) => {
    const salt = randomSalt();
    const hash = await hashPin(pin, salt);
    const settings = await getSettings();
    settings.pinHash = hash;
    settings.pinSalt = salt;
    await saveSettings(settings);
    setPinHash(hash);
    setPinSalt(salt);
    setLocked(false);
  }, []);

  const setupBiometric = useCallback(async (advisorName: string) => {
    const id = await registerBiometricCredential(advisorName);
    const settings = await getSettings();
    settings.webauthnCredentialId = id;
    settings.biometricEnabled = true;
    await saveSettings(settings);
    setCredentialId(id);
    setBiometricEnabled(true);
  }, []);

  const disableBiometric = useCallback(async () => {
    const settings = await getSettings();
    settings.webauthnCredentialId = null;
    settings.biometricEnabled = false;
    await saveSettings(settings);
    setCredentialId(null);
    setBiometricEnabled(false);
  }, []);

  const completeOnboarding = useCallback(async () => {
    const settings = await getSettings();
    settings.onboardingComplete = true;
    await saveSettings(settings);
    setOnboardingComplete(true);
  }, []);

  const value: AuthContextValue = {
    loading,
    pinConfigured: !!pinHash,
    biometricConfigured: !!credentialId && biometricEnabled,
    biometricSupported: isWebAuthnSupported(),
    locked,
    onboardingComplete,
    unlockWithPin,
    unlockWithBiometric,
    lock,
    setupPin,
    setupBiometric,
    disableBiometric,
    completeOnboarding,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
