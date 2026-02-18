using SceneStack.API.Models;

namespace SceneStack.API.DTOs;

public class WatchlistItemResponse
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public MovieBasicInfo Movie { get; set; } = null!;
    public string? Notes { get; set; }
    public WatchlistItemPriority Priority { get; set; }
    public DateTime AddedAt { get; set; }
}

public class PaginatedWatchlistResponse
{
    public List<WatchlistItemResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasMore { get; set; }
}
