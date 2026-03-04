using SceneStack.API.DTOs;

namespace SceneStack.API.Interfaces;

public interface IGroupRecommendationsService
{
    Task<List<TmdbMovie>> GetGroupRecommendationsAsync(int groupId, int requestingUserId, int count = 10);
    Task<GroupRecommendationStats> GetGroupRecommendationStatsAsync(int groupId, int requestingUserId);
    Task<PaginatedRecommendationsResponse> GetPaginatedRecommendationsAsync(int groupId, int requestingUserId, int page = 1, int pageSize = 20);

    // User personal recommendations
    Task<PaginatedRecommendationsResponse> GetUserRecommendationsAsync(int userId, int page = 1, int pageSize = 20);
}