using Nusic.Api.Services;

namespace Nusic.Api.Tests;

public sealed class YouTubeCookieParserTests
{
    [Fact]
    public void Parse_ReturnsEmpty_WhenNullOrWhitespace()
    {
        Assert.Empty(YouTubeCookieParser.Parse(null));
        Assert.Empty(YouTubeCookieParser.Parse("   "));
    }

    [Fact]
    public void Parse_ParsesHeaderFormat()
    {
        var cookies = YouTubeCookieParser.Parse("SID=abc=123; HSID=xyz; CONSENT=YES+");

        Assert.Equal(3, cookies.Count);
        Assert.Equal("SID", cookies[0].Name);
        Assert.Equal("abc=123", cookies[0].Value);
        Assert.Equal(".youtube.com", cookies[0].Domain);
    }

    [Fact]
    public void Parse_ParsesNetscapeFormat()
    {
        var netscape = """
            # Netscape HTTP Cookie File
            .youtube.com	TRUE	/	TRUE	1799999999	SID	token_value
            .youtube.com	TRUE	/	FALSE	1799999999	CONSENT	YES+
            """;

        var cookies = YouTubeCookieParser.Parse(netscape);

        Assert.Equal(2, cookies.Count);
        Assert.Equal("SID", cookies[0].Name);
        Assert.Equal("token_value", cookies[0].Value);
        Assert.Equal(".youtube.com", cookies[0].Domain);
    }
}
