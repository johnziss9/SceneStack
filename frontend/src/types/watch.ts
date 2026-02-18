import { Movie } from './movie';
import { User } from './user';

// Matches WatchResponse from backend
export interface Watch {
    id: number;
    userId: number;
    movieId: number;
    watchedDate: string; // ISO date string
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
    isPrivate: boolean; // Privacy flag
    groupIds?: number[]; // Groups this watch is shared with
    createdAt: string; // ISO date string
    movie: Movie;
    user: User;
}

// Matches WatchEntryResponse from backend
export interface WatchEntry {
    id: number;
    movieId: number;
    watchedDate: string;
    rating?: number | null;
    notes?: string | null;
    watchLocation?: string | null;
    watchedWith?: string | null;
    isRewatch: boolean;
    isPrivate: boolean;
    groupIds?: number[];
    movie: Movie;  // Navigation property
}

// Matches GroupedWatchesResponse from backend
export interface GroupedWatch {
    movieId: number;
    movie: Movie;
    watchCount: number;
    averageRating?: number | null;
    latestRating?: number | null;
    watches: WatchEntry[];
}

// Matches PaginatedGroupedWatchesResponse from backend
export interface PaginatedGroupedWatches {
    items: GroupedWatch[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}

// Matches CreateWatchRequest from backend
export interface CreateWatchRequest {
    tmdbId: number;
    watchedDate: string; // ISO date string
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
    isPrivate?: boolean; // Mark watch as private
    groupIds?: number[]; // Share with specific groups
}

// Matches UpdateWatchRequest from backend
export interface UpdateWatchRequest {
    watchedDate: string; // Required in backend
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
    isPrivate?: boolean;
    groupIds?: number[];
}

// Matches BulkUpdateWatchesRequest from backend
export interface BulkUpdateWatchesRequest {
    watchIds: number[];
    isPrivate: boolean;
    groupIds?: number[];
    groupOperation: 'add' | 'replace';
}

// Matches BulkUpdateResult from backend
export interface BulkUpdateResult {
    success: boolean;
    updated: number;
    failed: number;
    errors: string[];
}