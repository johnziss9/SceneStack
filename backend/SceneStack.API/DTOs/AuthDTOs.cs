namespace SceneStack.API.DTOs;

public record RegisterRequest(
    string Username,
    string Email,
    string Password
);

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    string Token,
    string Username,
    string Email,
    int UserId,  // This is the domain User.Id (int)
    bool IsDeactivated = false,
    DateTime? DeactivatedAt = null,
    int? DaysUntilPermanentDeletion = null
);