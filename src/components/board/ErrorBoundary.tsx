'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '', componentStack: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error?.message ?? String(error),
      errorStack: error?.stack ?? '',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ componentStack: info?.componentStack ?? '' });
  }

  render() {
    if (this.state.hasError) {
      const { errorMessage, errorStack, componentStack } = this.state;
      const fullText = `ERROR: ${errorMessage}\n\nSTACK:\n${errorStack}\n\nCOMPONENT STACK:\n${componentStack}`;

      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => this.setState({ hasError: false, errorMessage: '', errorStack: '', componentStack: '' })}
          />
          <div className="relative bg-card rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <p className="text-[15px] font-bold text-[var(--color-danger)]">🔴 クラッシュ詳細（コピーして報告）</p>
              <button
                onClick={() => this.setState({ hasError: false, errorMessage: '', errorStack: '', componentStack: '' })}
                className="w-7 h-7 flex items-center justify-center text-[var(--color-text-secondary)] bg-[var(--color-border)] rounded-full text-[14px]"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre
                className="text-[11px] text-[var(--color-text)] whitespace-pre-wrap break-all leading-relaxed font-mono bg-[var(--color-border)] rounded-xl p-3 select-all"
                style={{ userSelect: 'all' }}
              >
                {fullText}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-[var(--color-border)]">
              <p className="text-[11px] text-[var(--color-text-secondary)] text-center">
                上のテキストを長押し → 全選択 → コピーして送ってください
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
