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
    createdAt: string; // ISO date string
    movie: Movie;
    user: User;
}

// Matches WatchEntryResponse from backend
export interface WatchEntry {
    id: number;
    watchedDate: string;
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
}

// Matches GroupedWatchesResponse from backend
export interface GroupedWatch {
    movieId: number;
    movie: Movie;
    watchCount: number;
    averageRating?: number;
    latestRating?: number;
    watches: WatchEntry[];
}

// Matches CreateWatchRequest from backend
export interface CreateWatchRequest {
    tmdbId: number;
    userId: number; // Will be hardcoded to 1 for Phase 1
    watchedDate: string; // ISO date string
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
}

// Matches UpdateWatchRequest from backend
export interface UpdateWatchRequest {
    watchedDate: string; // Required in backend
    rating?: number;
    notes?: string;
    watchLocation?: string;
    watchedWith?: string;
    isRewatch: boolean;
}