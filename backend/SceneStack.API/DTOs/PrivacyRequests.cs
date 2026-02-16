namespace SceneStack.API.DTOs;

public class UpdatePrivacySettingsRequest
{
    public bool? ShareWatches { get; set; }
    public bool? ShareRatings { get; set; }
    public bool? ShareNotes { get; set; }
}