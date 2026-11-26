using System.Net;
using Nusic.Api.Services;

namespace Nusic.Api.Tests;

public sealed class YouTubeClientFactoryTests
{
    [Fact]
    public void ParseProxy_ParsesHostAndCredentials()
    {
        Assert.Null(YouTubeClientFactory.ParseProxy(null));

        var proxy = Assert.IsType<WebProxy>(
            YouTubeClientFactory.ParseProxy("http://alice:s3cr3t@proxy.example.com:8080"));
        Assert.Equal("http://proxy.example.com:8080/", proxy.Address?.ToString());
        var creds = Assert.IsType<NetworkCredential>(proxy.Credentials);
        Assert.Equal("alice", creds.UserName);
        Assert.Equal("s3cr3t", creds.Password);
    }
}
