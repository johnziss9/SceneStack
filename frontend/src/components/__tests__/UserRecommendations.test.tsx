import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRecommendations } from '../UserRecommendations';
import { watchApi, movieApi, watchlistApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/toast');
jest.mock('@/contexts/AuthContext', () => ({
    useAuth: jest.fn(),
    AuthProvider: ({ children }: any) => children,
}));
jest.mock('@/contexts/WatchlistContext', () => ({
    useWishlist: jest.fn(() => ({
        count: 0,
        isLoading: false,
        incrementCount: jest.fn(),
        decrementCount: jest.fn(),
        refreshCount: jest.fn(),
    })),
    WatchlistProvider: ({ children }: any) => children,
}));

// Mock WatchForm component
jest.mock('../WatchForm', () => ({
    WatchForm: ({ open, onOpenChange, movie, onSuccess }: any) => (
        open ? (
            <div data-testid="watch-form">
                <p>Watch Form for {movie?.title}</p>
                <button onClick={() => onOpenChange(false)}>Close</button>
                <button onClick={() => { onSuccess(); onOpenChange(false); }}>Submit</button>
            </div>
        ) : null
    )
}));

// Mock Link component
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

const mockWatchApi = watchApi as jest.Mocked<typeof watchApi>;
const mockMovieApi = movieApi as jest.Mocked<typeof movieApi>;
const mockWatchlistApi = watchlistApi as jest.Mocked<typeof watchlistApi>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('UserRecommendations', () => {
    const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        isPremium: false,
    };

    const mockRecommendations = {
        items: [
            {
                movie: {
                    id: 1,
                    title: 'The Matrix',
                    poster_path: '/matrix.jpg',
                    backdrop_path: null,
                    release_date: '1999-03-31',
                    overview: 'A computer hacker learns about the true nature of reality.',
                    vote_average: 8.7,
                    vote_count: 20000,
                },
                score: 0.85,
                reason: 'Matches Action, Sci-Fi from your 8+ rated movies',
                matchedGenres: ['Action', 'Science Fiction'],
                matchedDirector: 'Lana Wachowski',
                matchedCast: ['Keanu Reeves'],
                matchedWriter: 'Lana Wachowski',
            },
            {
                movie: {
                    id: 2,
                    title: 'Inception',
                    poster_path: '/inception.jpg',
                    backdrop_path: null,
                    release_date: '2010-07-16',
                    overview: 'A thief who steals corporate secrets.',
                    vote_average: 8.8,
                    vote_count: 25000,
                },
                score: 0.78,
                reason: 'Popular in Action, Thriller',
                matchedGenres: ['Action', 'Thriller'],
                matchedDirector: undefined,
                matchedCast: [],
                matchedWriter: 'Christopher Nolan',
            },
        ],
        page: 1,
        pageSize: 20,
        hasMore: true,
        currentTier: 'Elite',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset to default authenticated user
        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            login: jest.fn(),
            logout: jest.fn(),
            register: jest.fn(),
            refreshUser: jest.fn(),
        });
        mockToast.error = jest.fn();
        mockToast.success = jest.fn();
    });

    describe('Loading State', () => {
        it('should display loading skeletons while fetching initial data', () => {
            // Mock delayed API response
            mockWatchApi.getRecommendations.mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            render(<UserRecommendations />);

            // Check for loading skeletons (loading state doesn't show header)
            const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('Error State', () => {
        it('should display error message and retry button when fetching fails', async () => {
            mockWatchApi.getRecommendations.mockRejectedValue(new Error('Network error'));

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load recommendations. Please try again.')).toBeInTheDocument();
            });

            expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
            expect(mockToast.error).toHaveBeenCalledWith('Failed to load recommendations', {
                description: 'Please try again later',
            });
        });

        it('should retry fetching when retry button is clicked', async () => {
            mockWatchApi.getRecommendations
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(mockRecommendations);

            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load recommendations. Please try again.')).toBeInTheDocument();
            });

            const retryButton = screen.getByRole('button', { name: /try again/i });
            await userEvent.click(retryButton);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });
        });
    });

    describe('Empty State', () => {
        it('should display empty state when user has no watches', async () => {
            mockWatchApi.getRecommendations.mockResolvedValue({
                ...mockRecommendations,
                items: [],
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('No recommendations yet')).toBeInTheDocument();
            });

            expect(screen.getByText(/Start watching and rating movies to get personalized recommendations/i)).toBeInTheDocument();
        });
    });

    describe('Successful Data Display', () => {
        beforeEach(() => {
            mockWatchApi.getRecommendations.mockResolvedValue(mockRecommendations);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });
        });

        it('should display header correctly', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('Recommended for You')).toBeInTheDocument();
            });

            expect(screen.getByText(/Based on your watch history/i)).toBeInTheDocument();
        });

        it('should not display tier badge', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            // Tier badge should not be displayed
            expect(screen.queryByText('Elite Picks')).not.toBeInTheDocument();
            expect(screen.queryByText('Strong Picks')).not.toBeInTheDocument();
        });

        it('should display all recommended movies with correct information', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
                expect(screen.getByText('Inception')).toBeInTheDocument();
            });

            // Check for recommendation reasons
            expect(screen.getByText('Matches Action, Sci-Fi from your 8+ rated movies')).toBeInTheDocument();
            expect(screen.getByText('Popular in Action, Thriller')).toBeInTheDocument();

            // Check for matched genres
            const actionBadges = screen.getAllByText('Action');
            expect(actionBadges.length).toBeGreaterThan(0);
        });

        it('should display movie ratings and years correctly', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('1999')).toBeInTheDocument();
                expect(screen.getByText('2010')).toBeInTheDocument();
                expect(screen.getByText('8.7')).toBeInTheDocument();
                expect(screen.getByText('8.8')).toBeInTheDocument();
            });
        });
    });

    describe('Pagination', () => {
        beforeEach(() => {
            mockWatchApi.getRecommendations.mockResolvedValue(mockRecommendations);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });
        });

        it('should display "Load More" button when hasMore is true', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const loadMoreButton = screen.getByRole('button', { name: /load more/i });
            expect(loadMoreButton).toBeInTheDocument();
            expect(loadMoreButton).not.toBeDisabled();
        });

        it('should not display "Load More" button when hasMore is false', async () => {
            mockWatchApi.getRecommendations.mockResolvedValue({
                ...mockRecommendations,
                hasMore: false,
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
        });

        it('should load more recommendations when "Load More" is clicked', async () => {
            const page2Recommendations = {
                items: [
                    {
                        movie: {
                            id: 3,
                            title: 'Interstellar',
                            poster_path: '/interstellar.jpg',
                            backdrop_path: null,
                            release_date: '2014-11-07',
                            overview: 'A team of explorers travel through a wormhole.',
                            vote_average: 8.6,
                            vote_count: 22000,
                        },
                        score: 0.72,
                        reason: 'Matches Sci-Fi from your history',
                        matchedGenres: ['Science Fiction'],
                        matchedDirector: undefined,
                        matchedCast: [],
                        matchedWriter: undefined,
                    },
                ],
                page: 2,
                pageSize: 20,
                hasMore: false,
                currentTier: 'Elite',
            };

            mockWatchApi.getRecommendations
                .mockResolvedValueOnce(mockRecommendations)
                .mockResolvedValueOnce(page2Recommendations);

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const loadMoreButton = screen.getByRole('button', { name: /load more/i });
            await userEvent.click(loadMoreButton);

            await waitFor(() => {
                expect(screen.getByText('Interstellar')).toBeInTheDocument();
            });

            // Both pages should be visible
            expect(screen.getByText('The Matrix')).toBeInTheDocument();
            expect(screen.getByText('Inception')).toBeInTheDocument();
            expect(screen.getByText('Interstellar')).toBeInTheDocument();

            // Load More should be hidden now
            expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
        });

        it('should disable "Load More" button while loading', async () => {
            mockWatchApi.getRecommendations
                .mockResolvedValueOnce(mockRecommendations)
                .mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const loadMoreButton = screen.getByRole('button', { name: /load more/i });
            await userEvent.click(loadMoreButton);

            await waitFor(() => {
                expect(loadMoreButton).toBeDisabled();
                expect(loadMoreButton).toHaveTextContent('Loading...');
            });
        });

        it('should show error toast when loading more fails', async () => {
            mockWatchApi.getRecommendations
                .mockResolvedValueOnce(mockRecommendations)
                .mockRejectedValueOnce(new Error('Network error'));

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const loadMoreButton = screen.getByRole('button', { name: /load more/i });
            await userEvent.click(loadMoreButton);

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Failed to load more recommendations');
            });

            // Original movies should still be visible
            expect(screen.getByText('The Matrix')).toBeInTheDocument();
            expect(screen.getByText('Inception')).toBeInTheDocument();
        });
    });

    describe('Watchlist Functionality', () => {
        beforeEach(() => {
            mockWatchApi.getRecommendations.mockResolvedValue(mockRecommendations);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });
        });

        it('should display watchlist button for authenticated users', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            // Should have watchlist buttons (aria-label)
            const watchlistButtons = screen.getAllByLabelText(/save to wishlist|remove from wishlist/i);
            expect(watchlistButtons.length).toBeGreaterThan(0);
        });

        it('should not display watchlist button for unauthenticated users', async () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                logout: jest.fn(),
                register: jest.fn(),
                refreshUser: jest.fn(),
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const watchlistButtons = screen.queryAllByLabelText(/save to wishlist|remove from wishlist/i);
            expect(watchlistButtons.length).toBe(0);
        });

        it('should add movie to wishlist when bookmark button is clicked', async () => {
            mockWatchlistApi.addToWatchlist.mockResolvedValue({ movieId: 100 });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const bookmarkButtons = screen.getAllByLabelText('Save to wishlist');
            await userEvent.click(bookmarkButtons[0]);

            await waitFor(() => {
                expect(mockWatchlistApi.addToWatchlist).toHaveBeenCalledWith(1);
                expect(mockToast.success).toHaveBeenCalledWith('Saved to wishlist');
            });
        });

        it('should remove movie from wishlist when bookmark button is clicked again', async () => {
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: true,
                localMovieId: 100,
                watched: false,
                watchCount: 0,
            });
            mockWatchlistApi.removeFromWatchlist.mockResolvedValue();

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            // Wait for the status to be fetched and button label to update
            await waitFor(() => {
                expect(screen.queryAllByLabelText('Remove from wishlist').length).toBeGreaterThan(0);
            });

            const bookmarkButtons = screen.getAllByLabelText('Remove from wishlist');
            await userEvent.click(bookmarkButtons[0]);

            await waitFor(() => {
                expect(mockWatchlistApi.removeFromWatchlist).toHaveBeenCalledWith(100);
                expect(mockToast.success).toHaveBeenCalledWith('Removed from wishlist');
            });
        });
    });

    describe('Add to Watched Functionality', () => {
        beforeEach(() => {
            mockWatchApi.getRecommendations.mockResolvedValue(mockRecommendations);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });
        });

        it('should display "Add to Watched" button for authenticated users', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const addButtons = screen.getAllByRole('button', { name: /add to watched/i });
            expect(addButtons.length).toBe(2); // One for each movie
        });

        it('should display "Sign in to log watches" for unauthenticated users', async () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                logout: jest.fn(),
                register: jest.fn(),
                refreshUser: jest.fn(),
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const signInButtons = screen.getAllByRole('button', { name: /sign in to log watches/i });
            expect(signInButtons.length).toBe(2);
        });

        it('should open watch form when "Add to Watched" is clicked', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const addButtons = screen.getAllByRole('button', { name: /add to watched/i });
            await userEvent.click(addButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('watch-form')).toBeInTheDocument();
                expect(screen.getByText('Watch Form for The Matrix')).toBeInTheDocument();
            });
        });

        it('should refresh recommendations after successfully adding to watched', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            // Clear previous calls
            mockWatchApi.getRecommendations.mockClear();

            const addButtons = screen.getAllByRole('button', { name: /add to watched/i });
            await userEvent.click(addButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('watch-form')).toBeInTheDocument();
            });

            // Mock the recommendations refresh
            mockWatchApi.getRecommendations.mockResolvedValue(mockRecommendations);

            const submitButton = screen.getByText('Submit');
            await userEvent.click(submitButton);

            await waitFor(() => {
                expect(mockWatchApi.getRecommendations).toHaveBeenCalledWith(1, 20);
                expect(mockToast.success).toHaveBeenCalledWith('Watch logged successfully!');
            });
        });
    });

    describe('Navigation', () => {
        beforeEach(() => {
            mockWatchApi.getRecommendations.mockResolvedValue(mockRecommendations);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });
        });

        it('should render movie links with correct URL parameters', async () => {
            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            const matrixLinks = screen.getAllByRole('link', { name: /the matrix/i });
            expect(matrixLinks[0]).toHaveAttribute('href', '/movies/1?from=watches');

            const inceptionLinks = screen.getAllByRole('link', { name: /inception/i });
            expect(inceptionLinks[0]).toHaveAttribute('href', '/movies/2?from=watches');
        });
    });

    describe('Edge Cases', () => {
        it('should handle movies without posters gracefully', async () => {
            const recsWithoutPoster = {
                ...mockRecommendations,
                items: [
                    {
                        ...mockRecommendations.items[0],
                        movie: {
                            ...mockRecommendations.items[0].movie,
                            poster_path: null,
                        },
                    },
                ],
            };

            mockWatchApi.getRecommendations.mockResolvedValue(recsWithoutPoster);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('No poster')).toBeInTheDocument();
            });
        });

        it('should handle movies without release dates', async () => {
            const recsWithoutDate = {
                ...mockRecommendations,
                items: [
                    {
                        ...mockRecommendations.items[0],
                        movie: {
                            ...mockRecommendations.items[0].movie,
                            release_date: null,
                        },
                    },
                ],
            };

            mockWatchApi.getRecommendations.mockResolvedValue(recsWithoutDate);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            // Year should not be displayed
            expect(screen.queryByText('1999')).not.toBeInTheDocument();
        });

        it('should handle empty matched genres', async () => {
            const recsWithoutGenres = {
                ...mockRecommendations,
                items: [
                    {
                        ...mockRecommendations.items[0],
                        matchedGenres: [],
                    },
                ],
            };

            mockWatchApi.getRecommendations.mockResolvedValue(recsWithoutGenres);
            mockMovieApi.getMyStatus.mockResolvedValue({
                onWatchlist: false,
                localMovieId: null,
                watchCount: 0,
            });

            render(<UserRecommendations />);

            await waitFor(() => {
                expect(screen.getByText('The Matrix')).toBeInTheDocument();
            });

            // Should still display the recommendation reason
            expect(screen.getByText('Matches Action, Sci-Fi from your 8+ rated movies')).toBeInTheDocument();
        });
    });
});
