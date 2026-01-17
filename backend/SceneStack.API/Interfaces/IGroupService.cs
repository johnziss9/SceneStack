using SceneStack.API.DTOs;
using SceneStack.API.Models;

namespace SceneStack.API.Interfaces;

public interface IGroupService
{
    Task<Group?> GetByIdAsync(int id, int requestingUserId);
    Task<IEnumerable<GroupResponse>> GetUserGroupsAsync(int userId);
    Task<Group> CreateAsync(int userId, CreateGroupRequest request);
    Task<Group?> UpdateAsync(int id, int requestingUserId, UpdateGroupRequest request);
    Task<bool> DeleteAsync(int id, int requestingUserId);
    Task<GroupMember?> AddMemberAsync(int groupId, int requestingUserId, AddMemberRequest request);
    Task<bool> RemoveMemberAsync(int groupId, int memberUserId, int requestingUserId);
    Task<GroupMember?> UpdateMemberRoleAsync(int groupId, int memberUserId, int requestingUserId, UpdateMemberRoleRequest request);
    Task<IEnumerable<GroupMemberResponse>> GetGroupMembersAsync(int groupId, int requestingUserId);
    Task<bool> CanUserCreateGroupAsync(int userId);
    Task<bool> CanUserJoinGroupAsync(int userId);
}