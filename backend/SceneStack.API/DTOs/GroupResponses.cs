namespace SceneStack.API.DTOs;

public class GroupResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Nested objects
    public UserBasicInfo CreatedBy { get; set; } = null!;
    public List<GroupMemberResponse> Members { get; set; } = new();
    public int MemberCount { get; set; }
}

public class GroupBasicInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int MemberCount { get; set; }
}

public class GroupMemberResponse
{
    public int UserId { get; set; }
    public int GroupId { get; set; }
    public int Role { get; set; } // 0 = Member, 1 = Admin, 2 = Creator
    public string RoleName { get; set; } = string.Empty; // "Member", "Admin", "Creator"
    public DateTime JoinedAt { get; set; }

    // Flattened user info for easier frontend access
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsDeactivated { get; set; } = false;

    // Nested user info (kept for backwards compatibility)
    public UserBasicInfo User { get; set; } = null!;
}

public class GroupFeedItemResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public bool IsDeactivated { get; set; }
    public int MovieId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterPath { get; set; }
    public DateTime WatchedDate { get; set; }
    public double? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
}

public class PaginatedGroupFeedResponse
{
    public List<GroupFeedItemResponse> Items { get; set; } = new();
    public int Skip { get; set; }
    public int Take { get; set; }
    public bool HasMore { get; set; }
    public int TotalCount { get; set; }
    public int NextSkip { get; set; } // The skip value to use for the next request
}

public class GroupFeedStatsResponse
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public int TotalWatches { get; set; }
    public int UniqueMovies { get; set; }
    public int ActiveMembers { get; set; } // Members who have shared watches
    public double? AverageGroupRating { get; set; }
    public List<WatchResponse> Watches { get; set; } = new();
    public List<MovieWatchStats> TopMovies { get; set; } = new();
}

public class MovieWatchStats
{
    public int MovieId { get; set; }
    public MovieBasicInfo Movie { get; set; } = null!;
    public int WatchCount { get; set; }
    public double? AverageRating { get; set; }
    public List<string> WatchedByUsernames { get; set; } = new();
}

public class GroupRecommendationStats
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public int TotalWatches { get; set; } // Total watch entries
    public int UniqueMovies { get; set; } // Unique movies
    public int UniqueViewers { get; set; } // Unique members who watched
    public string? MostWatchedGenre { get; set; } // Top genre (optional)
    public double? AverageGroupRating { get; set; }
    public List<TmdbMovie> Recommendations { get; set; } = new();
}

public class GroupStatsResponse
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public int TotalWatches { get; set; }
    public int UniqueMovies { get; set; }
    public double? AverageGroupRating { get; set; }
    public string? MostActiveMember { get; set; }
    public List<GroupMemberStats> MemberStats { get; set; } = new();
    public List<SharedMovieStats> SharedMovies { get; set; } = new();
}

public class GroupMemberStats
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int WatchCount { get; set; }
    public double? AverageRating { get; set; }
    public bool IsDeactivated { get; set; }
}

public class SharedMovieStats
{
    public MovieBasicInfo Movie { get; set; } = null!;
    public int WatchedByCount { get; set; }
    public List<string> WatchedByUsernames { get; set; } = new();
}

public class PaginatedRecommendationsResponse
{
    public List<RecommendedMovie> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public string CurrentTier { get; set; } = string.Empty; // "Elite", "Strong", "Broad", "Popular"
}

public class RecommendedMovie
{
    public TmdbMovie Movie { get; set; } = null!;
    public double Score { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<string> MatchedGenres { get; set; } = new();
    public string? MatchedDirector { get; set; }
    public List<string> MatchedCast { get; set; } = new();
    public string? MatchedWriter { get; set; }
}

// Internal models for recommendation system
internal class GroupPreferences
{
    public Dictionary<string, int> Tier1Genres { get; set; } = new();
    public Dictionary<string, int> Tier2Genres { get; set; } = new();
    public Dictionary<string, int> Tier3Genres { get; set; } = new();
    public List<string> Tier1Directors { get; set; } = new();
    public List<string> Tier2Directors { get; set; } = new();
    public List<string> Tier1Cast { get; set; } = new();
    public List<string> Tier2Cast { get; set; } = new();
    public List<string> Tier1Writers { get; set; } = new();
    public List<string> Tier2Writers { get; set; } = new();
}

internal enum RecommendationTier
{
    Elite = 1,    // 8-10 ratings
    Strong = 2,   // 6-8 ratings
    Broad = 3,    // All ratings
    Popular = 4   // Fallback
}