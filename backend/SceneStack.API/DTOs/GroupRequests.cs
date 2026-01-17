namespace SceneStack.API.DTOs;

public class CreateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class AddMemberRequest
{
    public int UserId { get; set; }
    public int Role { get; set; } = 0; // 0 = Member, 1 = Admin, 2 = Creator
}

public class UpdateMemberRoleRequest
{
    public int Role { get; set; } // 0 = Member, 1 = Admin
}