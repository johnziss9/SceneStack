using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public interface IUserService
{
    Task<User?> GetProfileAsync(int userId);
    Task<User?> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<bool> DeleteAccountAsync(int userId, string password);
}
