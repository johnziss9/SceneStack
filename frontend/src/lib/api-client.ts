import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5127';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export class PremiumRequiredError extends Error {
    constructor(message: string = 'This feature requires a premium subscription') {
        super(message);
        this.name = 'PremiumRequiredError';
    }
}

export class RateLimitError extends Error {
    constructor(message: string = 'Rate limit exceeded. Please try again later.') {
        super(message);
        this.name = 'RateLimitError';
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

    // Handle 401 Unauthorized
    if (response.status === 401) {
        // Try to parse error message from response
        let errorMessage = 'Unauthorized';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || 'Unauthorized';
        } catch {
            // If JSON parsing fails, use default message
        }

        // Only redirect and remove token if on a protected page
        // Don't redirect if already on login page (e.g., failed login attempt)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            tokenStorage.removeToken();
            window.location.href = '/login';
        }

        throw new ApiError(401, errorMessage);
    }

    // Handle 403 Forbidden - Premium feature required
    if (response.status === 403) {
        const errorText = await response.text();
        throw new PremiumRequiredError(errorText || 'This feature requires a premium subscription');
    }

    // Handle 429 Too Many Requests - Rate limit exceeded
    if (response.status === 429) {
        const errorText = await response.text();
        throw new RateLimitError(errorText || 'Rate limit exceeded. Please try again later.');
    }

    // Handle 410 Gone - Permanently deleted resource
    if (response.status === 410) {
        try {
            const errorData = await response.json();
            throw new ApiError(410, errorData.message || 'Resource permanently deleted');
        } catch (e) {
            throw new ApiError(410, 'Resource permanently deleted');
        }
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

    patch: <T>(endpoint: string, data?: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T>(endpoint: string, data?: unknown) =>
        fetchApi<T>(endpoint, {
            method: 'DELETE',
            body: data ? JSON.stringify(data) : undefined,
        }),
};