using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IWatchService
{
    Task<Watch?> GetByIdAsync(int id);
    Task<IEnumerable<Watch>> GetAllAsync(int? userId = null, int? groupId = null);
    Task<PaginatedGroupedWatchesResponse> GetGroupedWatchesAsync(GetGroupedWatchesRequest request);
    Task<List<Watch>> GetByMovieIdAsync(int movieId, int userId);
    Task<Watch> CreateAsync(Watch watch, bool? isPrivate, List<int>? groupIds);
    Task<Watch?> UpdateAsync(int id, Watch watch);
    Task<bool> DeleteAsync(int id);
    Task<List<Watch>> GetGroupFeedAsync(int groupId, int requestingUserId);
}