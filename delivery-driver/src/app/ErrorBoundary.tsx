// src/app/ErrorBoundary.tsx - Global and feature-level React Error Boundary

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-bg text-center select-none">
          <div className="w-14 h-14 rounded-full bg-critical/10 text-critical flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h2 className="text-[20px] font-bold text-black dark:text-white mb-1">
            Something went wrong
          </h2>
          <p className="text-[14px] text-secondary max-w-[280px] mb-6">
            An unexpected error occurred while rendering this screen.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="h-11 px-6 rounded-xl bg-action text-white font-medium text-[15px] shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
