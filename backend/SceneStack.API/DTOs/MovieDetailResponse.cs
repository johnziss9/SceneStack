using SceneStack.API.Models;

namespace SceneStack.API.DTOs;

public class MovieDetailResponse
{
    public int Id { get; set; }
    public int TmdbId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
    public string? Synopsis { get; set; }
    public string? AiSynopsis { get; set; }
    public string? Tagline { get; set; }
    public int? Runtime { get; set; }
    public List<string> Genres { get; set; } = new();
    public double? TmdbRating { get; set; }
    public int? TmdbVoteCount { get; set; }
    public string? DirectorName { get; set; }
    public List<CastMemberResponse> Cast { get; set; } = new();
}

public class CastMemberResponse
{
    public string Name { get; set; } = string.Empty;
    public string Character { get; set; } = string.Empty;
    public string? ProfilePath { get; set; }
}

public class MovieUserStatus
{
    public int? LocalMovieId { get; set; }
    public int WatchCount { get; set; }
    public double? LatestRating { get; set; }
    public bool OnWatchlist { get; set; }
    public int? WatchlistItemId { get; set; }
}
