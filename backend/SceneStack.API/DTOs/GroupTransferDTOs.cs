namespace SceneStack.API.DTOs;

public record GroupWithTransferEligibilityResponse(
    int GroupId,
    string GroupName,
    int MemberCount,
    List<EligibleTransferMember> EligibleMembers,
    bool CanTransfer // True if there are eligible members, false if must delete
);

public record EligibleTransferMember(
    int UserId,
    string Username,
    bool IsPremium,
    bool IsAdmin, // In this group
    bool IsEligible // Can receive group ownership
);

public record GroupActionRequest(
    int GroupId,
    string Action, // "delete" or "transfer"
    int? TransferToUserId // Required if Action is "transfer"
);

public record ManageGroupsBeforeDeletionRequest(
    List<GroupActionRequest> GroupActions
);
