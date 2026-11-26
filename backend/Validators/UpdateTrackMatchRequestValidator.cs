using FluentValidation;
using Nusic.Api.Models;
using YoutubeExplode.Videos;

namespace Nusic.Api.Validators;

public sealed class UpdateTrackMatchRequestValidator : AbstractValidator<UpdateTrackMatchRequest>
{
    public UpdateTrackMatchRequestValidator()
    {
        RuleFor(x => x.YouTubeUrlOrId)
            .NotEmpty()
            .WithMessage("YouTube URL or video ID is required.")
            .Must(id => !string.IsNullOrWhiteSpace(id) && VideoId.TryParse(id) is not null)
            .WithMessage("Invalid YouTube URL or video ID.");
    }
}
