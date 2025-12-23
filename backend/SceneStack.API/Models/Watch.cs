namespace SceneStack.API.Models;

public class Watch
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }  // 1-10 scale
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }  // Cinema, Home, Other
    public string? WatchedWith { get; set; }  // Free text or user tags
    public bool IsRewatch { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public Movie Movie { get; set; } = null!;
}