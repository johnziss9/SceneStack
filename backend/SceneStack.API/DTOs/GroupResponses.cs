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

    // Nested user info
    public UserBasicInfo User { get; set; } = null!;
}

public class GroupFeedItemResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int MovieId { get; set; }
    public string MovieTitle { get; set; } = string.Empty;
    public string? PosterPath { get; set; }
    public DateTime WatchedDate { get; set; }
    public int? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
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