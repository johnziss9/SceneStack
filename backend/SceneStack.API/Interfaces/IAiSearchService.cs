using SceneStack.API.DTOs;

namespace SceneStack.API.Interfaces;

public interface IAiSearchService
{
    Task<AiSearchResponse> SearchWatchesAsync(int userId, string query);
}