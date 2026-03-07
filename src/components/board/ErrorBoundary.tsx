'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="bg-card rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl text-center">
            <p className="text-[17px] font-bold text-[var(--color-text)] mb-2">表示エラー</p>
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">
              企業データの読み込みに失敗しました。
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="ios-button-primary"
            >
              閉じる
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
