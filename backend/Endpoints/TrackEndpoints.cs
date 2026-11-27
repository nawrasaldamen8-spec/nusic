using System.Security.Claims;
using Nusic.Api.Endpoints.Filters;
using Nusic.Api.Models;
using Nusic.Api.Services.Interfaces;

namespace Nusic.Api.Endpoints;

public static class TrackEndpoints
{
    public static IEndpointRouteBuilder MapTrackEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tracks").RequireAuthorization();

        group.MapGet("/preview", PreviewTrackAsync);
        group.MapGet("/search", SearchTracksAsync);
        group.MapPatch("/{id:guid}/match", UpdateTrackMatchAsync)
             .WithValidation<UpdateTrackMatchRequest>();
        group.MapDelete("/{id:guid}", DeleteTrackAsync);

        return app;
    }

    private static async Task<IResult> PreviewTrackAsync(
        string? url,
        IMetadataResolver metadataResolver,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(url) ||
            !Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https"))
        {
            return Results.BadRequest(new { error = "A valid HTTP or HTTPS song URL is required." });
        }

        var metadata = await metadataResolver.ResolveAsync(uri.ToString(), ct);
        if (metadata is null)
            return Results.BadRequest(new { error = "Could not resolve track metadata from the provided URL." });

        return Results.Ok(new TrackPreviewResponse(
            metadata.SourceType,
            metadata.Title,
            metadata.Artist,
            metadata.ThumbnailUrl));
    }

    private static async Task<IResult> SearchTracksAsync(
        string? q,
        int? limit,
        IMetadataResolver metadataResolver,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Results.BadRequest(new { error = "A search query is required." });

        var results = await metadataResolver.SearchAsync(q.Trim(), limit ?? 12, ct);
        return Results.Ok(results);
    }

    private static async Task<IResult> UpdateTrackMatchAsync(
        Guid id,
        UpdateTrackMatchRequest request,
        ClaimsPrincipal principal,
        ITrackService trackService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var result = await trackService.UpdateTrackMatchAsync(userId, id, request.YouTubeUrlOrId, ct);
        return result.Status switch
        {
            UpdateTrackMatchStatus.InvalidVideoId => Results.BadRequest(
                new { error = "Invalid YouTube URL or video ID." }),
            UpdateTrackMatchStatus.NotFound => Results.NotFound(),
            UpdateTrackMatchStatus.Success => Results.Ok(result.Track),
            _ => Results.Problem()
        };
    }

    private static async Task<IResult> DeleteTrackAsync(
        Guid id,
        ClaimsPrincipal principal,
        ITrackService trackService,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var deleted = await trackService.DeleteTrackAsync(userId, id, ct);
        return deleted ? Results.NoContent() : Results.NotFound();
    }
}
