using Microsoft.EntityFrameworkCore;
using Nusic.Api.Data;
using Nusic.Api.Services.Interfaces;
using YoutubeExplode.Videos;

namespace Nusic.Api.Services;

public sealed class TrackService(
    NusicDbContext db,
    IStreamResolver streamResolver) : ITrackService
{
    public async Task<UpdateTrackMatchResult> UpdateTrackMatchAsync(
        Guid userId,
        Guid trackId,
        string youtubeUrlOrId,
        CancellationToken ct)
    {
        var parsedVideoId = VideoId.TryParse(youtubeUrlOrId);
        if (parsedVideoId is null)
            return new UpdateTrackMatchResult(UpdateTrackMatchStatus.InvalidVideoId);

        var track = await db.Tracks
            .Include(t => t.Playlist)
            .FirstOrDefaultAsync(t => t.Id == trackId && t.Playlist.UserId == userId, ct);

        if (track is null)
            return new UpdateTrackMatchResult(UpdateTrackMatchStatus.NotFound);

        streamResolver.InvalidateCache(track.YouTubeVideoId);
        track.YouTubeVideoId = parsedVideoId.Value.Value;
        await db.SaveChangesAsync(ct);

        return new UpdateTrackMatchResult(
            UpdateTrackMatchStatus.Success,
            PlaylistService.ToTrackResponse(track));
    }

    public async Task<bool> DeleteTrackAsync(Guid userId, Guid trackId, CancellationToken ct)
    {
        var track = await db.Tracks
            .Include(t => t.Playlist)
            .FirstOrDefaultAsync(t => t.Id == trackId && t.Playlist.UserId == userId, ct);

        if (track is null)
            return false;

        db.Tracks.Remove(track);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> UserOwnsTrackAsync(Guid userId, Guid trackId, CancellationToken ct) =>
        db.Tracks
            .AsNoTracking()
            .AnyAsync(t => t.Id == trackId && t.Playlist.UserId == userId, ct);

    public Task<string?> GetYouTubeVideoIdAsync(Guid trackId, CancellationToken ct) =>
        db.Tracks
            .AsNoTracking()
            .Where(t => t.Id == trackId)
            .Select(t => t.YouTubeVideoId)
            .FirstOrDefaultAsync(ct);
}
