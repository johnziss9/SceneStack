using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IWatchService
{
    Task<Watch?> GetByIdAsync(int id);
    Task<IEnumerable<Watch>> GetAllAsync(int? userId = null);
    Task<List<GroupedWatchesResponse>> GetGroupedWatchesAsync(int userId);
    Task<List<Watch>> GetByMovieIdAsync(int movieId, int userId);
    Task<Watch> CreateAsync(Watch watch);
    Task<Watch?> UpdateAsync(int id, Watch watch);
    Task<bool> DeleteAsync(int id);
}