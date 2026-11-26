namespace Nusic.Api.Models;

public sealed record ResolvedAudioStream(
    string StreamUrl,
    long ContentLength,
    string ContentType,
    DateTimeOffset ExpiresAt);
