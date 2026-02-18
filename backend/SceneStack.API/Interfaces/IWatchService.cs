using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IWatchService
{
    Task<Watch?> GetByIdAsync(int id);
    Task<IEnumerable<Watch>> GetAllAsync(int? userId = null, int? groupId = null);
    Task<PaginatedGroupedWatchesResponse> GetGroupedWatchesAsync(int userId, int page = 1, int pageSize = 20);
    Task<List<Watch>> GetByMovieIdAsync(int movieId, int userId);
    Task<Watch> CreateAsync(Watch watch, List<int> groupIds);
    Task<Watch?> UpdateAsync(int id, Watch watch, List<int>? groupIds = null);
    Task<bool> DeleteAsync(int id);
    Task<List<Watch>> GetGroupFeedAsync(int groupId, int requestingUserId);
    Task<BulkUpdateResult> BulkUpdateAsync(int userId, List<int> watchIds, bool isPrivate, List<int>? groupIds, string groupOperation);
}