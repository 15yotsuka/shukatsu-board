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
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <p className="text-zinc-400 text-sm">企業データの読み込みに失敗しました。</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '', errorStack: '', componentStack: '' })}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm"
          >
            閉じる
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
