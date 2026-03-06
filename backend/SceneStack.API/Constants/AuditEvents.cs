namespace SceneStack.API.Constants;

/// <summary>
/// Constants for audit event types
/// </summary>
public static class AuditEvents
{
    // ========== AUTHENTICATION EVENTS ==========

    public const string LoginSuccess = "Login.Success";
    public const string LoginFailed = "Login.Failed";
    public const string LoginFailedInvalidCredentials = "Login.Failed.InvalidCredentials";
    public const string LoginFailedAccountDeleted = "Login.Failed.AccountDeleted";
    public const string Logout = "Logout";
    public const string RegisterSuccess = "Register.Success";
    public const string RegisterFailed = "Register.Failed";
    public const string TokenRefreshed = "Token.Refreshed";

    // ========== ACCOUNT MANAGEMENT ==========

    public const string ProfileUpdated = "Profile.Updated";
    public const string UsernameChanged = "Username.Changed";
    public const string EmailChanged = "Email.Changed";
    public const string BioUpdated = "Bio.Updated";
    public const string PasswordChanged = "Password.Changed";
    public const string PasswordChangeFailed = "Password.ChangeFailed";
    public const string AccountDeactivated = "Account.Deactivated";
    public const string AccountReactivated = "Account.Reactivated";
    public const string AccountDeletionRequested = "Account.DeletionRequested";
    public const string AccountPermanentlyDeleted = "Account.PermanentlyDeleted";
    public const string DataExportRequested = "Data.ExportRequested";
    public const string DataExportCompleted = "Data.ExportCompleted";

    // ========== GROUP OPERATIONS ==========

    public const string GroupCreated = "Group.Created";
    public const string GroupUpdated = "Group.Updated";
    public const string GroupDeleted = "Group.Deleted";
    public const string GroupMemberAdded = "GroupMember.Added";
    public const string GroupMemberRemoved = "GroupMember.Removed";
    public const string GroupMemberLeft = "GroupMember.Left";
    public const string GroupMemberRoleChanged = "GroupMember.RoleChanged";
    public const string GroupOwnershipTransferred = "Group.OwnershipTransferred";
    public const string GroupInvitationSent = "GroupInvitation.Sent";
    public const string GroupInvitationAccepted = "GroupInvitation.Accepted";
    public const string GroupInvitationDeclined = "GroupInvitation.Declined";
    public const string GroupInvitationCancelled = "GroupInvitation.Cancelled";

    // ========== WATCH OPERATIONS ==========

    public const string WatchCreated = "Watch.Created";
    public const string WatchUpdated = "Watch.Updated";
    public const string WatchDeleted = "Watch.Deleted";
    public const string WatchSharedToGroup = "Watch.SharedToGroup";
    public const string WatchUnsharedFromGroup = "Watch.UnsharedFromGroup";
    public const string WatchPrivacyChanged = "Watch.PrivacyChanged";

    // ========== WATCHLIST OPERATIONS ==========

    public const string WatchlistItemAdded = "WatchlistItem.Added";
    public const string WatchlistItemRemoved = "WatchlistItem.Removed";
    public const string WatchlistItemUpdated = "WatchlistItem.Updated";
    public const string WatchlistItemPriorityChanged = "WatchlistItem.PriorityChanged";

    // ========== PRIVACY SETTINGS ==========

    public const string PrivacySettingsUpdated = "Privacy.SettingsUpdated";
    public const string ShareWatchesToggled = "Privacy.ShareWatchesToggled";
    public const string ShareRatingsToggled = "Privacy.ShareRatingsToggled";
    public const string ShareNotesToggled = "Privacy.ShareNotesToggled";

    // ========== AI OPERATIONS (PREMIUM) ==========

    public const string AiInsightGenerated = "AI.InsightGenerated";
    public const string AiSearchPerformed = "AI.SearchPerformed";
    public const string AiInsightDeleted = "AI.InsightDeleted";

    // ========== SECURITY EVENTS ==========

    public const string UnauthorizedAccess = "Security.UnauthorizedAccess";
    public const string RateLimitExceeded = "Security.RateLimitExceeded";
    public const string SuspiciousActivity = "Security.SuspiciousActivity";
}
