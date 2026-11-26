using Nusic.Api.Services;

namespace Nusic.Api.Tests;

public sealed class HmacUrlSignerTests
{
    private const string TestSecret = "test-secret-key-with-at-least-32-characters";

    [Fact]
    public void Verify_ReturnsTrue_ForValidSignatureAndFutureExpiry()
    {
        var signer = new HmacUrlSigner(TestSecret);
        var trackId = Guid.NewGuid();
        var (sig, exp) = signer.Sign(trackId, TimeSpan.FromMinutes(10));

        Assert.True(signer.Verify(trackId, exp, sig));
    }

    [Fact]
    public void Verify_ReturnsFalse_WhenTrackIdIsTampered()
    {
        var signer = new HmacUrlSigner(TestSecret);
        var trackId = Guid.NewGuid();
        var (sig, exp) = signer.Sign(trackId, TimeSpan.FromMinutes(10));

        Assert.False(signer.Verify(Guid.NewGuid(), exp, sig));
    }

    [Fact]
    public void Verify_ReturnsFalse_WhenSignatureIsExpired()
    {
        var signer = new HmacUrlSigner(TestSecret);
        var trackId = Guid.NewGuid();
        var (sig, exp) = signer.Sign(trackId, TimeSpan.FromMinutes(-1));

        Assert.False(signer.Verify(trackId, exp, sig));
    }

    [Fact]
    public void Verify_ReturnsFalse_WhenSignatureIsTampered()
    {
        var signer = new HmacUrlSigner(TestSecret);
        var trackId = Guid.NewGuid();
        var (_, exp) = signer.Sign(trackId, TimeSpan.FromMinutes(10));

        Assert.False(signer.Verify(trackId, exp, "invalid-signature"));
    }
}
