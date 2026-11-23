import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-extrabold">Something went wrong</h1>
        <p className="text-[15px] font-medium text-muted">Your data is safe. Reloading usually fixes this.</p>
        <button type="button" onClick={() => location.reload()} className="h-12 rounded-2xl bg-primary font-bold text-on-primary">
          Reload Thrive
        </button>
      </div>
    );
  }
}
