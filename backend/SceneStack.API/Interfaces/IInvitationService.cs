using SceneStack.API.DTOs;

namespace SceneStack.API.Interfaces;

public interface IInvitationService
{
    Task<InvitationResponse> CreateInvitationAsync(int requestingUserId, CreateInvitationRequest request);
    Task<IEnumerable<InvitationResponse>> GetUserPendingInvitationsAsync(int userId);
    Task<int> GetPendingInvitationsCountAsync(int userId);
    Task<InvitationResponse?> RespondToInvitationAsync(int invitationId, int userId, RespondToInvitationRequest request);
    Task<bool> CancelInvitationAsync(int invitationId, int requestingUserId);
    Task<IEnumerable<InvitationResponse>> GetSentInvitationsAsync(int groupId, int requestingUserId);
    Task<IEnumerable<UserSearchResult>> SearchUsersAsync(UserSearchRequest request, int requestingUserId);
}
