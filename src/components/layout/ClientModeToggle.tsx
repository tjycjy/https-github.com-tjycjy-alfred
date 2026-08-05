import { useState } from 'react';
import { useAppMode } from '../../state/AppModeContext';
import { ExitClientModeGate } from '../lock/ExitClientModeGate';

export function ClientModeToggle() {
  const { mode, activeClientId, enterClientMode, exitClientMode } = useAppMode();
  const [gateOpen, setGateOpen] = useState(false);

  const isClientMode = mode === 'client';

  const handleClick = () => {
    if (isClientMode) {
      setGateOpen(true);
    } else if (activeClientId) {
      enterClientMode(activeClientId);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!isClientMode && !activeClientId}
        title={!isClientMode && !activeClientId ? 'Open a client to enter Client Mode' : undefined}
        className={`flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
          isClientMode
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${isClientMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        {isClientMode ? 'Client Mode — tap to exit' : 'Advisor Mode'}
      </button>
      <ExitClientModeGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onVerified={() => {
          setGateOpen(false);
          exitClientMode();
        }}
      />
    </>
  );
}
