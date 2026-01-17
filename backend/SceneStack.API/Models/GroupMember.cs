namespace SceneStack.API.Models;

public enum GroupRole
{
    Member = 0,
    Admin = 1,
    Creator = 2
}

public enum GroupMemberAction
{
    Added = 0,
    Removed = 1,
    RoleChanged = 2,
    Left = 3  // User left voluntarily
}

public class GroupMember
{
    public int GroupId { get; set; }
    public int UserId { get; set; }
    public GroupRole Role { get; set; } = GroupRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Group Group { get; set; } = null!;
    public User User { get; set; } = null!;
}

public class GroupMemberHistory
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public int UserId { get; set; }
    public GroupMemberAction Action { get; set; }
    public int? ActorId { get; set; }  // User who performed the action (null if system/self)
    public GroupRole? PreviousRole { get; set; }  // For RoleChanged action
    public GroupRole? NewRole { get; set; }  // For Added/RoleChanged actions
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Group Group { get; set; } = null!;
    public User User { get; set; } = null!;  // The user affected by the action
    public User? Actor { get; set; }  // The user who performed the action
}