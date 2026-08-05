import { useEffect, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { PinPad } from './PinPad';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function LockScreen() {
  const { pinConfigured, biometricConfigured, unlockWithPin, unlockWithBiometric } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [tryingBiometric, setTryingBiometric] = useState(false);

  const tryBiometric = async () => {
    setTryingBiometric(true);
    setError(null);
    const ok = await unlockWithBiometric();
    setTryingBiometric(false);
    if (!ok) setError('Face ID / Touch ID failed. Please use your PIN.');
  };

  useEffect(() => {
    if (biometricConfigured) {
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePin = async (pin: string) => {
    const ok = await unlockWithPin(pin);
    setError(ok ? null : 'Incorrect PIN. Try again.');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-slate-50 px-6">
      <div className="flex flex-col items-center gap-2">
        <Logo size={64} rounded="rounded-2xl" />
        <h1 className="text-2xl font-bold text-slate-800">A.L.F.R.E.D.</h1>
        <p className="text-slate-500">Locked for your clients' privacy</p>
      </div>

      {pinConfigured ? (
        <PinPad onSubmit={handlePin} error={error} />
      ) : (
        <p className="text-slate-500">No PIN configured yet — set one up in Settings.</p>
      )}

      {biometricConfigured && (
        <Button variant="secondary" onClick={tryBiometric} disabled={tryingBiometric}>
          {tryingBiometric ? 'Checking…' : '🔒 Use Face ID / Touch ID'}
        </Button>
      )}
    </div>
  );
}
