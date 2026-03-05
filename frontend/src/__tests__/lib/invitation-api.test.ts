import { invitationApi } from '@/lib/api'
import { api } from '@/lib/api-client'
import type {
    Invitation,
    CreateInvitationRequest,
    RespondToInvitationRequest,
    PendingInvitationsCount,
    UserSearchResult,
} from '@/types'

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

describe('invitationApi', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createInvitation', () => {
        it('should create a new invitation', async () => {
            const request: CreateInvitationRequest = {
                groupId: 1,
                invitedUserId: 2,
            }

            const mockResponse: Invitation = {
                id: 1,
                groupId: 1,
                groupName: 'Movie Buffs',
                groupDescription: 'A group for movie enthusiasts',
                groupMemberCount: 5,
                invitedUserId: 2,
                invitedUsername: 'testuser',
                invitedUserEmail: 'test@example.com',
                invitedByUserId: 1,
                invitedByUsername: 'inviter',
                status: 0,
                createdAt: '2024-03-01T10:00:00Z',
                respondedAt: null,
                expiresAt: '2024-04-01T10:00:00Z',
            }

            ;(api.post as jest.Mock).mockResolvedValue(mockResponse)

            const result = await invitationApi.createInvitation(request)

            expect(api.post).toHaveBeenCalledWith('/api/invitations', request)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('getPendingInvitations', () => {
        it('should get pending invitations', async () => {
            const mockInvitations: Invitation[] = [
                {
                    id: 1,
                    groupId: 1,
                    groupName: 'Movie Buffs',
                    groupDescription: 'A group for movie enthusiasts',
                    groupMemberCount: 5,
                    invitedUserId: 2,
                    invitedUsername: 'testuser',
                    invitedUserEmail: 'test@example.com',
                    invitedByUserId: 1,
                    invitedByUsername: 'inviter',
                    status: 0,
                    createdAt: '2024-03-01T10:00:00Z',
                    respondedAt: null,
                    expiresAt: '2024-04-01T10:00:00Z',
                },
                {
                    id: 2,
                    groupId: 2,
                    groupName: 'Cinema Club',
                    groupDescription: null,
                    groupMemberCount: 3,
                    invitedUserId: 2,
                    invitedUsername: 'testuser',
                    invitedUserEmail: 'test@example.com',
                    invitedByUserId: 3,
                    invitedByUsername: 'another_inviter',
                    status: 0,
                    createdAt: '2024-03-02T10:00:00Z',
                    respondedAt: null,
                    expiresAt: '2024-04-02T10:00:00Z',
                },
            ]

            ;(api.get as jest.Mock).mockResolvedValue(mockInvitations)

            const result = await invitationApi.getPendingInvitations()

            expect(api.get).toHaveBeenCalledWith('/api/invitations/pending')
            expect(result).toEqual(mockInvitations)
        })

        it('should return empty array when no invitations', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            const result = await invitationApi.getPendingInvitations()

            expect(result).toEqual([])
        })
    })

    describe('getPendingCount', () => {
        it('should get pending invitations count', async () => {
            const mockCount: PendingInvitationsCount = {
                count: 3,
            }

            ;(api.get as jest.Mock).mockResolvedValue(mockCount)

            const result = await invitationApi.getPendingCount()

            expect(api.get).toHaveBeenCalledWith('/api/invitations/pending/count')
            expect(result).toEqual(mockCount)
        })

        it('should return zero count', async () => {
            const mockCount: PendingInvitationsCount = {
                count: 0,
            }

            ;(api.get as jest.Mock).mockResolvedValue(mockCount)

            const result = await invitationApi.getPendingCount()

            expect(result.count).toBe(0)
        })
    })

    describe('respondToInvitation', () => {
        it('should accept an invitation', async () => {
            const request: RespondToInvitationRequest = {
                accept: true,
            }

            const mockResponse: Invitation = {
                id: 1,
                groupId: 1,
                groupName: 'Movie Buffs',
                groupDescription: 'A group for movie enthusiasts',
                groupMemberCount: 5,
                invitedUserId: 2,
                invitedUsername: 'testuser',
                invitedUserEmail: 'test@example.com',
                invitedByUserId: 1,
                invitedByUsername: 'inviter',
                status: 1, // Accepted
                createdAt: '2024-03-01T10:00:00Z',
                respondedAt: '2024-03-05T10:00:00Z',
                expiresAt: '2024-04-01T10:00:00Z',
            }

            ;(api.put as jest.Mock).mockResolvedValue(mockResponse)

            const result = await invitationApi.respondToInvitation(1, request)

            expect(api.put).toHaveBeenCalledWith('/api/invitations/1/respond', request)
            expect(result).toEqual(mockResponse)
            expect(result.status).toBe(1) // Accepted
        })

        it('should decline an invitation', async () => {
            const request: RespondToInvitationRequest = {
                accept: false,
            }

            const mockResponse: Invitation = {
                id: 1,
                groupId: 1,
                groupName: 'Movie Buffs',
                groupDescription: 'A group for movie enthusiasts',
                groupMemberCount: 5,
                invitedUserId: 2,
                invitedUsername: 'testuser',
                invitedUserEmail: 'test@example.com',
                invitedByUserId: 1,
                invitedByUsername: 'inviter',
                status: 2, // Declined
                createdAt: '2024-03-01T10:00:00Z',
                respondedAt: '2024-03-05T10:00:00Z',
                expiresAt: '2024-04-01T10:00:00Z',
            }

            ;(api.put as jest.Mock).mockResolvedValue(mockResponse)

            const result = await invitationApi.respondToInvitation(1, request)

            expect(api.put).toHaveBeenCalledWith('/api/invitations/1/respond', request)
            expect(result).toEqual(mockResponse)
            expect(result.status).toBe(2) // Declined
        })
    })

    describe('cancelInvitation', () => {
        it('should cancel an invitation', async () => {
            ;(api.delete as jest.Mock).mockResolvedValue(undefined)

            await invitationApi.cancelInvitation(1)

            expect(api.delete).toHaveBeenCalledWith('/api/invitations/1')
        })

        it('should handle multiple cancellation calls', async () => {
            ;(api.delete as jest.Mock).mockResolvedValue(undefined)

            await invitationApi.cancelInvitation(1)
            await invitationApi.cancelInvitation(2)
            await invitationApi.cancelInvitation(3)

            expect(api.delete).toHaveBeenCalledTimes(3)
            expect(api.delete).toHaveBeenNthCalledWith(1, '/api/invitations/1')
            expect(api.delete).toHaveBeenNthCalledWith(2, '/api/invitations/2')
            expect(api.delete).toHaveBeenNthCalledWith(3, '/api/invitations/3')
        })
    })

    describe('getSentInvitations', () => {
        it('should get sent invitations for a group', async () => {
            const mockInvitations: Invitation[] = [
                {
                    id: 1,
                    groupId: 1,
                    groupName: 'Movie Buffs',
                    groupDescription: 'A group for movie enthusiasts',
                    groupMemberCount: 5,
                    invitedUserId: 2,
                    invitedUsername: 'john',
                    invitedUserEmail: 'john@example.com',
                    invitedByUserId: 1,
                    invitedByUsername: 'testuser',
                    status: 0,
                    createdAt: '2024-03-01T10:00:00Z',
                    respondedAt: null,
                    expiresAt: '2024-04-01T10:00:00Z',
                },
                {
                    id: 2,
                    groupId: 1,
                    groupName: 'Movie Buffs',
                    groupDescription: 'A group for movie enthusiasts',
                    groupMemberCount: 5,
                    invitedUserId: 3,
                    invitedUsername: 'jane',
                    invitedUserEmail: 'jane@example.com',
                    invitedByUserId: 1,
                    invitedByUsername: 'testuser',
                    status: 0,
                    createdAt: '2024-03-02T10:00:00Z',
                    respondedAt: null,
                    expiresAt: '2024-04-02T10:00:00Z',
                },
            ]

            ;(api.get as jest.Mock).mockResolvedValue(mockInvitations)

            const result = await invitationApi.getSentInvitations(1)

            expect(api.get).toHaveBeenCalledWith('/api/invitations/group/1/sent')
            expect(result).toEqual(mockInvitations)
            expect(result).toHaveLength(2)
        })

        it('should return empty array when no sent invitations', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            const result = await invitationApi.getSentInvitations(1)

            expect(result).toEqual([])
        })

        it('should handle different group IDs', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            await invitationApi.getSentInvitations(1)
            await invitationApi.getSentInvitations(2)
            await invitationApi.getSentInvitations(999)

            expect(api.get).toHaveBeenCalledTimes(3)
            expect(api.get).toHaveBeenNthCalledWith(1, '/api/invitations/group/1/sent')
            expect(api.get).toHaveBeenNthCalledWith(2, '/api/invitations/group/2/sent')
            expect(api.get).toHaveBeenNthCalledWith(3, '/api/invitations/group/999/sent')
        })
    })

    describe('searchUsers', () => {
        it('should search users with query only', async () => {
            const mockResults: UserSearchResult[] = [
                {
                    id: 2,
                    username: 'john',
                    email: 'john@example.com',
                    isPremium: true,
                    isDeactivated: false,
                    canJoinMoreGroups: true,
                },
                {
                    id: 3,
                    username: 'johnny',
                    email: 'johnny@example.com',
                    isPremium: false,
                    isDeactivated: false,
                    canJoinMoreGroups: true,
                },
            ]

            ;(api.get as jest.Mock).mockResolvedValue(mockResults)

            const result = await invitationApi.searchUsers('john')

            expect(api.get).toHaveBeenCalledWith('/api/invitations/search?query=john')
            expect(result).toEqual(mockResults)
        })

        it('should search users with query and excludeGroupId', async () => {
            const mockResults: UserSearchResult[] = [
                {
                    id: 3,
                    username: 'johnny',
                    email: 'johnny@example.com',
                    isPremium: false,
                    isDeactivated: false,
                    canJoinMoreGroups: true,
                },
            ]

            ;(api.get as jest.Mock).mockResolvedValue(mockResults)

            const result = await invitationApi.searchUsers('john', 1)

            expect(api.get).toHaveBeenCalledWith('/api/invitations/search?query=john&excludeGroupId=1')
            expect(result).toEqual(mockResults)
        })

        it('should URL encode special characters in query', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            await invitationApi.searchUsers('user@example.com')

            expect(api.get).toHaveBeenCalledWith('/api/invitations/search?query=user%40example.com')
        })

        it('should handle spaces in query', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            await invitationApi.searchUsers('john doe')

            expect(api.get).toHaveBeenCalledWith('/api/invitations/search?query=john+doe')
        })

        it('should return empty array when no matches', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            const result = await invitationApi.searchUsers('nonexistent')

            expect(result).toEqual([])
        })

        it('should handle excludeGroupId = 0', async () => {
            ;(api.get as jest.Mock).mockResolvedValue([])

            await invitationApi.searchUsers('test', 0)

            // 0 is falsy, so excludeGroupId should not be added
            expect(api.get).toHaveBeenCalledWith('/api/invitations/search?query=test')
        })

        it('should include canJoinMoreGroups flag in results', async () => {
            const mockResults: UserSearchResult[] = [
                {
                    id: 2,
                    username: 'freeuser',
                    email: 'free@example.com',
                    isPremium: false,
                    isDeactivated: false,
                    canJoinMoreGroups: false, // At limit
                },
                {
                    id: 3,
                    username: 'premiumuser',
                    email: 'premium@example.com',
                    isPremium: true,
                    isDeactivated: false,
                    canJoinMoreGroups: true,
                },
            ]

            ;(api.get as jest.Mock).mockResolvedValue(mockResults)

            const result = await invitationApi.searchUsers('user')

            expect(result[0].canJoinMoreGroups).toBe(false)
            expect(result[1].canJoinMoreGroups).toBe(true)
        })

        it('should not include deactivated users in results', async () => {
            const mockResults: UserSearchResult[] = [
                {
                    id: 2,
                    username: 'activeuser',
                    email: 'active@example.com',
                    isPremium: false,
                    isDeactivated: false,
                    canJoinMoreGroups: true,
                },
            ]

            ;(api.get as jest.Mock).mockResolvedValue(mockResults)

            const result = await invitationApi.searchUsers('user')

            expect(result.every(u => !u.isDeactivated)).toBe(true)
        })
    })

    describe('error handling', () => {
        it('should propagate errors from createInvitation', async () => {
            const error = new Error('User already has a pending invitation')
            ;(api.post as jest.Mock).mockRejectedValue(error)

            await expect(
                invitationApi.createInvitation({ groupId: 1, invitedUserId: 2 })
            ).rejects.toThrow('User already has a pending invitation')
        })

        it('should propagate errors from respondToInvitation', async () => {
            const error = new Error('This invitation has expired')
            ;(api.put as jest.Mock).mockRejectedValue(error)

            await expect(
                invitationApi.respondToInvitation(1, { accept: true })
            ).rejects.toThrow('This invitation has expired')
        })

        it('should propagate errors from cancelInvitation', async () => {
            const error = new Error('Invitation not found')
            ;(api.delete as jest.Mock).mockRejectedValue(error)

            await expect(invitationApi.cancelInvitation(1)).rejects.toThrow('Invitation not found')
        })

        it('should propagate errors from getSentInvitations', async () => {
            const error = new Error('Unauthorized')
            ;(api.get as jest.Mock).mockRejectedValue(error)

            await expect(invitationApi.getSentInvitations(1)).rejects.toThrow('Unauthorized')
        })

        it('should propagate errors from searchUsers', async () => {
            const error = new Error('Internal server error')
            ;(api.get as jest.Mock).mockRejectedValue(error)

            await expect(invitationApi.searchUsers('test')).rejects.toThrow('Internal server error')
        })
    })
})
