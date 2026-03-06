'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { invitationApi } from '@/lib/api';
import { log } from '@/lib/logger';

interface InvitationContextType {
    count: number;
    isLoading: boolean;
    decrementCount: () => void;
    refreshCount: () => Promise<void>;
}

const InvitationContext = createContext<InvitationContextType | undefined>(undefined);

export function InvitationProvider({ children }: { children: ReactNode }) {
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
            const response = await invitationApi.getPendingCount();
            setCount(response.count);
        } catch (error) {
            log.error('Failed to fetch invitation count', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const decrementCount = () => {
        setCount(prev => Math.max(0, prev - 1));
    };

    const refreshCount = async () => {
        await fetchCount();
    };

    return (
        <InvitationContext.Provider
            value={{
                count,
                isLoading,
                decrementCount,
                refreshCount,
            }}
        >
            {children}
        </InvitationContext.Provider>
    );
}

export function useInvitation() {
    const context = useContext(InvitationContext);
    if (context === undefined) {
        throw new Error('useInvitation must be used within an InvitationProvider');
    }
    return context;
}
