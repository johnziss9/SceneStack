// Matches User privacy fields from backend
export interface UserPrivacySettings {
    shareWatches: boolean;
    shareRatings: boolean;
    shareNotes: boolean;
}

// Request type for updating privacy settings
export interface UpdatePrivacySettingsRequest {
    shareWatches?: boolean;
    shareRatings?: boolean;
    shareNotes?: boolean;
}