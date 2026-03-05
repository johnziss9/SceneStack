namespace SceneStack.API.Models;

public enum InvitationStatus
{
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Cancelled = 3
}

public class GroupInvitation
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public int InvitedUserId { get; set; }
    public int InvitedByUserId { get; set; }
    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }

    // Navigation properties
    public Group Group { get; set; } = null!;
    public User InvitedUser { get; set; } = null!;
    public User InvitedByUser { get; set; } = null!;
}
