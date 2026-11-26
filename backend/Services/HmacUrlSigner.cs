using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace Nusic.Api.Services;

public sealed class HmacUrlSigner
{
    private readonly byte[] _secretBytes;

    public HmacUrlSigner(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
            throw new ArgumentException("Stream signing secret must be at least 32 characters.", nameof(secret));

        _secretBytes = Encoding.UTF8.GetBytes(secret);
    }

    public (string Signature, long ExpiresUnix) Sign(Guid trackId, TimeSpan lifetime)
    {
        var expiresUnix = DateTimeOffset.UtcNow.Add(lifetime).ToUnixTimeSeconds();
        var signature = ComputeSignature(trackId, expiresUnix);
        return (signature, expiresUnix);
    }

    public bool Verify(Guid trackId, long expiresUnix, string signature)
    {
        if (string.IsNullOrWhiteSpace(signature))
            return false;

        if (DateTimeOffset.FromUnixTimeSeconds(expiresUnix) <= DateTimeOffset.UtcNow)
            return false;

        var expected = ComputeSignature(trackId, expiresUnix);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(signature);

        return expectedBytes.Length == actualBytes.Length &&
               CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private string ComputeSignature(Guid trackId, long expiresUnix)
    {
        var payload = $"{trackId:N}:{expiresUnix}";
        var hash = HMACSHA256.HashData(_secretBytes, Encoding.UTF8.GetBytes(payload));
        return WebEncoders.Base64UrlEncode(hash);
    }
}
