// Matches UserBasicInfo from backend
export interface User {
    id: number;
    username: string;
    email: string;
}

// User profile with all fields
export interface UserProfile {
    userId: number;
    username: string;
    email: string;
    bio?: string;
    isPremium: boolean;
    createdAt: string;
}

// Profile update request
export interface UpdateProfileRequest {
    username?: string;
    email?: string;
    bio?: string;
}

// Change password request
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

// Delete account request
export interface DeleteAccountRequest {
    password: string;
}