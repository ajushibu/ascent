import { Component, type ReactNode } from 'react';

/** Last line of defence: a render crash shows a way out instead of a blank screen. Saved data is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.error('Ascent crashed', err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app">
        <div className="auth">
          <div className="card stack" style={{ gap: 14 }}>
            <h1 className="h1">Something broke</h1>
            <p className="body">Your data is safe. Reload to carry on.</p>
            <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </div>
    );
  }
}
