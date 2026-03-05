// Matches backend InvitationStatus enum
export enum InvitationStatus {
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Cancelled = 3
}

// Matches InvitationResponse from backend
export interface Invitation {
    id: number;
    groupId: number;
    groupName: string;
    groupDescription?: string;
    groupMemberCount: number;
    invitedUserId: number;
    invitedUsername: string;
    invitedUserEmail: string;
    invitedByUserId: number;
    invitedByUsername: string;
    status: InvitationStatus;
    createdAt: string;
    respondedAt?: string;
    expiresAt?: string;
}

// Matches CreateInvitationRequest from backend
export interface CreateInvitationRequest {
    groupId: number;
    invitedUserId: number;
}

// Matches RespondToInvitationRequest from backend
export interface RespondToInvitationRequest {
    accept: boolean;
}

// Matches UserSearchResult from backend
export interface UserSearchResult {
    id: number;
    username: string;
    email: string;
    isPremium: boolean;
    isDeactivated: boolean;
    canJoinMoreGroups: boolean;
}

// Matches PendingInvitationsCountResponse from backend
export interface PendingInvitationsCount {
    count: number;
}
