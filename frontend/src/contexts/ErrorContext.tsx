'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorInfo {
    message: string;
    correlationId?: string;
}

interface ErrorContextType {
    lastError: ErrorInfo | null;
    setError: (message: string, correlationId?: string) => void;
    clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function ErrorProvider({ children }: { children: ReactNode }) {
    const [lastError, setLastError] = useState<ErrorInfo | null>(null);

    const setError = (message: string, correlationId?: string) => {
        setLastError({ message, correlationId });
    };

    const clearError = () => {
        setLastError(null);
    };

    return (
        <ErrorContext.Provider value={{ lastError, setError, clearError }}>
            {children}
        </ErrorContext.Provider>
    );
}

export function useError() {
    const context = useContext(ErrorContext);
    if (context === undefined) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
}
