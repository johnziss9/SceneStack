import { User } from './user';
import { Movie } from './movie';

// Enums matching backend
export enum GroupRole {
    Member = 0,
    Admin = 1,
    Creator = 2
}

export enum GroupMemberAction {
    Added = 0,
    Removed = 1,
    RoleChanged = 2,
    Left = 3
}

// Matches GroupMemberResponse from backend
export interface GroupMember {
    userId: number;
    username: string;
    email: string;
    role: GroupRole;
    joinedAt: string; // ISO date string
}

// Matches GroupBasicInfo from backend
export interface GroupBasicInfo {
    id: number;
    name: string;
    memberCount: number;
}

// Matches GroupResponse from backend
export interface Group {
    id: number;
    name: string;
    description?: string;
    createdById: number;
    createdBy: {
        userId: number;
        username: string;
        email: string;
    };
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
    members: GroupMember[];
}

// Matches CreateGroupRequest from backend
export interface CreateGroupRequest {
    name: string;
    description?: string;
}

// Matches UpdateGroupRequest from backend
export interface UpdateGroupRequest {
    name: string;
    description?: string;
}

// Matches AddMemberRequest from backend
export interface AddMemberRequest {
    userId: number;
}

// Matches UpdateMemberRoleRequest from backend
export interface UpdateMemberRoleRequest {
    role: GroupRole;
}

// Matches GroupFeedItemResponse from backend
export interface GroupFeedItem {
    id: number;
    userId: number;
    username: string;
    movieId: number;
    movieTitle: string;
    posterPath?: string;
    watchedDate: string; // ISO date string
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
}

// Matches GroupRecommendationResponse from backend (uses TMDb structure)
export interface GroupRecommendation {
    id: number; // TMDb uses 'id' not 'tmdbId'
    title: string;
    poster_path?: string;
    release_date?: string;
    overview?: string;
    vote_average: number;
    vote_count: number;
}

// Matches GroupRecommendationStatsResponse from backend
export interface GroupRecommendationStats {
    totalWatches: number;
    uniqueMovies: number;
    uniqueViewers: number;
    mostWatchedGenre?: string;
    recommendations: GroupRecommendation[];
}