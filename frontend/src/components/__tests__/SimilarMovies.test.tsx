import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimilarMovies } from '../SimilarMovies';
import { movieApi } from '@/lib/api';
import { RecommendedMovie } from '@/types';

// Mock the API
jest.mock('@/lib/api', () => ({
    movieApi: {
        getSimilarMovies: jest.fn(),
        getMyStatus: jest.fn(),
    },
    watchlistApi: {
        addToWatchlist: jest.fn(),
        removeFromWatchlist: jest.fn(),
    },
}));

// Get global mocks from jest.setup.js
declare global {
    var mockUseAuth: jest.Mock;
    var mockUseWishlist: jest.Mock;
}

// Mock WatchForm component
jest.mock('@/components/WatchForm', () => ({
    WatchForm: ({ movie, open, onSuccess }: any) => (
        open ? (
            <div data-testid="watch-form">
                <div>Watch Form for {movie?.title}</div>
                <button onClick={onSuccess}>Submit Watch</button>
            </div>
        ) : null
    ),
}));

// Don't mock RecommendationCard - test the full integration
// RecommendationCard is tested separately in RecommendationCard.test.tsx

const mockRecommendations: RecommendedMovie[] = [
    {
        movie: {
            id: 550,
            title: 'Fight Club',
            poster_path: '/poster1.jpg',
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
    },
    {
        movie: {
            id: 680,
            title: 'Pulp Fiction',
            poster_path: '/poster2.jpg',
            release_date: '1994-10-14',
            overview: 'A burger-loving hit man...',
            vote_average: 8.9,
            vote_count: 25000,
        },
        score: 0.75,
        reason: 'Matches your preferred genres',
        matchedGenres: ['Crime', 'Drama'],
        matchedCast: ['John Travolta', 'Samuel L. Jackson'],
    },
];

describe('SimilarMovies', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.mockUseAuth.mockReturnValue({
            user: { id: 1, username: 'testuser', email: 'test@example.com' },
            isLoading: false,
            login: jest.fn(),
            logout: jest.fn(),
            register: jest.fn(),
        });
        // Set default mock for getMyStatus
        (movieApi.getMyStatus as jest.Mock).mockResolvedValue({
            onWatchlist: false,
            watchCount: 0,
            localMovieId: null,
        });
    });

    it('renders loading state initially', () => {
        (movieApi.getSimilarMovies as jest.Mock).mockImplementation(() => new Promise(() => {}));

        render(<SimilarMovies tmdbId={550} />);

        expect(screen.getByText('More Like This')).toBeInTheDocument();
        // Loading skeletons should be present (data-slot="skeleton")
        const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('fetches and displays similar movies on mount', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue(mockRecommendations);

        render(<SimilarMovies tmdbId={550} />);

        // Wait for the component to finish loading and display movies
        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        }, { timeout: 3000 });

        expect(movieApi.getSimilarMovies).toHaveBeenCalledWith(550);
        expect(screen.getByText('Pulp Fiction')).toBeInTheDocument();
        expect(screen.getByText('Based on genres, directors, writers, and cast')).toBeInTheDocument();
    });

    it('shows error state when API fails', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (movieApi.getSimilarMovies as jest.Mock).mockRejectedValue(new Error('API Error'));

        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load similar movies')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
        consoleErrorSpy.mockRestore();
    });

    it('retries fetching when "Try Again" button is clicked', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (movieApi.getSimilarMovies as jest.Mock)
            .mockRejectedValueOnce(new Error('API Error'))
            .mockResolvedValueOnce(mockRecommendations);

        const user = userEvent.setup();
        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load similar movies')).toBeInTheDocument();
        });

        const retryButton = screen.getByRole('button', { name: /try again/i });
        await user.click(retryButton);

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        });

        expect(movieApi.getSimilarMovies).toHaveBeenCalledTimes(2);
        consoleErrorSpy.mockRestore();
    });

    it('shows empty state when no recommendations are available', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue([]);

        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('No similar movies found')).toBeInTheDocument();
        });
    });

    it('opens watch form when "Add to Watched" is clicked', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue(mockRecommendations);

        const user = userEvent.setup();
        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        });

        const addButtons = screen.getAllByRole('button', { name: /add to watched/i });
        await user.click(addButtons[0]);

        expect(screen.getByTestId('watch-form')).toBeInTheDocument();
        expect(screen.getByText('Watch Form for Fight Club')).toBeInTheDocument();
    });

    it('refreshes recommendations after adding to watched', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue(mockRecommendations);

        const user = userEvent.setup();
        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        });

        // Click add to watched
        const addButtons = screen.getAllByRole('button', { name: /add to watched/i });
        await user.click(addButtons[0]);

        // Submit the watch form
        const submitButton = screen.getByText('Submit Watch');
        await user.click(submitButton);

        // Should refresh recommendations
        await waitFor(() => {
            expect(movieApi.getSimilarMovies).toHaveBeenCalledTimes(2);
        });
    });

    it('re-fetches recommendations when tmdbId changes', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue(mockRecommendations);

        const { rerender } = render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(movieApi.getSimilarMovies).toHaveBeenCalledWith(550);
        });

        rerender(<SimilarMovies tmdbId={680} />);

        await waitFor(() => {
            expect(movieApi.getSimilarMovies).toHaveBeenCalledWith(680);
        });

        expect(movieApi.getSimilarMovies).toHaveBeenCalledTimes(2);
    });

    it('creates links with "similar" referrer', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue(mockRecommendations);

        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        });

        // Check that movie detail links have the correct referrer param
        const links = screen.getAllByRole('link');
        const fightClubLink = links.find(link =>
            link.getAttribute('href')?.includes('/movies/550')
        );
        expect(fightClubLink).toHaveAttribute('href', expect.stringContaining('from=similar'));
    });

    it('displays correct number of recommendations in grid', async () => {
        (movieApi.getSimilarMovies as jest.Mock).mockResolvedValue(mockRecommendations);

        render(<SimilarMovies tmdbId={550} />);

        await waitFor(() => {
            expect(screen.getByText('Fight Club')).toBeInTheDocument();
        });

        // Both movie titles should be visible
        expect(screen.getByText('Fight Club')).toBeInTheDocument();
        expect(screen.getByText('Pulp Fiction')).toBeInTheDocument();
    });
});
