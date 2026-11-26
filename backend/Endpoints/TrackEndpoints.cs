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

        group.MapPatch("/{id:guid}/match", UpdateTrackMatchAsync)
             .WithValidation<UpdateTrackMatchRequest>();
        group.MapDelete("/{id:guid}", DeleteTrackAsync);

        return app;
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
