const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5127';

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

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