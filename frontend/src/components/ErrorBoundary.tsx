'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('Uncaught error:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground max-w-md">
                            An unexpected error occurred. Try refreshing the page, or click below to retry.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Refresh page
                        </Button>
                        <Button onClick={this.handleReset}>
                            Try again
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
