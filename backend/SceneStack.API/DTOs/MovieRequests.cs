namespace SceneStack.API.DTOs;

public class UpdateMoviePrivacyRequest
{
    public bool IsPrivate { get; set; }
    public List<int> GroupIds { get; set; } = new();  // Groups to share this movie with
}
