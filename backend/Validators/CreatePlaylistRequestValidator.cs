using FluentValidation;
using Nusic.Api.Models;

namespace Nusic.Api.Validators;

public sealed class CreatePlaylistRequestValidator : AbstractValidator<CreatePlaylistRequest>
{
    public CreatePlaylistRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Playlist name is required.")
            .MaximumLength(100);
    }
}
