import type { Movie } from './movie';

export interface WatchlistItem {
    id: number;
    movieId: number;
    movie: Movie;
    notes?: string | null;
    priority: number; // 0 = Normal, 1 = High
    addedAt: string;
}

export interface PaginatedWatchlistResponse {
    items: WatchlistItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}

export interface UpdateWatchlistItemRequest {
    notes?: string | null;
    priority?: number;
}
