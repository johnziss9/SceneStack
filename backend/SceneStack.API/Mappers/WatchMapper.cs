using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Mappers;

public static class WatchMapper
{
    public static WatchResponse ToResponse(Watch watch)
    {
        return new WatchResponse
        {
            Id = watch.Id,
            UserId = watch.UserId,
            MovieId = watch.MovieId,
            WatchedDate = watch.WatchedDate,
            Rating = watch.Rating,
            Notes = watch.Notes,
            WatchLocation = watch.WatchLocation,
            WatchedWith = watch.WatchedWith,
            IsRewatch = watch.IsRewatch,
            IsPrivate = watch.IsPrivate,
            GroupIds = watch.WatchGroups?.Select(wg => wg.GroupId).ToList() ?? new List<int>(),
            CreatedAt = watch.CreatedAt,
            Movie = new MovieBasicInfo
            {
                Id = watch.Movie.Id,
                TmdbId = watch.Movie.TmdbId,
                Title = watch.Movie.Title,
                Year = watch.Movie.Year,
                PosterPath = watch.Movie.PosterPath,
                Synopsis = watch.Movie.Synopsis,
                AiSynopsis = watch.Movie.AiSynopsis
            },
            User = new UserBasicInfo
            {
                Id = watch.User.Id,
                Username = watch.User.Username,
                Email = watch.User.Email
            }
        };
    }
}