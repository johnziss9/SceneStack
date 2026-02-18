using SceneStack.API.DTOs;

namespace SceneStack.API.Interfaces;

public interface IStatsService
{
    Task<UserStatsResponse> GetUserStatsAsync(int userId);
}
