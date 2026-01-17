using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class PrivacyService : IPrivacyService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PrivacyService> _logger;

    public PrivacyService(ApplicationDbContext context, ILogger<PrivacyService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<bool> CanViewWatchAsync(int watchId, int requestingUserId)
    {
        var watch = await _context.Watches
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == watchId);

        if (watch == null)
            return false;

        // Users can always see their own watches
        if (watch.UserId == requestingUserId)
            return true;

        // If watch is marked private, only owner can see it
        if (watch.IsPrivate)
            return false;

        // Check if users share a group
        if (!await AreUsersInSameGroupAsync(watch.UserId, requestingUserId))
            return false;

        // Check user's global privacy setting
        return watch.User.ShareWatches;
    }

    public async Task<bool> CanViewRatingAsync(int watchId, int requestingUserId)
    {
        var watch = await _context.Watches
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == watchId);

        if (watch == null)
            return false;

        // Users can always see their own ratings
        if (watch.UserId == requestingUserId)
            return true;

        // If watch is marked private, only owner can see anything
        if (watch.IsPrivate)
            return false;

        // Check if users share a group
        if (!await AreUsersInSameGroupAsync(watch.UserId, requestingUserId))
            return false;

        // Check user's global privacy settings
        return watch.User.ShareWatches && watch.User.ShareRatings;
    }

    public async Task<bool> CanViewNotesAsync(int watchId, int requestingUserId)
    {
        var watch = await _context.Watches
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == watchId);

        if (watch == null)
            return false;

        // Users can always see their own notes
        if (watch.UserId == requestingUserId)
            return true;

        // If watch is marked private, only owner can see anything
        if (watch.IsPrivate)
            return false;

        // Check if users share a group
        if (!await AreUsersInSameGroupAsync(watch.UserId, requestingUserId))
            return false;

        // Check user's global privacy settings
        return watch.User.ShareWatches && watch.User.ShareNotes;
    }

    public async Task<IEnumerable<Watch>> FilterWatchesByPrivacyAsync(IEnumerable<Watch> watches, int requestingUserId)
    {
        var filteredWatches = new List<Watch>();

        foreach (var watch in watches)
        {
            // Users can always see their own watches
            if (watch.UserId == requestingUserId)
            {
                filteredWatches.Add(watch);
                continue;
            }

            // If watch is marked private, skip it
            if (watch.IsPrivate)
                continue;

            // Check if users share a group
            if (!await AreUsersInSameGroupAsync(watch.UserId, requestingUserId))
                continue;

            // Load user if not already loaded
            if (watch.User == null)
            {
                watch.User = await _context.Users.FindAsync(watch.UserId) ?? new User();
            }

            // Check user's global privacy setting
            if (!watch.User.ShareWatches)
                continue;

            // Apply rating/notes privacy filters
            var canViewRating = watch.User.ShareRatings;
            var canViewNotes = watch.User.ShareNotes;

            if (!canViewRating)
                watch.Rating = null;

            if (!canViewNotes)
                watch.Notes = null;

            filteredWatches.Add(watch);
        }

        return filteredWatches;
    }

    public async Task<bool> AreUsersInSameGroupAsync(int userId1, int userId2)
    {
        // Check if both users are members of at least one common group
        var sharedGroups = await _context.GroupMembers
            .Where(gm1 => gm1.UserId == userId1)
            .Join(
                _context.GroupMembers.Where(gm2 => gm2.UserId == userId2),
                gm1 => gm1.GroupId,
                gm2 => gm2.GroupId,
                (gm1, gm2) => gm1.GroupId
            )
            .AnyAsync();

        return sharedGroups;
    }
}