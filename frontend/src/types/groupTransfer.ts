export interface EligibleTransferMember {
    userId: number;
    username: string;
    isPremium: boolean;
    isAdmin: boolean;
    isEligible: boolean;
}

export interface GroupWithTransferEligibility {
    groupId: number;
    groupName: string;
    memberCount: number;
    eligibleMembers: EligibleTransferMember[];
    canTransfer: boolean;
}
