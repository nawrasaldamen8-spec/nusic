using FluentValidation;
using Nusic.Api.Models;

namespace Nusic.Api.Validators;

public sealed class AddTrackRequestValidator : AbstractValidator<AddTrackRequest>
{
    public AddTrackRequestValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty()
            .WithMessage("Song URL is required.")
            .Must(BeAValidHttpUrl)
            .WithMessage("Song URL must be a valid HTTP or HTTPS URL.");
    }

    private static bool BeAValidHttpUrl(string? url) =>
        !string.IsNullOrWhiteSpace(url) &&
        Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
