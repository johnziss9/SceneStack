namespace SceneStack.API.DTOs;

public class WatchResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int MovieId { get; set; }
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Nested objects without circular references
    public MovieBasicInfo Movie { get; set; } = null!;
    public UserBasicInfo User { get; set; } = null!;
}

public class MovieBasicInfo
{
    public int Id { get; set; }
    public int TmdbId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? PosterPath { get; set; }
    public string? Synopsis { get; set; }
    public string? AiSynopsis { get; set; }
}

public class UserBasicInfo
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class GroupedWatchesResponse
{
    public int MovieId { get; set; }
    public MovieBasicInfo Movie { get; set; } = null!;
    public int WatchCount { get; set; }
    public double? AverageRating { get; set; }
    public int? LatestRating { get; set; }
    public List<WatchEntryResponse> Watches { get; set; } = new();
}

public class WatchEntryResponse
{
    public int Id { get; set; }
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
}