import Cookies from 'js-cookie';
import * as Sentry from '@sentry/nextjs';
import { setCorrelationId, log } from './logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5127';

// Generate a unique correlation ID for tracking requests
function generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export class ApiError extends Error {
    constructor(public status: number, message: string, public correlationId?: string) {
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
    const correlationId = generateCorrelationId();

    // Set correlation ID for logging context
    setCorrelationId(correlationId);

    // Log request
    log.debug('API request', {
        method: options.method || 'GET',
        endpoint,
        correlationId,
    });

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    });

    // Capture correlation ID from response (in case backend generated it)
    const responseCorrelationId = response.headers.get('X-Correlation-ID');
    if (responseCorrelationId) {
        setCorrelationId(responseCorrelationId);
    }

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

        log.warn('API request unauthorized', {
            endpoint,
            method: options.method || 'GET',
            status: 401,
        });

        // Only redirect and remove token if on a protected page
        // Don't redirect if already on login page (e.g., failed login attempt)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            tokenStorage.removeToken();
            window.location.href = '/login';
        }

        throw new ApiError(401, errorMessage, correlationId);
    }

    // Handle 403 Forbidden - Premium feature required
    if (response.status === 403) {
        const errorText = await response.text();
        const error = new PremiumRequiredError(errorText || 'This feature requires a premium subscription');

        log.warn('Premium feature required', {
            endpoint,
            method: options.method || 'GET',
            status: 403,
        });

        // Capture in Sentry with context
        Sentry.captureException(error, {
            tags: { api_error: 'premium_required' },
            contexts: {
                api: {
                    endpoint,
                    method: options.method || 'GET',
                    status: 403,
                },
            },
        });

        throw error;
    }

    // Handle 429 Too Many Requests - Rate limit exceeded
    if (response.status === 429) {
        const errorText = await response.text();
        const error = new RateLimitError(errorText || 'Rate limit exceeded. Please try again later.');

        log.warn('Rate limit exceeded', {
            endpoint,
            method: options.method || 'GET',
            status: 429,
        });

        // Capture rate limits in Sentry for monitoring
        Sentry.captureException(error, {
            tags: { api_error: 'rate_limit' },
            contexts: {
                api: {
                    endpoint,
                    method: options.method || 'GET',
                    status: 429,
                },
            },
        });

        throw error;
    }

    // Handle 410 Gone - Permanently deleted resource
    if (response.status === 410) {
        try {
            const errorData = await response.json();
            const error = new ApiError(410, errorData.message || 'Resource permanently deleted', correlationId);

            log.warn('Resource permanently deleted', {
                endpoint,
                method: options.method || 'GET',
                status: 410,
            });

            Sentry.captureException(error, {
                tags: { api_error: 'resource_deleted' },
                contexts: {
                    api: {
                        endpoint,
                        method: options.method || 'GET',
                        status: 410,
                    },
                },
            });

            throw error;
        } catch (e) {
            const error = new ApiError(410, 'Resource permanently deleted', correlationId);

            log.warn('Resource permanently deleted', {
                endpoint,
                method: options.method || 'GET',
                status: 410,
            });

            Sentry.captureException(error, {
                tags: { api_error: 'resource_deleted' },
                contexts: {
                    api: {
                        endpoint,
                        method: options.method || 'GET',
                        status: 410,
                    },
                },
            });
            throw error;
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        const error = new ApiError(
            response.status,
            errorText || `API error: ${response.status}`,
            correlationId
        );

        // Log based on severity
        if (response.status >= 500) {
            log.error('API server error', error, {
                endpoint,
                method: options.method || 'GET',
                status: response.status,
            });
        } else {
            log.warn('API client error', {
                endpoint,
                method: options.method || 'GET',
                status: response.status,
                message: errorText,
            });
        }

        // Capture unexpected API errors in Sentry
        Sentry.captureException(error, {
            tags: { api_error: 'http_error' },
            contexts: {
                api: {
                    endpoint,
                    method: options.method || 'GET',
                    status: response.status,
                    responseText: errorText,
                },
            },
            level: response.status >= 500 ? 'error' : 'warning',
        });

        throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
        log.debug('API request successful', {
            endpoint,
            method: options.method || 'GET',
            status: 204,
        });
        return undefined as T;
    }

    log.debug('API request successful', {
        endpoint,
        method: options.method || 'GET',
        status: response.status,
    });

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