using SceneStack.API.DTOs;

namespace SceneStack.API.Interfaces;

public interface IGroupRecommendationsService
{
    Task<List<TmdbMovie>> GetGroupRecommendationsAsync(int groupId, int requestingUserId, int count = 10);
    Task<GroupRecommendationStats> GetGroupRecommendationStatsAsync(int groupId, int requestingUserId);
}