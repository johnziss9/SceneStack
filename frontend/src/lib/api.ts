import { GroupedWatch } from '@/types/watch';
import { api } from './api-client';
import type {
    TmdbSearchResponse,
    Watch,
    CreateWatchRequest,
    UpdateWatchRequest,
} from '@/types';

// Movie endpoints
export const movieApi = {
    // GET: api/movies/search?query={query}
    searchMovies: (query: string, page: number = 1) =>
        api.get<TmdbSearchResponse>(`/api/movies/search?query=${encodeURIComponent(query)}&page=${page}`),
};

// Watch endpoints
export const watchApi = {
    // POST: api/watches
    createWatch: (data: CreateWatchRequest) =>
        api.post<Watch>('/api/watches', data),

    // GET: api/watches
    getWatches: (userId?: number) => {
        const endpoint = userId ? `/api/watches?userId=${userId}` : '/api/watches';
        return api.get<Watch[]>(endpoint);
    },

    // GET: api/watches/grouped
    getGroupedWatches: (userId: number) =>
        api.get<GroupedWatch[]>(`/api/watches/grouped?userId=${userId}`),

    // GET: api/watches/{id}
    getWatch: (id: number) =>
        api.get<Watch>(`/api/watches/${id}`),

    // PUT: api/watches/{id}
    updateWatch: (id: number, data: UpdateWatchRequest) =>
        api.put<Watch>(`/api/watches/${id}`, data),

    // DELETE: api/watches/{id}
    deleteWatch: (id: number) =>
        api.delete<void>(`/api/watches/${id}`),
};