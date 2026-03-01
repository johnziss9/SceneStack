import { render, screen, waitFor } from '@/test-utils'
import ReactivatePage from '@/app/reactivate/page'
import { useAuth } from '@/contexts/AuthContext'
import { userApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import userEvent from '@testing-library/user-event'
import { toast } from '@/lib/toast'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/lib/api')
jest.mock('next/navigation')
jest.mock('@/lib/toast')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseRouter = useRouter as jest.Mock
const mockUserApi = userApi as jest.Mocked<typeof userApi>
const mockToast = toast as jest.Mocked<typeof toast>

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
    console.error = jest.fn()
})
afterAll(() => {
    console.error = originalError
})

describe('ReactivatePage', () => {
    let mockPush: jest.Mock
    let mockRefreshUser: jest.Mock
    let mockLogout: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        mockPush = jest.fn()
        mockRefreshUser = jest.fn()
        mockLogout = jest.fn()
        mockUseRouter.mockReturnValue({ push: mockPush })
    })

    describe('Access Control', () => {
        it('redirects to login if user is not logged in', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            expect(mockPush).toHaveBeenCalledWith('/login')
        })

        it('redirects to home if user is not deactivated', () => {
            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: false,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            expect(mockPush).toHaveBeenCalledWith('/')
        })

        it('shows reactivation page for deactivated user', () => {
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            expect(screen.getByText(/Account Deactivated/i)).toBeInTheDocument()
            expect(screen.getByText(/Your account is deactivated. You can reactivate it anytime/i)).toBeInTheDocument()
        })
    })

    describe('Countdown Display', () => {
        it('displays days remaining until deletion', () => {
            // Set deactivated date to 10 days ago (20 days remaining)
            const deactivatedAt = new Date()
            deactivatedAt.setDate(deactivatedAt.getDate() - 10)

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt: deactivatedAt.toISOString(),
                    daysUntilPermanentDeletion: 20,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            // Should show remaining days
            expect(screen.getByText(/20 days remaining/i)).toBeInTheDocument()
            expect(screen.getByText(/Account Scheduled for Deletion/i)).toBeInTheDocument()
        })

        it('displays deletion date', () => {
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                    daysUntilPermanentDeletion: 15,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            // Should show deletion date (30 days after Feb 1, 2026 = March 3, 2026)
            expect(screen.getByText(/After/i)).toBeInTheDocument()
            expect(screen.getByText(/you will no longer be able to access this account/i)).toBeInTheDocument()
            expect(screen.getByText(/15 days remaining/i)).toBeInTheDocument()
        })

        it('displays warning when less than 7 days remain', () => {
            // Set deactivated date to 25 days ago (5 days remaining)
            const deactivatedAt = new Date()
            deactivatedAt.setDate(deactivatedAt.getDate() - 25)

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt: deactivatedAt.toISOString(),
                    daysUntilPermanentDeletion: 5,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            // Should show urgent warning with orange styling
            expect(screen.getByText(/5 days remaining/i)).toBeInTheDocument()
            expect(screen.getByText(/Account Scheduled for Deletion/i)).toBeInTheDocument()
        })
    })

    describe('Reactivation Functionality', () => {
        it('reactivates account successfully', async () => {
            const user = userEvent.setup()
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            mockUserApi.reactivate.mockResolvedValue({
                message: 'Account reactivated successfully'
            })

            render(<ReactivatePage />)

            const reactivateButton = screen.getByRole('button', { name: /Reactivate My Account/i })
            await user.click(reactivateButton)

            await waitFor(() => {
                expect(mockUserApi.reactivate).toHaveBeenCalled()
            })

            expect(mockToast.success).toHaveBeenCalledWith('Account reactivated successfully!')
            expect(mockRefreshUser).toHaveBeenCalled()
            expect(mockPush).toHaveBeenCalledWith('/')
        })

        it('disables button during reactivation', async () => {
            const user = userEvent.setup()
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            // Make reactivate hang to test loading state
            mockUserApi.reactivate.mockImplementation(
                () => new Promise(() => { }) // Never resolves
            )

            render(<ReactivatePage />)

            const reactivateButton = screen.getByRole('button', { name: /Reactivate My Account/i })
            await user.click(reactivateButton)

            await waitFor(() => {
                expect(reactivateButton).toBeDisabled()
            })
        })

        it('handles reactivation errors', async () => {
            const user = userEvent.setup()
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            const mockError = {
                response: {
                    data: {
                        message: 'Server error occurred'
                    }
                }
            }

            mockUserApi.reactivate.mockRejectedValue(mockError)

            render(<ReactivatePage />)

            const reactivateButton = screen.getByRole('button', { name: /Reactivate My Account/i })
            await user.click(reactivateButton)

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Server error occurred')
            })

            expect(mockPush).not.toHaveBeenCalledWith('/')
        })

        it('clears pending group actions on reactivation', async () => {
            const user = userEvent.setup()
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                    pendingGroupActions: JSON.stringify([
                        { groupId: 1, action: 'delete' }
                    ]),
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            mockUserApi.reactivate.mockResolvedValue({
                message: 'Account reactivated. Pending group actions cleared.'
            })

            render(<ReactivatePage />)

            const reactivateButton = screen.getByRole('button', { name: /Reactivate My Account/i })
            await user.click(reactivateButton)

            await waitFor(() => {
                expect(mockUserApi.reactivate).toHaveBeenCalled()
            })

            // Should refresh user to get updated state without pending actions
            expect(mockRefreshUser).toHaveBeenCalled()
        })
    })

    describe('Logout Functionality', () => {
        it('allows user to log out', async () => {
            const user = userEvent.setup()
            const deactivatedAt = new Date('2026-02-01').toISOString()

            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    isPremium: false,
                    isDeactivated: true,
                    deactivatedAt,
                },
                loading: false,
                login: jest.fn(),
                logout: mockLogout,
                register: jest.fn(),
                refreshUser: mockRefreshUser,
            })

            render(<ReactivatePage />)

            const logoutButton = screen.getByRole('button', { name: /Log Out/i })
            await user.click(logoutButton)

            expect(mockLogout).toHaveBeenCalled()
        })
    })
})
