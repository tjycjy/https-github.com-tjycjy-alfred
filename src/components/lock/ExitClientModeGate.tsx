import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PinPad } from './PinPad';
import { Button } from '../ui/Button';
import { useAuth } from '../../state/AuthContext';

export function ExitClientModeGate({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const { pinConfigured, biometricConfigured, unlockWithPin, unlockWithBiometric } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handlePin = async (pin: string) => {
    const ok = await unlockWithPin(pin);
    if (ok) {
      onVerified();
    } else {
      setError('Incorrect PIN.');
    }
  };

  const handleBiometric = async () => {
    setChecking(true);
    setError(null);
    const ok = await unlockWithBiometric();
    setChecking(false);
    if (ok) {
      onVerified();
    } else {
      setError('Face ID / Touch ID failed.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Confirm it's you">
      <div className="flex flex-col items-center gap-6 py-2">
        <p className="text-center text-slate-500">
          Exiting Client Mode reveals other clients' data. Confirm your PIN or biometric to continue.
        </p>
        {pinConfigured && <PinPad onSubmit={handlePin} error={error} />}
        {biometricConfigured && (
          <Button variant="secondary" onClick={handleBiometric} disabled={checking}>
            {checking ? 'Checking…' : '🔒 Use Face ID / Touch ID'}
          </Button>
        )}
        {!pinConfigured && !biometricConfigured && (
          <p className="text-sm text-rose-600">No app lock configured. Set one up in Settings first.</p>
        )}
      </div>
    </Modal>
  );
}
