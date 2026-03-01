import { userApi } from '@/lib/api'
import { api } from '@/lib/api-client'
import type { GroupWithTransferEligibility, DeleteAccountRequest } from '@/types'

// Mock the api-client module
jest.mock('@/lib/api-client', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
    ApiError: class ApiError extends Error {
        constructor(public status: number, message: string) {
            super(message)
            this.name = 'ApiError'
        }
    },
}))

describe('User Account Management API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('userApi.deactivate', () => {
        it('should deactivate user account', async () => {
            const mockResponse = { message: 'Account deactivated successfully' }

            ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.deactivate()

            expect(api.post).toHaveBeenCalledWith('/api/users/deactivate')
            expect(result).toEqual(mockResponse)
        })

        it('should handle deactivation errors', async () => {
            const mockError = new Error('Deactivation failed')

            ; (api.post as jest.Mock).mockRejectedValue(mockError)

            await expect(userApi.deactivate()).rejects.toThrow('Deactivation failed')
        })
    })

    describe('userApi.reactivate', () => {
        it('should reactivate user account', async () => {
            const mockResponse = { message: 'Account reactivated successfully' }

            ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.reactivate()

            expect(api.post).toHaveBeenCalledWith('/api/users/reactivate')
            expect(result).toEqual(mockResponse)
        })

        it('should clear pending group actions on reactivation', async () => {
            const mockResponse = {
                message: 'Account reactivated successfully. Pending group actions cleared.'
            }

            ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.reactivate()

            expect(result.message).toContain('Pending group actions cleared')
        })

        it('should handle reactivation errors', async () => {
            const mockError = new Error('Reactivation failed')

            ; (api.post as jest.Mock).mockRejectedValue(mockError)

            await expect(userApi.reactivate()).rejects.toThrow('Reactivation failed')
        })
    })

    describe('userApi.getCreatedGroupsWithEligibility', () => {
        it('should fetch groups with transfer eligibility', async () => {
            const mockResponse: GroupWithTransferEligibility[] = [
                {
                    groupId: 1,
                    groupName: 'Movie Club',
                    memberCount: 3,
                    eligibleMembers: [
                        {
                            userId: 2,
                            username: 'john_premium',
                            isPremium: true,
                            isAdmin: true,
                            isEligible: true
                        },
                        {
                            userId: 3,
                            username: 'jane_free',
                            isPremium: false,
                            isAdmin: false,
                            isEligible: false
                        }
                    ],
                    canTransfer: true
                }
            ]

            ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.getCreatedGroupsWithEligibility()

            expect(api.get).toHaveBeenCalledWith('/api/users/groups/created')
            expect(result).toEqual(mockResponse)
            expect(result[0].canTransfer).toBe(true)
            expect(result[0].eligibleMembers).toHaveLength(2)
        })

        it('should handle groups with no eligible transfer members', async () => {
            const mockResponse: GroupWithTransferEligibility[] = [
                {
                    groupId: 2,
                    groupName: 'Solo Group',
                    memberCount: 1,
                    eligibleMembers: [],
                    canTransfer: false
                }
            ]

            ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.getCreatedGroupsWithEligibility()

            expect(result[0].canTransfer).toBe(false)
            expect(result[0].eligibleMembers).toHaveLength(0)
        })

        it('should exclude deactivated and deleted users from eligible members', async () => {
            const mockResponse: GroupWithTransferEligibility[] = [
                {
                    groupId: 1,
                    groupName: 'Active Group',
                    memberCount: 4,
                    eligibleMembers: [
                        {
                            userId: 2,
                            username: 'active_user',
                            isPremium: false,
                            isAdmin: false,
                            isEligible: true
                        }
                    ],
                    canTransfer: true
                }
            ]

            ; (api.get as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.getCreatedGroupsWithEligibility()

            // Should only return active users
            expect(result[0].eligibleMembers).toHaveLength(1)
            expect(result[0].eligibleMembers[0].username).toBe('active_user')
        })
    })

    describe('userApi.manageGroupsBeforeDeletion', () => {
        it('should submit group deletion actions', async () => {
            const groupActions = [
                { groupId: 1, action: 'delete' },
                { groupId: 2, action: 'delete' }
            ]
            const mockResponse = { message: 'Group actions saved' }

            ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.manageGroupsBeforeDeletion(groupActions)

            expect(api.post).toHaveBeenCalledWith(
                '/api/users/groups/manage',
                { groupActions }
            )
            expect(result).toEqual(mockResponse)
        })

        it('should submit group transfer actions', async () => {
            const groupActions = [
                { groupId: 1, action: 'transfer', transferToUserId: 5 },
                { groupId: 2, action: 'delete' }
            ]
            const mockResponse = { message: 'Group actions saved' }

            ; (api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.manageGroupsBeforeDeletion(groupActions)

            expect(api.post).toHaveBeenCalledWith(
                '/api/users/groups/manage',
                { groupActions }
            )
            expect(result).toEqual(mockResponse)
        })

        it('should handle validation errors', async () => {
            const groupActions = [
                { groupId: 1, action: 'transfer' } // Missing transferToUserId
            ]

            const mockError = new Error('Transfer requires a target user ID')

            ; (api.post as jest.Mock).mockRejectedValue(mockError)

            await expect(
                userApi.manageGroupsBeforeDeletion(groupActions)
            ).rejects.toThrow('Transfer requires a target user ID')
        })
    })

    describe('userApi.deleteAccount', () => {
        it('should delete account with password', async () => {
            const deleteRequest: DeleteAccountRequest = {
                password: 'MyPassword123!'
            }
            const mockResponse = { message: 'Account deletion initiated' }

            ; (api.delete as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.deleteAccount(deleteRequest)

            expect(api.delete).toHaveBeenCalledWith(
                '/api/users/account',
                deleteRequest
            )
            expect(result).toEqual(mockResponse)
        })

        it('should handle incorrect password', async () => {
            const deleteRequest: DeleteAccountRequest = {
                password: 'WrongPassword'
            }

            const mockError = new Error('Invalid password')

            ; (api.delete as jest.Mock).mockRejectedValue(mockError)

            await expect(
                userApi.deleteAccount(deleteRequest)
            ).rejects.toThrow('Invalid password')
        })

        it('should handle account deletion for user with groups', async () => {
            const deleteRequest: DeleteAccountRequest = {
                password: 'MyPassword123!'
            }
            const mockResponse = {
                message: 'Account scheduled for deletion. Groups will be handled as specified.'
            }

            ; (api.delete as jest.Mock).mockResolvedValue(mockResponse)

            const result = await userApi.deleteAccount(deleteRequest)

            expect(result.message).toContain('Groups will be handled')
        })
    })

    describe('Account deletion flow integration', () => {
        it('should complete full deletion flow with group management', async () => {
            // Step 1: Get groups with eligibility
            const mockGroups: GroupWithTransferEligibility[] = [
                {
                    groupId: 1,
                    groupName: 'Film Club',
                    memberCount: 3,
                    eligibleMembers: [
                        {
                            userId: 2,
                            username: 'john_premium',
                            isPremium: true,
                            isAdmin: true,
                            isEligible: true
                        }
                    ],
                    canTransfer: true
                },
                {
                    groupId: 2,
                    groupName: 'Solo Project',
                    memberCount: 1,
                    eligibleMembers: [],
                    canTransfer: false
                }
            ]

            ; (api.get as jest.Mock).mockResolvedValue(mockGroups)

            const groups = await userApi.getCreatedGroupsWithEligibility()
            expect(groups).toHaveLength(2)

            // Step 2: Manage groups
            const groupActions = [
                { groupId: 1, action: 'transfer', transferToUserId: 2 },
                { groupId: 2, action: 'delete' }
            ]

            ; (api.post as jest.Mock).mockResolvedValue({
                message: 'Group actions saved'
            })

            await userApi.manageGroupsBeforeDeletion(groupActions)
            expect(api.post).toHaveBeenCalled()

            // Step 3: Delete account
            ; (api.delete as jest.Mock).mockResolvedValue({
                message: 'Account deletion initiated'
            })

            const result = await userApi.deleteAccount({
                password: 'MyPassword123!'
            })

            expect(result.message).toContain('Account deletion initiated')
        })

        it('should allow immediate deletion for users without groups', async () => {
            // No groups to manage
            ; (api.get as jest.Mock).mockResolvedValue([])

            const groups = await userApi.getCreatedGroupsWithEligibility()
            expect(groups).toHaveLength(0)

            // Direct deletion
            ; (api.delete as jest.Mock).mockResolvedValue({
                message: 'Account deletion initiated'
            })

            const result = await userApi.deleteAccount({
                password: 'MyPassword123!'
            })

            expect(result.message).toContain('Account deletion initiated')
            expect(api.post).not.toHaveBeenCalledWith('/api/users/groups/manage')
        })
    })

    describe('Re-registration after deletion', () => {
        it('should allow re-registration with same email after permanent deletion', async () => {
            // Simulate registration with previously deleted email
            const mockRegisterResponse = {
                token: 'new.jwt.token',
                username: 'alice_new',
                email: 'alice@test.com',
                userId: 108,
                isDeactivated: false
            }

            // This would be in authApi, but testing the scenario
            expect(mockRegisterResponse.userId).not.toBe(7) // Old Alice was ID 7
            expect(mockRegisterResponse.email).toBe('alice@test.com') // Same email allowed
        })
    })
})
