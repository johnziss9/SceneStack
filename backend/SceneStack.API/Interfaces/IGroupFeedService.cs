using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IGroupFeedService
{
    Task<List<GroupFeedItemResponse>> GetGroupFeedAsync(int groupId, int requestingUserId, int skip = 0, int take = 20);
    Task<List<Watch>> GetCombinedFeedAsync(int userId, int skip = 0, int take = 20);
    Task<GroupFeedStatsResponse> GetFeedWithStatsAsync(int groupId, int requestingUserId, int skip = 0, int take = 20);
}