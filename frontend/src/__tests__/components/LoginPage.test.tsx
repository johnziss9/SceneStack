import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../app/login/page';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('sonner');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('LoginPage', () => {
    let mockLogin: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogin = jest.fn();
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            login: mockLogin,
            register: jest.fn(),
            logout: jest.fn(),
        });
    });

    describe('Rendering', () => {
        it('should render login form', () => {
            render(<LoginPage />);

            expect(screen.getByText('SceneStack')).toBeInTheDocument();
            expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        });

        it('should render link to register page', () => {
            render(<LoginPage />);

            const registerLink = screen.getByRole('link', { name: /create one/i });
            expect(registerLink).toBeInTheDocument();
            expect(registerLink).toHaveAttribute('href', '/register');
        });
    });

    describe('Form Validation', () => {
        it('should show error when submitting with empty email', async () => {
            const user = userEvent.setup();
            render(<LoginPage />);

            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Fill password but leave email empty
            await user.type(passwordInput, 'password123');
            await user.click(submitButton);

            expect(await screen.findByText('Email is required')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('should show error for invalid email format on submit', async () => {
            const user = userEvent.setup();
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            await user.type(emailInput, 'notanemail');
            await user.type(passwordInput, 'password123');
            await user.click(submitButton);

            expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('should show error when submitting with empty password', async () => {
            const user = userEvent.setup();
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Fill email but leave password empty
            await user.type(emailInput, 'test@example.com');
            await user.click(submitButton);

            expect(await screen.findByText('Password is required')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('should clear validation errors when user corrects input', async () => {
            const user = userEvent.setup();
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Submit with empty fields to trigger errors
            await user.click(submitButton);
            expect(await screen.findByText('Email is required')).toBeInTheDocument();

            // Start typing - error should clear
            await user.type(emailInput, 'test@example.com');
            expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
        });

        it('should enable submit button when form has values', async () => {
            const user = userEvent.setup();
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Initially disabled (or enabled if no client-side disable logic)
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'password123');

            expect(submitButton).toBeEnabled();
        });
    });

    describe('Form Submission', () => {
        it('should call login with correct credentials on submit', async () => {
            const user = userEvent.setup();
            mockLogin.mockResolvedValue(undefined);
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'password123');
            await user.click(submitButton);

            expect(mockLogin).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
        });

        it('should show loading state while submitting', async () => {
            const user = userEvent.setup();
            mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'password123');
            await user.click(submitButton);

            expect(screen.getByText('Signing in...')).toBeInTheDocument();
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(submitButton).toBeDisabled();
        });

        it('should show success toast on successful login', async () => {
            const user = userEvent.setup();
            mockLogin.mockResolvedValue(undefined);
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'password123');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockToast.success).toHaveBeenCalledWith('Logged in successfully!');
            });
        });

        it('should show error toast on failed login', async () => {
            const user = userEvent.setup();
            mockLogin.mockRejectedValue(new Error('Invalid credentials'));
            
            // Suppress expected console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'wrongpassword');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Invalid email or password');
            });
            
            consoleErrorSpy.mockRestore();
        });

        it('should not submit if form is invalid', async () => {
            const user = userEvent.setup();
            render(<LoginPage />);

            const emailInput = screen.getByLabelText(/email/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // Only fill email (password missing)
            await user.type(emailInput, 'test@example.com');
            
            // Click submit - should show validation error and not call login
            await user.click(submitButton);
            
            expect(await screen.findByText('Password is required')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });
    });
});