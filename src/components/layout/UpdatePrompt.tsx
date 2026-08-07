import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Installed PWAs sit open for a long time — check for a new build hourly
      // instead of only relying on a page navigation to trigger a check.
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
        <span>A new version is ready.</span>
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 font-semibold hover:bg-indigo-400"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
