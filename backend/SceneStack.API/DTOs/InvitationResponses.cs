namespace SceneStack.API.DTOs;

public class InvitationResponse
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string? GroupDescription { get; set; }
    public int GroupMemberCount { get; set; }
    public int InvitedUserId { get; set; }
    public string InvitedUsername { get; set; } = string.Empty;
    public string InvitedUserEmail { get; set; } = string.Empty;
    public int InvitedByUserId { get; set; }
    public string InvitedByUsername { get; set; } = string.Empty;
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class UserSearchResult
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
    public bool IsDeactivated { get; set; }
    public bool CanJoinMoreGroups { get; set; }
}

public class PendingInvitationsCountResponse
{
    public int Count { get; set; }
}
