import { GroupedWatch, PaginatedGroupedWatches } from '@/types/watch';
import { api } from './api-client';
import type { UserStats } from '@/types/stats';
import type {
    TmdbSearchResponse,
    Watch,
    CreateWatchRequest,
    UpdateWatchRequest,
    BulkUpdateWatchesRequest,
    BulkUpdateResult,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    GenerateInsightRequest,
    AiInsightResponse,
    RegenerateInsightRequest,
    AiSearchRequest,
    AiSearchResponse,
    AiUsageStats,
    Group,
    GroupBasicInfo,
    CreateGroupRequest,
    UpdateGroupRequest,
    AddMemberRequest,
    UpdateMemberRoleRequest,
    GroupMember,
    GroupFeedItem,
    GroupRecommendationStats,
    GroupStats,
    UserPrivacySettings,
    UpdatePrivacySettingsRequest,
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

    // GET: api/watches/grouped?page=1&pageSize=20
    getGroupedWatches: (page: number = 1, pageSize: number = 20) =>
        api.get<PaginatedGroupedWatches>(`/api/watches/grouped?page=${page}&pageSize=${pageSize}`),

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

    // PUT: api/watches/bulk
    bulkUpdate: (data: BulkUpdateWatchesRequest) =>
        api.put<BulkUpdateResult>('/api/watches/bulk', data),
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

// Group endpoints
export const groupApi = {
    // GET: api/groups
    getUserGroups: () =>
        api.get<GroupBasicInfo[]>('/api/groups'),

    // GET: api/groups/{id}
    getGroup: (id: number) =>
        api.get<Group>(`/api/groups/${id}`),

    // POST: api/groups
    createGroup: (data: CreateGroupRequest) =>
        api.post<Group>('/api/groups', data),

    // PUT: api/groups/{id}
    updateGroup: (id: number, data: UpdateGroupRequest) =>
        api.put<Group>(`/api/groups/${id}`, data),

    // DELETE: api/groups/{id}
    deleteGroup: (id: number) =>
        api.delete<void>(`/api/groups/${id}`),

    // GET: api/groups/{id}/members
    getMembers: (groupId: number) =>
        api.get<GroupMember[]>(`/api/groups/${groupId}/members`),

    // POST: api/groups/{id}/members
    addMember: (groupId: number, data: AddMemberRequest) =>
        api.post<GroupMember>(`/api/groups/${groupId}/members`, data),

    // DELETE: api/groups/{id}/members/{userId}
    removeMember: (groupId: number, userId: number) =>
        api.delete<void>(`/api/groups/${groupId}/members/${userId}`),

    // PUT: api/groups/{id}/members/{userId}/role
    updateMemberRole: (groupId: number, userId: number, data: UpdateMemberRoleRequest) =>
        api.put<GroupMember>(`/api/groups/${groupId}/members/${userId}/role`, data),

    // GET: api/groups/{id}/feed?skip={skip}&take={take}
    getFeed: (groupId: number, skip: number = 0, take: number = 20) =>
        api.get<GroupFeedItem[]>(`/api/groups/${groupId}/feed?skip=${skip}&take=${take}`),

    // GET: api/groups/{id}/recommendations?count={count}
    getRecommendations: (groupId: number, count: number = 10) =>
        api.get<GroupRecommendationStats>(`/api/groups/${groupId}/recommendations?count=${count}`),

    // GET: api/groups/{id}/recommendations/stats
    getRecommendationStats: (groupId: number) =>
        api.get<GroupRecommendationStats>(`/api/groups/${groupId}/recommendations/stats`),

    // GET: api/groups/{id}/stats
    getGroupStats: (groupId: number) =>
        api.get<GroupStats>(`/api/groups/${groupId}/stats`),
};

// Stats endpoints
export const statsApi = {
    // GET: api/stats
    getStats: () =>
        api.get<UserStats>('/api/stats'),
};

// Privacy endpoints
export const privacyApi = {
    // GET: api/privacy
    getPrivacySettings: () =>
        api.get<UserPrivacySettings>('/api/privacy'),

    // PUT: api/privacy
    updatePrivacySettings: (data: UpdatePrivacySettingsRequest) =>
        api.put<UserPrivacySettings>('/api/privacy', data),
};