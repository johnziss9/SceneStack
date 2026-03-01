namespace SceneStack.API.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public bool IsPremium { get; set; } = false;
    
    // Privacy settings (global defaults)
    public bool ShareWatches { get; set; } = true;  // Share watch history with groups
    public bool ShareRatings { get; set; } = true;  // Share ratings with groups
    public bool ShareNotes { get; set; } = false;   // Share notes with groups (private by default)
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    // Deactivation (soft lockout, can reactivate anytime)
    public bool IsDeactivated { get; set; } = false;
    public DateTime? DeactivatedAt { get; set; }

    // Pending group actions (stored as JSON, executed after 30 days if not reactivated)
    public string? PendingGroupActions { get; set; }

    // Navigation properties
    public ICollection<Watch> Watches { get; set; } = new List<Watch>();
    public ICollection<AiInsight> AiInsights { get; set; } = new List<AiInsight>();
    public ICollection<GroupMember> GroupMemberships { get; set; } = new List<GroupMember>();
    public ICollection<Group> CreatedGroups { get; set; } = new List<Group>();
}