import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecommendationCard } from '../RecommendationCard';
import { movieApi, watchlistApi } from '@/lib/api';
import { RecommendedMovie } from '@/types';
import { PremiumRequiredError, ApiError } from '@/lib/api-client';

// Mock the API
jest.mock('@/lib/api', () => ({
    movieApi: {
        getMyStatus: jest.fn(),
    },
    watchlistApi: {
        addToWatchlist: jest.fn(),
        removeFromWatchlist: jest.fn(),
    },
}));

// Mock toast
jest.mock('@/lib/toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Get global mocks from jest.setup.js
declare global {
    var mockUseAuth: jest.Mock;
    var mockUseWishlist: jest.Mock;
}

const mockRecommendation: RecommendedMovie = {
    movie: {
        id: 550,
        title: 'Fight Club',
        poster_path: '/poster.jpg',
        release_date: '1999-10-15',
        overview: 'A ticking-time-bomb insomniac...',
        vote_average: 8.4,
        vote_count: 20000,
    },
    score: 0.85,
    reason: 'Matches your preferred genres and director',
    matchedGenres: ['Drama', 'Thriller'],
    matchedDirector: 'David Fincher',
    matchedCast: ['Brad Pitt', 'Edward Norton'],
};

const mockRecommendationNoData: RecommendedMovie = {
    movie: {
        id: 999,
        title: 'Unknown Movie',
        poster_path: null,
        release_date: undefined,
        overview: undefined,
        vote_average: 0,
        vote_count: 0,
    },
    score: 0.5,
    reason: '',
    matchedGenres: [],
};

describe('RecommendationCard', () => {
    const mockOnAddToWatched = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (movieApi.getMyStatus as jest.Mock).mockResolvedValue({
            onWatchlist: false,
            watchCount: 0,
            localMovieId: null,
        });
    });

    describe('when user is authenticated', () => {
        beforeEach(() => {
            global.mockUseAuth.mockReturnValue({
                user: { id: 1, username: 'testuser', email: 'test@example.com' },
                isLoading: false,
                login: jest.fn(),
                logout: jest.fn(),
                register: jest.fn(),
            });
        });

        it('renders movie information correctly', async () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.getByText('Fight Club')).toBeInTheDocument();
            expect(screen.getByText('1999')).toBeInTheDocument();
            expect(screen.getByText('8.4')).toBeInTheDocument();
            expect(screen.getByText('Matches your preferred genres and director')).toBeInTheDocument();
        });

        it('renders matched genres as badges', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.getByText('Drama')).toBeInTheDocument();
            expect(screen.getByText('Thriller')).toBeInTheDocument();
        });

        it('displays only first 2 matched genres', () => {
            const recommendationManyGenres: RecommendedMovie = {
                ...mockRecommendation,
                matchedGenres: ['Drama', 'Thriller', 'Action', 'Comedy', 'Romance'],
            };

            render(
                <RecommendationCard
                    recommendation={recommendationManyGenres}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.getByText('Drama')).toBeInTheDocument();
            expect(screen.getByText('Thriller')).toBeInTheDocument();
            expect(screen.queryByText('Action')).not.toBeInTheDocument();
        });

        it('displays poster image when available', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            const image = screen.getByAltText('Fight Club');
            expect(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w342/poster.jpg');
        });

        it('displays "No poster" when poster is not available', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendationNoData}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.getByText('No poster')).toBeInTheDocument();
        });

        it('displays "N/A" for rating when vote_average is 0', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendationNoData}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.getByText('N/A')).toBeInTheDocument();
        });

        it('creates correct movie detail link with default referrer', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            const links = screen.getAllByRole('link');
            const movieLink = links.find(link => link.getAttribute('href')?.includes('/movies/550'));
            expect(movieLink).toHaveAttribute('href', '/movies/550?from=recommendations');
        });

        it('creates correct movie detail link with custom referrer', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                    referrer="similar"
                />
            );

            const links = screen.getAllByRole('link');
            const movieLink = links.find(link => link.getAttribute('href')?.includes('/movies/550'));
            expect(movieLink).toHaveAttribute('href', '/movies/550?from=similar');
        });

        it('calls onAddToWatched when "Add to Watched" button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            const addButton = screen.getByRole('button', { name: /add to watched/i });
            await user.click(addButton);

            expect(mockOnAddToWatched).toHaveBeenCalledWith({
                id: 550,
                title: 'Fight Club',
                poster_path: '/poster.jpg',
                release_date: '1999-10-15',
                overview: 'A ticking-time-bomb insomniac...',
                vote_average: 8.4,
                vote_count: 20000,
            });
        });

        it('fetches watchlist status on mount', async () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).toHaveBeenCalledWith(550);
            });
        });

        it('displays bookmark icon when not on watchlist', async () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).toHaveBeenCalled();
            });

            const bookmarkButton = screen.getByRole('button', { name: /save to wishlist/i });
            expect(bookmarkButton).toBeInTheDocument();
        });

        it('displays bookmark check icon when on watchlist', async () => {
            (movieApi.getMyStatus as jest.Mock).mockResolvedValue({
                onWatchlist: true,
                watchCount: 0,
                localMovieId: 123,
            });

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                const bookmarkButton = screen.getByRole('button', { name: /remove from wishlist/i });
                expect(bookmarkButton).toBeInTheDocument();
            });
        });

        it('adds movie to watchlist when bookmark is clicked', async () => {
            const mockToast = require('@/lib/toast').toast;
            (watchlistApi.addToWatchlist as jest.Mock).mockResolvedValue({ movieId: 123 });

            const user = userEvent.setup();

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).toHaveBeenCalled();
            });

            const bookmarkButton = screen.getByRole('button', { name: /save to wishlist/i });
            await user.click(bookmarkButton);

            await waitFor(() => {
                expect(watchlistApi.addToWatchlist).toHaveBeenCalledWith(550);
                expect(mockToast.success).toHaveBeenCalledWith('Saved to wishlist');
            });
        });

        it('removes movie from watchlist when bookmark is clicked and already on watchlist', async () => {
            const mockToast = require('@/lib/toast').toast;
            (movieApi.getMyStatus as jest.Mock).mockResolvedValue({
                onWatchlist: true,
                watchCount: 0,
                localMovieId: 123,
            });

            const user = userEvent.setup();

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument();
            });

            const bookmarkButton = screen.getByRole('button', { name: /remove from wishlist/i });
            await user.click(bookmarkButton);

            await waitFor(() => {
                expect(watchlistApi.removeFromWatchlist).toHaveBeenCalledWith(123);
                expect(mockToast.success).toHaveBeenCalledWith('Removed from wishlist');
            });
        });

        it('shows premium error when watchlist limit is reached', async () => {
            const mockToast = require('@/lib/toast').toast;
            (watchlistApi.addToWatchlist as jest.Mock).mockRejectedValue(
                new PremiumRequiredError('Watchlist limit reached')
            );

            const user = userEvent.setup();

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).toHaveBeenCalled();
            });

            const bookmarkButton = screen.getByRole('button', { name: /save to wishlist/i });
            await user.click(bookmarkButton);

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith(
                    'Wishlist limit reached. Upgrade to Premium for unlimited saves.'
                );
            });
        });

        it('handles 409 conflict error when adding to watchlist', async () => {
            (watchlistApi.addToWatchlist as jest.Mock).mockRejectedValue(
                new ApiError(409, 'Already on watchlist')
            );

            const user = userEvent.setup();

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).toHaveBeenCalled();
            });

            const bookmarkButton = screen.getByRole('button', { name: /save to wishlist/i });
            await user.click(bookmarkButton);

            // Should set onWatchlist to true without showing error toast
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument();
            });
        });

        it('disables bookmark button while saving', async () => {
            (watchlistApi.addToWatchlist as jest.Mock).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ movieId: 123 }), 100))
            );

            const user = userEvent.setup();

            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).toHaveBeenCalled();
            });

            const bookmarkButton = screen.getByRole('button', { name: /save to wishlist/i });
            await user.click(bookmarkButton);

            // Button should be disabled during save
            expect(bookmarkButton).toBeDisabled();

            await waitFor(() => {
                expect(bookmarkButton).not.toBeDisabled();
            });
        });

        it('does not show year when release_date is not available', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendationNoData}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.queryByText(/\d{4}/)).not.toBeInTheDocument();
        });

        it('does not show reason when empty', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendationNoData}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            const italicElements = screen.queryAllByText((content, element) => {
                return element?.classList.contains('italic') || false;
            });

            expect(italicElements.length).toBe(0);
        });

        it('does not show genre badges when matchedGenres is empty', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendationNoData}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.queryByText('Drama')).not.toBeInTheDocument();
            expect(screen.queryByText('Thriller')).not.toBeInTheDocument();
        });
    });

    describe('when user is not authenticated', () => {
        beforeEach(() => {
            global.mockUseAuth.mockReturnValue({
                user: null,
                isLoading: false,
                login: jest.fn(),
                logout: jest.fn(),
                register: jest.fn(),
            });
        });

        it('shows "Sign in to log watches" button instead of "Add to Watched"', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.getByRole('button', { name: /sign in to log watches/i })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /add to watched/i })).not.toBeInTheDocument();
        });

        it('does not show bookmark button', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            expect(screen.queryByRole('button', { name: /save to wishlist/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /remove from wishlist/i })).not.toBeInTheDocument();
        });

        it('does not fetch watchlist status', async () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            await waitFor(() => {
                expect(movieApi.getMyStatus).not.toHaveBeenCalled();
            });
        });

        it('links to login page when "Sign in" button is clicked', () => {
            render(
                <RecommendationCard
                    recommendation={mockRecommendation}
                    onAddToWatched={mockOnAddToWatched}
                />
            );

            const signInLink = screen.getByRole('link', { name: /sign in to log watches/i });
            expect(signInLink).toHaveAttribute('href', '/login');
        });
    });
});
