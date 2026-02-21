namespace SceneStack.API.Models;

public class Watch
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public DateTime WatchedDate { get; set; }
    public double? Rating { get; set; }  // 1-10 scale (supports .5 increments)
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }  // Cinema, Home, Other
    public string? WatchedWith { get; set; }  // Free text or user tags
    public bool IsRewatch { get; set; }
    
    // Privacy settings (per-watch override)
    public bool IsPrivate { get; set; } = false;  // If true, completely private (not shared with any groups)
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
    public ICollection<WatchGroup> WatchGroups { get; set; } = new List<WatchGroup>();
}