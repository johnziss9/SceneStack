import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authApi } from '@/lib/api';
import { tokenStorage } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/api-client');
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockUseRouter = useRouter as jest.Mock;

describe('AuthContext', () => {
    let mockPush: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPush = jest.fn();
        mockUseRouter.mockReturnValue({ push: mockPush });
    });

    describe('Initial State', () => {
        it('should set loading to false when no token exists', async () => {
            mockTokenStorage.getToken.mockReturnValue(null);

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBe(null);
        });

        it('should auto-login when valid token exists', async () => {
            const mockToken = createMockJWT({
                userId: 1,
                username: 'testuser',
                email: 'test@example.com',
            });

            mockTokenStorage.getToken.mockReturnValue(mockToken);

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toEqual({
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            });
        });

        it('should handle invalid token gracefully', async () => {
            mockTokenStorage.getToken.mockReturnValue('invalid.token.here');
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBe(null);
            expect(mockTokenStorage.removeToken).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Login', () => {
        it('should login successfully and set user state', async () => {
            mockTokenStorage.getToken.mockReturnValue(null);

            const mockToken = createMockJWT({
                userId: 1,
                username: 'testuser',
                email: 'test@example.com',
            });

            mockAuthApi.login.mockResolvedValue({
                token: mockToken,
                userId: 1,
                username: 'testuser',
                email: 'test@example.com',
            });

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.login({
                    email: 'test@example.com',
                    password: 'password123',
                });
            });

            expect(mockAuthApi.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(mockTokenStorage.setToken).toHaveBeenCalledWith(mockToken);

            expect(result.current.user).toEqual({
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
            });

            expect(mockPush).toHaveBeenCalledWith('/');
        });

        it('should throw error on failed login', async () => {
            mockTokenStorage.getToken.mockReturnValue(null);
            mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.login({
                        email: 'test@example.com',
                        password: 'wrongpassword',
                    });
                })
            ).rejects.toThrow('Invalid credentials');

            expect(result.current.user).toBe(null);
            expect(mockTokenStorage.setToken).not.toHaveBeenCalled();
        });
    });

    describe('Register', () => {
        it('should register successfully and set user state', async () => {
            mockTokenStorage.getToken.mockReturnValue(null);

            const mockToken = createMockJWT({
                userId: 2,
                username: 'newuser',
                email: 'new@example.com',
            });

            mockAuthApi.register.mockResolvedValue({
                token: mockToken,
                userId: 2,
                username: 'newuser',
                email: 'new@example.com',
            });

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.register({
                    username: 'newuser',
                    email: 'new@example.com',
                    password: 'password123',
                });
            });

            expect(mockAuthApi.register).toHaveBeenCalledWith({
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123',
            });

            expect(mockTokenStorage.setToken).toHaveBeenCalledWith(mockToken);

            expect(result.current.user).toEqual({
                id: 2,
                username: 'newuser',
                email: 'new@example.com',
            });

            expect(mockPush).toHaveBeenCalledWith('/');
        });

        it('should throw error on failed registration', async () => {
            mockTokenStorage.getToken.mockReturnValue(null);
            mockAuthApi.register.mockRejectedValue(new Error('Email already exists'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.register({
                        username: 'testuser',
                        email: 'existing@example.com',
                        password: 'password123',
                    });
                })
            ).rejects.toThrow('Email already exists');

            expect(result.current.user).toBe(null);
            expect(mockTokenStorage.setToken).not.toHaveBeenCalled();
        });
    });

    describe('Logout', () => {
        it('should logout and clear user state', async () => {
            const mockToken = createMockJWT({
                userId: 1,
                username: 'testuser',
                email: 'test@example.com',
            });

            mockTokenStorage.getToken.mockReturnValue(mockToken);
            mockAuthApi.logout.mockResolvedValue();

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.user).toEqual({
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                });
            });

            act(() => {
                result.current.logout();
            });

            expect(mockTokenStorage.removeToken).toHaveBeenCalled();
            expect(result.current.user).toBe(null);
            expect(mockPush).toHaveBeenCalledWith('/login');
        });

        it('should logout even if API call fails', async () => {
            const mockToken = createMockJWT({
                userId: 1,
                username: 'testuser',
                email: 'test@example.com',
            });

            mockTokenStorage.getToken.mockReturnValue(mockToken);
            mockAuthApi.logout.mockRejectedValue(new Error('API error'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: AuthProvider,
            });

            await waitFor(() => {
                expect(result.current.user).not.toBe(null);
            });

            act(() => {
                result.current.logout();
            });

            expect(mockTokenStorage.removeToken).toHaveBeenCalled();
            expect(result.current.user).toBe(null);
            expect(mockPush).toHaveBeenCalledWith('/login');
        });
    });

    describe('useAuth Hook', () => {
        it('should throw error when used outside AuthProvider', () => {
            // Suppress console.error for this test
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            expect(() => {
                renderHook(() => useAuth());
            }).toThrow('useAuth must be used within an AuthProvider');

            consoleErrorSpy.mockRestore();
        });
    });
});

// Helper function to create mock JWT tokens
function createMockJWT(payload: { userId: number; username: string; email: string }): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const claims = {
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': payload.userId.toString(),
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': payload.username,
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': payload.email,
    };
    const body = btoa(JSON.stringify(claims));
    const signature = 'mock-signature';

    return `${header}.${body}.${signature}`;
}