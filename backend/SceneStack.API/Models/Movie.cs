namespace SceneStack.API.Models;

public class Movie
{
    public int Id { get; set; }
    public int TmdbId { get; set; }  // TMDb API ID
    public string Title { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? PosterPath { get; set; }
    public string? Synopsis { get; set; }
    public string? AiSynopsis { get; set; }  // Claude-generated
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ICollection<Watch> Watches { get; set; } = new List<Watch>();
}