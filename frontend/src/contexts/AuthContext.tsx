'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { tokenStorage } from '@/lib/api-client';
import type { AuthResponse, RegisterRequest, LoginRequest } from '@/types';

interface AuthUser {
    id: number;
    username: string;
    email: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Auto-login on mount if token exists
    useEffect(() => {
        const token = tokenStorage.getToken();

        if (token) {
            // Token exists, decode it to get user info
            // JWT format: header.payload.signature
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));

                // Extract user info from token claims
                const userId = parseInt(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']);
                const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
                const email = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

                setUser({
                    id: userId,
                    username: username,
                    email: email,
                });
            } catch (error) {
                // Invalid token, remove it
                console.error('Failed to decode token:', error);
                tokenStorage.removeToken();
            }
        }

        setLoading(false);
    }, []);

    const login = async (data: LoginRequest) => {
        const response: AuthResponse = await authApi.login(data);

        // Store token
        tokenStorage.setToken(response.token);

        // Set user state
        setUser({
            id: response.userId,
            username: response.username,
            email: response.email,
        });

        // Redirect to home
        router.push('/');
    };

    const register = async (data: RegisterRequest) => {
        const response: AuthResponse = await authApi.register(data);

        // Store token
        tokenStorage.setToken(response.token);

        // Set user state
        setUser({
            id: response.userId,
            username: response.username,
            email: response.email,
        });

        // Redirect to home
        router.push('/');
    };

    const logout = () => {
        // Remove token
        tokenStorage.removeToken();

        // Clear user state
        setUser(null);

        // Call logout endpoint (optional, for server-side cleanup)
        authApi.logout().catch(() => {
            // Ignore errors, we're logging out anyway
        });

        // Redirect to login
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}