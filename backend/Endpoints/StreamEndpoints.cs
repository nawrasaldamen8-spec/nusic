using System.Net;
using System.Security.Claims;
using Nusic.Api.Models;
using Nusic.Api.Services;
using Nusic.Api.Services.Interfaces;

namespace Nusic.Api.Endpoints;

public static class StreamEndpoints
{
    private static readonly TimeSpan SignedUrlLifetime = TimeSpan.FromHours(2);

    public static IEndpointRouteBuilder MapStreamEndpoints(
        this IEndpointRouteBuilder app,
        bool includeSpikeRoute)
    {
        app.MapGet("/api/tracks/{id:guid}/play-url", HandleGetPlayUrlAsync)
           .RequireAuthorization()
           .WithName("GetPlayUrl");

        app.MapPost("/api/tracks/{id:guid}/prepare", HandlePrepareTrackAsync)
           .RequireAuthorization()
           .WithName("PrepareTrackStream");

        app.MapGet("/api/stream/{id:guid}", HandleStreamTrackAsync)
           .WithName("StreamTrackAudio");

        if (includeSpikeRoute)
        {
            app.MapGet("/api/spike/stream/{videoId}", HandleSpikeStreamAsync)
               .WithName("SpikeStreamAudio");
        }

        return app;
    }

    private static async Task<IResult> HandleGetPlayUrlAsync(
        Guid id,
        ClaimsPrincipal principal,
        ITrackService trackService,
        HmacUrlSigner signer,
        HttpRequest request,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var exists = await trackService.UserOwnsTrackAsync(userId, id, ct);
        if (!exists)
            return Results.NotFound();

        var (signature, expiresUnix) = signer.Sign(id, SignedUrlLifetime);
        var baseUrl = $"{request.Scheme}://{request.Host}";
        var signedUrl = $"{baseUrl}/api/stream/{id}?exp={expiresUnix}&sig={Uri.EscapeDataString(signature)}";

        return Results.Ok(new PlayUrlResponse(signedUrl, DateTimeOffset.FromUnixTimeSeconds(expiresUnix)));
    }

    private static async Task<IResult> HandlePrepareTrackAsync(
        Guid id,
        ClaimsPrincipal principal,
        ITrackService trackService,
        IStreamResolver streamResolver,
        CancellationToken ct)
    {
        if (!principal.TryGetUserId(out var userId))
            return Results.Unauthorized();

        var ownsTrack = await trackService.UserOwnsTrackAsync(userId, id, ct);
        if (!ownsTrack)
            return Results.NotFound();

        var videoId = await trackService.GetYouTubeVideoIdAsync(id, ct);
        if (string.IsNullOrWhiteSpace(videoId))
            return Results.NotFound();

        var resolved = await streamResolver.ResolveAudioStreamAsync(videoId, ct);
        if (resolved is null)
            return Results.Json(new { error = "Could not resolve YouTube audio stream." }, statusCode: StatusCodes.Status502BadGateway);

        return Results.NoContent();
    }

    private static async Task HandleStreamTrackAsync(
        Guid id,
        long? exp,
        string? sig,
        HttpContext context,
        ITrackService trackService,
        HmacUrlSigner signer,
        IStreamResolver streamResolver,
        IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        if (exp is null || string.IsNullOrWhiteSpace(sig) || !signer.Verify(id, exp.Value, sig))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        var videoId = await trackService.GetYouTubeVideoIdAsync(id, ct);
        if (string.IsNullOrWhiteSpace(videoId))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        await ProxyYouTubeAudioAsync(videoId, context, streamResolver, httpClientFactory, ct);
    }

    private static Task HandleSpikeStreamAsync(
        string videoId,
        HttpContext context,
        IStreamResolver streamResolver,
        IHttpClientFactory httpClientFactory,
        CancellationToken ct) =>
        ProxyYouTubeAudioAsync(videoId, context, streamResolver, httpClientFactory, ct);

    private static async Task ProxyYouTubeAudioAsync(
        string videoId,
        HttpContext context,
        IStreamResolver streamResolver,
        IHttpClientFactory httpClientFactory,
        CancellationToken ct)
    {
        var resolved = await streamResolver.ResolveAudioStreamAsync(videoId, ct);
        if (resolved is null)
        {
            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            await context.Response.WriteAsJsonAsync(
                new { error = "Could not resolve YouTube audio stream." },
                ct);
            return;
        }

        using var upstreamRequest = BuildUpstreamRequest(resolved.StreamUrl, context.Request);
        var client = httpClientFactory.CreateClient("StreamProxy");
        using var upstreamResponse = await client.SendAsync(
            upstreamRequest,
            HttpCompletionOption.ResponseHeadersRead,
            ct);

        if (upstreamResponse.StatusCode is not (HttpStatusCode.OK or HttpStatusCode.PartialContent))
        {
            context.Response.StatusCode = (int)upstreamResponse.StatusCode;
            return;
        }

        CopyStreamHeaders(context.Response, upstreamResponse, resolved.ContentType);

        await using var upstreamStream = await upstreamResponse.Content.ReadAsStreamAsync(ct);
        await upstreamStream.CopyToAsync(context.Response.Body, ct);
    }

    private static HttpRequestMessage BuildUpstreamRequest(string streamUrl, HttpRequest incomingRequest)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, streamUrl);
        if (incomingRequest.Headers.TryGetValue("Range", out var rangeValues) &&
            !string.IsNullOrWhiteSpace(rangeValues.ToString()))
        {
            request.Headers.TryAddWithoutValidation("Range", rangeValues.ToString());
        }

        return request;
    }

    private static void CopyStreamHeaders(
        HttpResponse response,
        HttpResponseMessage upstreamResponse,
        string contentType)
    {
        response.StatusCode = (int)upstreamResponse.StatusCode;
        response.ContentType = contentType;
        response.Headers["Accept-Ranges"] = "bytes";

        if (upstreamResponse.Content.Headers.ContentLength is { } contentLength)
            response.ContentLength = contentLength;

        if (upstreamResponse.Content.Headers.ContentRange is { } contentRange)
            response.Headers["Content-Range"] = contentRange.ToString();
    }
}
