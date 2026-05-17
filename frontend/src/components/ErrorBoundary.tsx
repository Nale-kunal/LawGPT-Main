import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI. Receives error + reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Boundary name for error reporting */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary — catches React rendering errors and shows a recovery UI
 * instead of a blank screen. Wrap around page sections or entire pages.
 *
 * Usage:
 *   <ErrorBoundary name="CaseList">
 *     <CaseList />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development, Sentry in production
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`,
      error,
      errorInfo.componentStack
    );

    // If Sentry is available, report the error
    if (typeof window !== 'undefined' && (window as any).Sentry) { // eslint-disable-line @typescript-eslint/no-explicit-any
      (window as any).Sentry.captureException(error, { // eslint-disable-line @typescript-eslint/no-explicit-any
        extra: {
          componentStack: errorInfo.componentStack,
          boundaryName: this.props.name,
        },
      });
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm">
            {this.props.name
              ? `The ${this.props.name} section encountered an error.`
              : 'An unexpected error occurred.'}
            {' '}Try refreshing or contact support if the issue persists.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
