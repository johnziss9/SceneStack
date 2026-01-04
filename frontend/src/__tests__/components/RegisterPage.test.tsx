import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../../app/register/page';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('sonner');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('RegisterPage', () => {
    let mockRegister: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRegister = jest.fn();
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            login: jest.fn(),
            register: mockRegister,
            logout: jest.fn(),
        });
    });

    describe('Rendering', () => {
        it('should render registration form', () => {
            render(<RegisterPage />);

            expect(screen.getByText('SceneStack')).toBeInTheDocument();
            expect(screen.getByText('Create your account')).toBeInTheDocument();
            expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
        });

        it('should render link to login page', () => {
            render(<RegisterPage />);

            const loginLink = screen.getByRole('link', { name: /sign in/i });
            expect(loginLink).toBeInTheDocument();
            expect(loginLink).toHaveAttribute('href', '/login');
        });

        it('should show password requirements hint', () => {
            render(<RegisterPage />);

            expect(screen.getByText(/must be 8\+ characters with uppercase, lowercase, and digit/i)).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        it('should show error when submitting with empty username', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            expect(await screen.findByText('Username is required')).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('should show error for short username', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'ab');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('should show error for invalid email', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'notanemail');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('should show error for weak password (too short)', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Pass1');
            await user.type(confirmPasswordInput, 'Pass1');
            await user.click(submitButton);

            expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('should show error for password missing uppercase', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'password123');
            await user.type(confirmPasswordInput, 'password123');
            await user.click(submitButton);

            expect(await screen.findByText('Password must contain at least one uppercase letter')).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('should show error when passwords do not match', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password456');
            await user.click(submitButton);

            expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('should clear validation errors when user corrects input', async () => {
            const user = userEvent.setup();
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            // Submit with empty username to trigger error
            await user.click(submitButton);
            expect(await screen.findByText('Username is required')).toBeInTheDocument();

            // Start typing - error should clear
            await user.type(usernameInput, 'testuser');
            expect(screen.queryByText('Username is required')).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('should call register with correct data on submit', async () => {
            const user = userEvent.setup();
            mockRegister.mockResolvedValue(undefined);
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            expect(mockRegister).toHaveBeenCalledWith({
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password123',
            });
        });

        it('should show loading state while submitting', async () => {
            const user = userEvent.setup();
            mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            expect(screen.getByText('Creating account...')).toBeInTheDocument();
            expect(usernameInput).toBeDisabled();
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(confirmPasswordInput).toBeDisabled();
            expect(submitButton).toBeDisabled();
        });

        it('should show success toast on successful registration', async () => {
            const user = userEvent.setup();
            mockRegister.mockResolvedValue(undefined);
            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockToast.success).toHaveBeenCalledWith('Account created successfully!');
            });
        });

        it('should show error toast on failed registration', async () => {
            const user = userEvent.setup();
            mockRegister.mockRejectedValue(new Error('Email already exists'));

            // Suppress expected console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            render(<RegisterPage />);

            const usernameInput = screen.getByLabelText(/username/i);
            const emailInput = screen.getByLabelText(/^email/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
            const submitButton = screen.getByRole('button', { name: /create account/i });

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'existing@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockToast.error).toHaveBeenCalledWith('Failed to create account. Email may already be in use.');
            });

            consoleErrorSpy.mockRestore();
        });
    });
});