namespace SceneStack.API.DTOs;

public class CreateInvitationRequest
{
    public int GroupId { get; set; }
    public int InvitedUserId { get; set; }
}

public class RespondToInvitationRequest
{
    public bool Accept { get; set; }
}

public class UserSearchRequest
{
    public string Query { get; set; } = string.Empty;
    public int? ExcludeGroupId { get; set; }
}
