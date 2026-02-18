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

    // Enriched metadata — stored at creation time from TMDb
    public List<string> Genres { get; set; } = new();          // JSON column
    public int? Runtime { get; set; }                           // minutes
    public string? Tagline { get; set; }
    public string? BackdropPath { get; set; }
    public double? TmdbRating { get; set; }                     // e.g. 7.8
    public int? TmdbVoteCount { get; set; }
    public string? DirectorName { get; set; }
    public List<CastMember> Cast { get; set; } = new();        // JSON column, top 10

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    // Navigation properties
    public ICollection<Watch> Watches { get; set; } = new List<Watch>();
    public ICollection<AiInsight> AiInsights { get; set; } = new List<AiInsight>();
}