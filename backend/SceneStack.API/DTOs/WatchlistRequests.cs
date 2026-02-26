using System.ComponentModel.DataAnnotations;

namespace SceneStack.API.DTOs;

public class AddToWatchlistRequest
{
    public int TmdbId { get; set; }
    public string? Notes { get; set; }
    // Priority will be set to max+1 by service, this value is ignored
    public int Priority { get; set; } = 1;
}

public class UpdateWatchlistItemRequest
{
    public string? Notes { get; set; }
    public int? Priority { get; set; }
}

public class UpdatePriorityRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Priority must be at least 1")]
    public int NewPriority { get; set; }
}
