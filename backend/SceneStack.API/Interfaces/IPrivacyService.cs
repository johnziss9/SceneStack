using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IPrivacyService
{
    Task<bool> CanViewWatchAsync(int watchId, int requestingUserId);
    Task<bool> CanViewRatingAsync(int watchId, int requestingUserId);
    Task<bool> CanViewNotesAsync(int watchId, int requestingUserId);
    Task<IEnumerable<Watch>> FilterWatchesByPrivacyAsync(IEnumerable<Watch> watches, int requestingUserId);
    Task<bool> AreUsersInSameGroupAsync(int userId1, int userId2);
}