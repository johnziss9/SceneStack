using SceneStack.API.DTOs;

namespace SceneStack.API.Interfaces;

public interface IAiInsightService
{
    Task<AiInsightResponse?> GetCachedInsightAsync(int movieId, int userId);
    Task<AiInsightResponse> GenerateInsightAsync(int movieId, int userId);
    Task<AiInsightResponse> RegenerateInsightAsync(int movieId, int userId);
}