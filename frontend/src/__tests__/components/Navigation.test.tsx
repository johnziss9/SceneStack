import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from '../../components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Loading State', () => {
        it('should show loading skeleton when auth is loading', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: true,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            });

            render(<Navigation />);

            expect(screen.getByText('SceneStack')).toBeInTheDocument();
            // Loading skeleton should be visible
            const skeleton = document.querySelector('.animate-pulse');
            expect(skeleton).toBeInTheDocument();
        });
    });

    describe('Not Authenticated', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            });
        });

        it('should show sign in and sign up buttons when not authenticated', () => {
            render(<Navigation />);

            expect(screen.getAllByRole('button', { name: /sign in/i }).length).toBeGreaterThan(0);
            expect(screen.getAllByRole('button', { name: /sign up/i }).length).toBeGreaterThan(0);
        });

        it('should not show my watches or profile when not authenticated', () => {
            render(<Navigation />);

            expect(screen.queryByRole('button', { name: /my watches/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /testuser/i })).not.toBeInTheDocument();
        });

        it('should link sign in button to /login', () => {
            render(<Navigation />);

            const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
            const signInLink = signInButtons[0].closest('a');
            expect(signInLink).toHaveAttribute('href', '/login');
        });

        it('should link sign up button to /register', () => {
            render(<Navigation />);

            const signUpButtons = screen.getAllByRole('button', { name: /sign up/i });
            const signUpLink = signUpButtons[0].closest('a');
            expect(signUpLink).toHaveAttribute('href', '/register');
        });
    });

    describe('Authenticated', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                },
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            });
        });

        it('should show my watches and profile when authenticated', () => {
            render(<Navigation />);

            expect(screen.getAllByRole('button', { name: /my watches/i }).length).toBeGreaterThan(0);
            expect(screen.getAllByText('testuser').length).toBeGreaterThan(0);
        });

        it('should not show sign in and sign up when authenticated', () => {
            render(<Navigation />);

            expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument();
        });

        it('should link my watches to /watched', () => {
            render(<Navigation />);

            const myWatchesButtons = screen.getAllByRole('button', { name: /my watches/i });
            const myWatchesLink = myWatchesButtons[0].closest('a');
            expect(myWatchesLink).toHaveAttribute('href', '/watched');
        });

        it('should link profile button to /profile', () => {
            render(<Navigation />);

            const usernameElements = screen.getAllByText('testuser');
            const profileButton = usernameElements[0].closest('a');
            expect(profileButton).toHaveAttribute('href', '/profile');
        });

        it('should display username in profile button', () => {
            render(<Navigation />);

            expect(screen.getAllByText('testuser').length).toBeGreaterThan(0);
        });

        it('should show user icon in profile button', () => {
            render(<Navigation />);

            // Check for User icon (lucide-react renders as svg)
            const usernameElements = screen.getAllByText('testuser');
            const profileButton = usernameElements[0].closest('button');
            const svg = profileButton?.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    describe('Brand/Logo', () => {
        it('should always show SceneStack logo', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            });

            render(<Navigation />);

            expect(screen.getByText('SceneStack')).toBeInTheDocument();
        });

        it('should link logo to home page', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            });

            render(<Navigation />);

            const logoLink = screen.getByText('SceneStack').closest('a');
            expect(logoLink).toHaveAttribute('href', '/');
        });

        it('should show film icon in logo', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                loading: false,
                login: jest.fn(),
                register: jest.fn(),
                logout: jest.fn(),
            });

            render(<Navigation />);

            // Check for Film icon with primary color
            const logoLink = screen.getByText('SceneStack').closest('a');
            const svg = logoLink?.querySelector('svg');
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveClass('text-primary');
        });
    });
});