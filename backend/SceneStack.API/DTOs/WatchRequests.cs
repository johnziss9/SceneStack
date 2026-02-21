namespace SceneStack.API.DTOs;

public class GetGroupedWatchesRequest
{
    public int UserId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int? GroupId { get; set; }
    public string? Search { get; set; }
    public int? RatingMin { get; set; }
    public int? RatingMax { get; set; }
    public DateTime? WatchedFrom { get; set; }
    public DateTime? WatchedTo { get; set; }
    public bool? RewatchOnly { get; set; }
    public bool? UnratedOnly { get; set; }
    public string? SortBy { get; set; } // "recentlyWatched" | "title" | "highestRated" | "mostWatched"
}

public class CreateWatchRequest
{
    public int TmdbId { get; set; }
    public DateTime WatchedDate { get; set; }
    public double? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
    public bool IsPrivate { get; set; } = false;
    public List<int> GroupIds { get; set; } = new();  // Groups to share this watch with
}

public class UpdateWatchRequest
{
    public DateTime WatchedDate { get; set; }
    public double? Rating { get; set; }
    public string? Notes { get; set; }
    public string? WatchLocation { get; set; }
    public string? WatchedWith { get; set; }
    public bool IsRewatch { get; set; }
    public bool IsPrivate { get; set; }
    public List<int>? GroupIds { get; set; }
}

public class BulkUpdateWatchesRequest
{
    public List<int> WatchIds { get; set; } = new();
    public bool IsPrivate { get; set; }
    public List<int>? GroupIds { get; set; }
    public string GroupOperation { get; set; } = "replace"; // "add" or "replace"
}