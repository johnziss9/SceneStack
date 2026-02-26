using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IWatchlistService
{
    Task<PaginatedWatchlistResponse> GetWatchlistAsync(int userId, int page = 1, int pageSize = 20, string sortBy = "recent");
    Task<WatchlistItem> AddToWatchlistAsync(int userId, int tmdbId, string? notes, int priority);
    Task<bool> RemoveFromWatchlistAsync(int userId, int movieId);
    Task<bool> IsOnWatchlistAsync(int userId, int movieId);
    Task<WatchlistItem?> UpdateWatchlistItemAsync(int userId, int movieId, UpdateWatchlistItemRequest request);
    Task<WatchlistItemResponse?> ReorderWatchlistItemAsync(int userId, int movieId, int newPriority);
    Task<int> GetWatchlistCountAsync(int userId);
    Task<bool> CanAddToWatchlistAsync(int userId);
}
