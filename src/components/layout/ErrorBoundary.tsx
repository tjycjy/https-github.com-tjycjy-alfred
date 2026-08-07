import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Uncaught error in app tree', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center dark:bg-slate-950">
        <p className="text-lg font-bold text-slate-800">Something went wrong</p>
        <p className="max-w-md text-sm text-slate-500">
          Sorry about that — this page hit an error. Reloading usually fixes it, especially right after an update.
        </p>
        <pre className="max-w-md overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-500">
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          Reload
        </button>
      </div>
    );
  }
}
