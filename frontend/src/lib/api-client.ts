import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5127';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// Token storage functions using cookies
const TOKEN_KEY = 'auth_token';

export const tokenStorage = {
    getToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return Cookies.get(TOKEN_KEY) || null;
    },

    setToken: (token: string): void => {
        if (typeof window === 'undefined') return;
        // Set cookie with 7 days expiration (matches JWT expiration)
        Cookies.set(TOKEN_KEY, token, {
            expires: 7,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production'
        });
    },

    removeToken: (): void => {
        if (typeof window === 'undefined') return;
        Cookies.remove(TOKEN_KEY);
    },
};

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const token = tokenStorage.getToken();

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    });

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
        tokenStorage.removeToken();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
        throw new ApiError(401, 'Unauthorized');
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
            response.status,
            errorText || `API error: ${response.status}`
        );
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'GET' }),

    post: <T>(endpoint: string, data?: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T>(endpoint: string, data?: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T>(endpoint: string) =>
        fetchApi<T>(endpoint, { method: 'DELETE' }),
};