namespace SceneStack.API.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsPremium { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    
    // Navigation properties
    public ICollection<Watch> Watches { get; set; } = new List<Watch>();
    public ICollection<AiInsight> AiInsights { get; set; } = new List<AiInsight>();
}