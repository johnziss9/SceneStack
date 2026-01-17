namespace SceneStack.API.Models;

public class WatchGroup
{
    public int WatchId { get; set; }
    public int GroupId { get; set; }
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Watch Watch { get; set; } = null!;
    public Group Group { get; set; } = null!;
}