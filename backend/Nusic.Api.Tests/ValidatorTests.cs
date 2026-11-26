using Nusic.Api.Models;
using Nusic.Api.Validators;

namespace Nusic.Api.Tests;

public sealed class ValidatorTests
{
    [Fact]
    public void LoginRequestValidator_Fails_WhenFieldsAreEmpty()
    {
        var validator = new LoginRequestValidator();
        var result = validator.Validate(new LoginRequest("", ""));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(LoginRequest.Identifier));
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(LoginRequest.Password));
    }

    [Fact]
    public void CreatePlaylistRequestValidator_Passes_ForValidName()
    {
        var validator = new CreatePlaylistRequestValidator();
        var result = validator.Validate(new CreatePlaylistRequest("My Vibes"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void AddTrackRequestValidator_Fails_ForNonHttpUrl()
    {
        var validator = new AddTrackRequestValidator();
        var result = validator.Validate(new AddTrackRequest("ftp://example.com/song.mp3"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(AddTrackRequest.Url));
    }

    [Fact]
    public void UpdateTrackMatchRequestValidator_Passes_ForValidYouTubeId()
    {
        var validator = new UpdateTrackMatchRequestValidator();
        var result = validator.Validate(new UpdateTrackMatchRequest("dQw4w9WgXcQ"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void UpdateTrackMatchRequestValidator_Fails_ForInvalidYouTubeId()
    {
        var validator = new UpdateTrackMatchRequestValidator();
        var result = validator.Validate(new UpdateTrackMatchRequest("not-a-valid-id"));

        Assert.False(result.IsValid);
    }
}
