import { GroupedWatch } from '@/types/watch';
import { api } from './api-client';
import type {
    TmdbSearchResponse,
    Watch,
    CreateWatchRequest,
    UpdateWatchRequest,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    GenerateInsightRequest,
    AiInsightResponse,
    RegenerateInsightRequest,
    AiSearchRequest,
    AiSearchResponse,
    AiUsageStats,
} from '@/types';

// Auth endpoints
export const authApi = {
    // POST: api/auth/register
    register: (data: RegisterRequest) =>
        api.post<AuthResponse>('/api/auth/register', data),

    // POST: api/auth/login
    login: (data: LoginRequest) =>
        api.post<AuthResponse>('/api/auth/login', data),

    // POST: api/auth/logout
    logout: () =>
        api.post<void>('/api/auth/logout'),
};

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

    // GET: api/watches (userId now from JWT token)
    getWatches: () =>
        api.get<Watch[]>('/api/watches'),

    // GET: api/watches/grouped (userId now from JWT token)
    getGroupedWatches: () =>
        api.get<GroupedWatch[]>('/api/watches/grouped'),

    // GET: api/watches/by-movie/{movieId} (userId now from JWT token)
    getWatchesByMovie: (movieId: number) =>
        api.get<Watch[]>(`/api/watches/by-movie/${movieId}`),

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

// AI endpoints
export const aiApi = {
    // POST: api/ai/insights
    generateInsight: (data: GenerateInsightRequest) =>
        api.post<AiInsightResponse>('/api/ai/insights', data),

    // GET: api/ai/insights/{movieId}
    getCachedInsight: (movieId: number) =>
        api.get<AiInsightResponse>(`/api/ai/insights/${movieId}`),

    // POST: api/ai/insights/{movieId}/regenerate
    regenerateInsight: (data: RegenerateInsightRequest) =>
        api.post<AiInsightResponse>(`/api/ai/insights/${data.movieId}/regenerate`, data),

    // POST: api/ai/search
    search: (data: AiSearchRequest) =>
        api.post<AiSearchResponse>('/api/ai/search', data),

    // GET: api/ai/usage
    getUsageStats: () =>
        api.get<AiUsageStats>('/api/ai/usage'),
};