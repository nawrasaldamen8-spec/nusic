using FluentValidation;
using Nusic.Api.Models;

namespace Nusic.Api.Validators;

public sealed class RenamePlaylistRequestValidator : AbstractValidator<RenamePlaylistRequest>
{
    public RenamePlaylistRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Playlist name is required.")
            .MaximumLength(100);
    }
}
