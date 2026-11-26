using Microsoft.EntityFrameworkCore;
using Nusic.Api.Data;
using Nusic.Api.Models;
using Nusic.Api.Services.Interfaces;

namespace Nusic.Api.Services;

public sealed class PlaylistService(
    NusicDbContext db,
    IMetadataResolver metadataResolver) : IPlaylistService
{
    public async Task<IReadOnlyList<PlaylistResponse>> GetPlaylistsAsync(Guid userId, CancellationToken ct) =>
        await db.Playlists
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PlaylistResponse(
                p.Id,
                p.Name,
                p.CreatedAt,
                p.Tracks.Count,
                p.Tracks
                    .OrderBy(t => t.Position)
                    .ThenBy(t => t.CreatedAt)
                    .Select(t => t.ThumbnailUrl)
                    .FirstOrDefault()))
            .ToListAsync(ct);

    public async Task<PlaylistResponse> CreatePlaylistAsync(Guid userId, string name, CancellationToken ct)
    {
        var playlist = new Playlist
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name.Trim()
        };

        db.Playlists.Add(playlist);
        await db.SaveChangesAsync(ct);

        return new PlaylistResponse(playlist.Id, playlist.Name, playlist.CreatedAt, 0, null);
    }

    public async Task<PlaylistResponse?> RenamePlaylistAsync(
        Guid userId,
        Guid playlistId,
        string name,
        CancellationToken ct)
    {
        var playlist = await db.Playlists
            .FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId, ct);

        if (playlist is null)
            return null;

        playlist.Name = name.Trim();
        await db.SaveChangesAsync(ct);

        var trackCount = await db.Tracks.CountAsync(t => t.PlaylistId == playlistId, ct);
        var coverUrl = await db.Tracks
            .AsNoTracking()
            .Where(t => t.PlaylistId == playlistId)
            .OrderBy(t => t.Position)
            .ThenBy(t => t.CreatedAt)
            .Select(t => t.ThumbnailUrl)
            .FirstOrDefaultAsync(ct);

        return new PlaylistResponse(playlist.Id, playlist.Name, playlist.CreatedAt, trackCount, coverUrl);
    }

    public async Task<bool> DeletePlaylistAsync(Guid userId, Guid playlistId, CancellationToken ct)
    {
        var playlist = await db.Playlists
            .FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId, ct);

        if (playlist is null)
            return false;

        db.Playlists.Remove(playlist);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<TrackResponse>?> GetTracksAsync(
        Guid userId,
        Guid playlistId,
        CancellationToken ct)
    {
        var exists = await db.Playlists.AnyAsync(p => p.Id == playlistId && p.UserId == userId, ct);
        if (!exists)
            return null;

        var tracks = await db.Tracks
            .Where(t => t.PlaylistId == playlistId)
            .OrderBy(t => t.Position)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);

        var updatedAny = false;
        foreach (var track in tracks)
        {
            if (track.SourceType != "spotify" || !string.IsNullOrWhiteSpace(track.Artist))
                continue;

            var artist = await metadataResolver.ResolveSpotifyArtistAsync(track.OriginalUrl, ct);
            if (!string.IsNullOrWhiteSpace(artist))
            {
                track.Artist = artist;
                updatedAny = true;
            }
        }

        if (updatedAny)
            await db.SaveChangesAsync(ct);

        return tracks.Select(ToTrackResponse).ToList();
    }

    public async Task<AddTrackResult> AddTrackAsync(
        Guid userId,
        Guid playlistId,
        string url,
        CancellationToken ct)
    {
        var playlistExists = await db.Playlists.AnyAsync(p => p.Id == playlistId && p.UserId == userId, ct);
        if (!playlistExists)
            return new AddTrackResult(AddTrackStatus.PlaylistNotFound);

        var metadata = await metadataResolver.ResolveAsync(url, ct);
        if (metadata is null)
            return new AddTrackResult(AddTrackStatus.MetadataResolutionFailed);

        var nextPosition = await db.Tracks
            .Where(t => t.PlaylistId == playlistId)
            .Select(t => (int?)t.Position)
            .MaxAsync(ct) ?? -1;

        var track = new Track
        {
            Id = Guid.NewGuid(),
            PlaylistId = playlistId,
            Position = nextPosition + 1,
            SourceType = metadata.SourceType,
            OriginalUrl = metadata.OriginalUrl,
            YouTubeVideoId = metadata.YouTubeVideoId,
            Title = metadata.Title,
            Artist = metadata.Artist,
            DurationSeconds = metadata.DurationSeconds,
            ThumbnailUrl = metadata.ThumbnailUrl
        };

        db.Tracks.Add(track);
        await db.SaveChangesAsync(ct);

        return new AddTrackResult(AddTrackStatus.Success, ToTrackResponse(track));
    }

    internal static TrackResponse ToTrackResponse(Track t) => new(
        t.Id,
        t.PlaylistId,
        t.Position,
        t.SourceType,
        t.OriginalUrl,
        t.YouTubeVideoId,
        t.Title,
        t.Artist,
        t.DurationSeconds,
        t.ThumbnailUrl,
        t.CreatedAt);
}
