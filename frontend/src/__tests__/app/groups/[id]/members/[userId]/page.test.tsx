import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import MemberProfilePage from '@/app/groups/[id]/members/[userId]/page';
import { groupApi } from '@/lib/api';
import type { PaginatedMemberWatchesResponse, GroupFeedItem } from '@/types';
import React from 'react';

// Mock the API
jest.mock('@/lib/api', () => ({
    groupApi: {
        getMemberWatches: jest.fn(),
    },
}));

// Mock the toast
jest.mock('@/lib/toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = require('next/navigation');
mockRouter.useRouter = jest.fn(() => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

// Mock LoadingTips component
jest.mock('@/components/LoadingTips', () => ({
    LoadingTips: () => <div data-testid="loading-tips">Loading tips...</div>,
}));

// Mock utilities
jest.mock('@/lib/utils', () => ({
    formatWatchDate: (date: string) => new Date(date).toLocaleDateString(),
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

const mockGroupApi = groupApi as jest.Mocked<typeof groupApi>;

// Helper to wrap params in a resolved promise
const createParams = (id: string, userId: string) => Promise.resolve({ id, userId });

describe('MemberProfilePage', () => {
    const mockWatches: GroupFeedItem[] = [
        {
            id: 1,
            userId: 2,
            username: 'johndoe',
            isDeactivated: false,
            movieId: 1,
            tmdbId: 550,
            movieTitle: 'Fight Club',
            posterPath: '/fight-club.jpg',
            watchedDate: new Date('2024-01-15').toISOString(),
            rating: 9,
            notes: 'Amazing movie!',
            watchLocation: 'Home Theater',
            watchedWith: 'Friends',
            isRewatch: false,
        },
        {
            id: 2,
            userId: 2,
            username: 'johndoe',
            isDeactivated: false,
            movieId: 2,
            tmdbId: 551,
            movieTitle: 'The Matrix',
            posterPath: '/matrix.jpg',
            watchedDate: new Date('2024-01-10').toISOString(),
            rating: 10,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: true,
        },
    ];

    const mockProfileData: PaginatedMemberWatchesResponse = {
        groupId: 1,
        groupName: 'Movie Buffs',
        targetUserId: 2,
        targetUsername: 'johndoe',
        isTargetDeactivated: false,
        targetRole: 'Member',
        targetJoinedAt: new Date('2024-01-01').toISOString(),
        items: mockWatches,
        skip: 0,
        take: 20,
        hasMore: false,
        totalCount: 2,
        nextSkip: 2,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render loading state initially', async () => {
        mockGroupApi.getMemberWatches.mockImplementation(
            () => new Promise(() => { }) // Never resolves
        );

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        expect(screen.getByTestId('loading-tips')).toBeInTheDocument();
    });

    it('should render member profile with watches when data is loaded', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('johndoe')).toBeInTheDocument();
            expect(screen.getByText('Member')).toBeInTheDocument();
            expect(screen.getByText('Movie Buffs')).toBeInTheDocument();
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
            expect(screen.getByText('The Matrix')).toBeInTheDocument();
        });
    });

    it('should display member role badge', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Member')).toBeInTheDocument();
        });
    });

    it('should display inactive badge for deactivated users', async () => {
        const deactivatedProfile = {
            ...mockProfileData,
            isTargetDeactivated: true,
        };
        mockGroupApi.getMemberWatches.mockResolvedValue(deactivatedProfile);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });
    });

    it('should display watch ratings when present', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('9')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument();
        });
    });

    it('should display watch notes when present', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('"Amazing movie!"')).toBeInTheDocument();
        });
    });

    it('should display watch location and watched with when present', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Home Theater')).toBeInTheDocument();
            expect(screen.getByText('Friends')).toBeInTheDocument();
        });
    });

    it('should display rewatch badge when applicable', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            const rewatchBadges = screen.getAllByText('Rewatch');
            expect(rewatchBadges.length).toBeGreaterThan(0);
        });
    });

    it('should display total watch count', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText(/Watches in this group/i)).toBeInTheDocument();
            expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
        });
    });

    it('should show empty state when no watches are shared', async () => {
        const emptyProfile = {
            ...mockProfileData,
            items: [],
            totalCount: 0,
        };
        mockGroupApi.getMemberWatches.mockResolvedValue(emptyProfile);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('No watches shared')).toBeInTheDocument();
            expect(screen.getByText(/hasn't shared any watches with the group yet/i)).toBeInTheDocument();
        });
    });

    it('should show Load More button when hasMore is true', async () => {
        const profileWithMore = {
            ...mockProfileData,
            hasMore: true,
            totalCount: 25,
        };
        mockGroupApi.getMemberWatches.mockResolvedValue(profileWithMore);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText(/Load More \(23 remaining\)/)).toBeInTheDocument();
        });
    });

    it('should hide Load More button when hasMore is false', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.queryByText(/Load More/)).not.toBeInTheDocument();
        });
    });

    it('should load more watches when Load More is clicked', async () => {
        const firstPage = {
            ...mockProfileData,
            hasMore: true,
            totalCount: 3,
            nextSkip: 2,
        };

        const secondPageWatch: GroupFeedItem = {
            id: 3,
            userId: 2,
            username: 'johndoe',
            isDeactivated: false,
            movieId: 3,
            tmdbId: 552,
            movieTitle: 'Inception',
            posterPath: '/inception.jpg',
            watchedDate: new Date('2024-01-05').toISOString(),
            rating: 8,
            notes: null,
            watchLocation: null,
            watchedWith: null,
            isRewatch: false,
        };

        const secondPage = {
            ...firstPage,
            items: [secondPageWatch],
            skip: 2,
            hasMore: false,
            nextSkip: 3,
        };

        mockGroupApi.getMemberWatches
            .mockResolvedValueOnce(firstPage)
            .mockResolvedValueOnce(secondPage);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        });

        const loadMoreButton = screen.getByText(/Load More/);
        fireEvent.click(loadMoreButton);

        await waitFor(() => {
            expect(screen.getByText('Inception')).toBeInTheDocument();
        });
    });

    it('should display error state when API call fails', async () => {
        mockGroupApi.getMemberWatches.mockRejectedValue({
            response: { data: 'User is not a member of this group' },
        });

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Unable to load profile')).toBeInTheDocument();
            expect(screen.getByText('User is not a member of this group')).toBeInTheDocument();
        });
    });

    it('should navigate back to group when Back to Group button is clicked', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('johndoe')).toBeInTheDocument();
        });

        const backButtons = screen.getAllByText(/Back to Movie Buffs/i);
        fireEvent.click(backButtons[0]);

        expect(mockPush).toHaveBeenCalledWith('/groups/1');
    });

    it('should handle invalid group ID', async () => {
        await act(async () => {
            render(<MemberProfilePage params={createParams('invalid', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Unable to load profile')).toBeInTheDocument();
            expect(screen.getByText('Invalid group or user ID')).toBeInTheDocument();
        });
    });

    it('should handle invalid user ID', async () => {
        await act(async () => {
            render(<MemberProfilePage params={createParams('1', 'invalid')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Unable to load profile')).toBeInTheDocument();
            expect(screen.getByText('Invalid group or user ID')).toBeInTheDocument();
        });
    });

    it('should create correct movie detail links', async () => {
        mockGroupApi.getMemberWatches.mockResolvedValue(mockProfileData);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            const links = screen.getAllByRole('link');
            const movieLink = links.find(link =>
                link.getAttribute('href')?.includes('/movies/550')
            );
            expect(movieLink).toBeDefined();
            expect(movieLink?.getAttribute('href')).toContain('from=memberprofile');
            expect(movieLink?.getAttribute('href')).toContain('groupId=1');
            expect(movieLink?.getAttribute('href')).toContain('userId=2');
        });
    });

    it('should show Creator role badge correctly', async () => {
        const creatorProfile = {
            ...mockProfileData,
            targetRole: 'Creator',
        };
        mockGroupApi.getMemberWatches.mockResolvedValue(creatorProfile);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Creator')).toBeInTheDocument();
        });
    });

    it('should show Admin role badge correctly', async () => {
        const adminProfile = {
            ...mockProfileData,
            targetRole: 'Admin',
        };
        mockGroupApi.getMemberWatches.mockResolvedValue(adminProfile);

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });
    });

    it('should display loading state for Load More button', async () => {
        const profileWithMore = {
            ...mockProfileData,
            hasMore: true,
            totalCount: 25,
        };

        mockGroupApi.getMemberWatches
            .mockResolvedValueOnce(profileWithMore)
            .mockImplementation(() => new Promise(() => { })); // Never resolves

        await act(async () => {
            render(<MemberProfilePage params={createParams('1', '2')} />);
        });

        await waitFor(() => {
            expect(screen.getByText(/Load More/)).toBeInTheDocument();
        });

        const loadMoreButton = screen.getByText(/Load More/);
        fireEvent.click(loadMoreButton);

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });
});
