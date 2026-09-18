import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label for which section crashed (shown in UI) */
  label?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Something went wrong.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-8">
        <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl p-10 text-center">
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="text-orange-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">
            {this.props.label ? `${this.props.label} hit a snag` : 'Something went wrong'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">
            This section crashed, but the rest of Valley Science should still work.
          </p>
          <p className="text-xs font-bold text-slate-400 mb-8 break-words">
            {this.state.errorMessage}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl font-black"
            >
              <RefreshCw size={16} /> Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-2xl font-black"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
