using System.ComponentModel.DataAnnotations;

namespace SceneStack.API.DTOs;

public record UpdateProfileRequest(
    string? Username,
    string? Email,
    [MaxLength(300)]
    string? Bio
);

public record ChangePasswordRequest(
    [Required]
    string CurrentPassword,
    [Required]
    [MinLength(6)]
    string NewPassword,
    [Required]
    string ConfirmPassword
);

public record DeleteAccountRequest(
    [Required]
    string Password
);
