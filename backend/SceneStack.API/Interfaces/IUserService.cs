using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public interface IUserService
{
    Task<User?> GetProfileAsync(int userId);
    Task<User?> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<bool> DeleteAccountAsync(int userId, string password);
    Task<(byte[] content, string contentType, string fileName)> ExportUserDataAsync(int userId, string format);
    Task<List<GroupWithTransferEligibilityResponse>> GetCreatedGroupsWithTransferEligibilityAsync(int userId);
    Task ManageGroupsBeforeDeletionAsync(int userId, List<GroupActionRequest> groupActions);
    Task ExecutePendingGroupActionsAsync(int userId);
    Task<bool> DeactivateAccountAsync(int userId);
    Task<bool> ReactivateAccountAsync(int userId);
}
