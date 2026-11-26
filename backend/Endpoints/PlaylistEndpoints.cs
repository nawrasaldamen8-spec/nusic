using System.Security.Claims;
using Nusic.Api.Endpoints.Filters;
using Nusic.Api.Models;
using Nusic.Api.Services.Interfaces;

namespace Nusic.Api.Endpoints;

public static class PlaylistEndpoints
{
    public static IEndpointRouteBuilder MapPlaylistEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/playlists").RequireAuthorization();

        group.MapGet("/", GetPlaylistsAsync);
        group.MapPost("/", CreatePlaylistAsync).WithValidation<CreatePlaylistRequest>();
        group.MapPatch("/{id:guid}", RenamePlaylistAsync).WithValidation<RenamePlaylistRequest>();
        group.MapDelete("/{id:guid}", DeletePlaylistAsync);
        group.MapGet("/{id:guid}/tracks", GetTracksAsync);
        group.MapPost("/{id:guid}/tracks", AddTrackAsync).WithValidation<AddTrackRequest>();

        return app;
    }

    private static async Task<IResult> GetPlaylistsAsync(
        ClaimsPrincipal principal,
        IPlaylistService playlistService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var playlists = await playlistService.GetPlaylistsAsync(userId, ct);
        return Results.Ok(playlists);
    }

    private static async Task<IResult> CreatePlaylistAsync(
        CreatePlaylistRequest request,
        ClaimsPrincipal principal,
        IPlaylistService playlistService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var playlist = await playlistService.CreatePlaylistAsync(userId, request.Name, ct);
        return Results.Created($"/api/playlists/{playlist.Id}", playlist);
    }

    private static async Task<IResult> RenamePlaylistAsync(
        Guid id,
        RenamePlaylistRequest request,
        ClaimsPrincipal principal,
        IPlaylistService playlistService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var playlist = await playlistService.RenamePlaylistAsync(userId, id, request.Name, ct);
        return playlist is null ? Results.NotFound() : Results.Ok(playlist);
    }

    private static async Task<IResult> DeletePlaylistAsync(
        Guid id,
        ClaimsPrincipal principal,
        IPlaylistService playlistService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var deleted = await playlistService.DeletePlaylistAsync(userId, id, ct);
        return deleted ? Results.NoContent() : Results.NotFound();
    }

    private static async Task<IResult> GetTracksAsync(
        Guid id,
        ClaimsPrincipal principal,
        IPlaylistService playlistService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var tracks = await playlistService.GetTracksAsync(userId, id, ct);
        return tracks is null ? Results.NotFound() : Results.Ok(tracks);
    }

    private static async Task<IResult> AddTrackAsync(
        Guid id,
        AddTrackRequest request,
        ClaimsPrincipal principal,
        IPlaylistService playlistService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var result = await playlistService.AddTrackAsync(userId, id, request.Url, ct);
        return result.Status switch
        {
            AddTrackStatus.PlaylistNotFound => Results.NotFound(),
            AddTrackStatus.MetadataResolutionFailed => Results.BadRequest(
                new { error = "Could not resolve track metadata from the provided URL." }),
            AddTrackStatus.Success => Results.Created($"/api/tracks/{result.Track!.Id}", result.Track),
            _ => Results.Problem()
        };
    }
}
