'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { watchlistApi } from '@/lib/api';

interface WatchlistContextType {
    count: number;
    isLoading: boolean;
    incrementCount: () => void;
    decrementCount: () => void;
    refreshCount: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [count, setCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCount = async () => {
        if (!user) {
            setCount(0);
            return;
        }

        setIsLoading(true);
        try {
            const response = await watchlistApi.getWatchlistCount();
            setCount(response.count);
        } catch (error) {
            console.error('Failed to fetch watchlist count:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCount();
    }, [user]);

    const incrementCount = () => {
        setCount(prev => prev + 1);
    };

    const decrementCount = () => {
        setCount(prev => Math.max(0, prev - 1));
    };

    const refreshCount = async () => {
        await fetchCount();
    };

    return (
        <WatchlistContext.Provider
            value={{
                count,
                isLoading,
                incrementCount,
                decrementCount,
                refreshCount,
            }}
        >
            {children}
        </WatchlistContext.Provider>
    );
}

export function useWatchlist() {
    const context = useContext(WatchlistContext);
    if (context === undefined) {
        throw new Error('useWatchlist must be used within a WatchlistProvider');
    }
    return context;
}
