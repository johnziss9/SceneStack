// Auth Request Types
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

// Auth Response Type
export interface AuthResponse {
    token: string;
    userId: number;
    username: string;
    email: string;
    isDeactivated?: boolean;
    deactivatedAt?: string | null;
    daysUntilPermanentDeletion?: number | null;
}