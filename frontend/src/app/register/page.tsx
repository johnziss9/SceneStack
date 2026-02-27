'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingTips } from '@/components/LoadingTips';
import Link from 'next/link';
import { toast } from '@/lib/toast';

export default function RegisterPage() {
    const { register, loading: authLoading } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Refs for auto-scrolling to errors and focus management
    const usernameRef = useRef<HTMLDivElement>(null);
    const emailRef = useRef<HTMLDivElement>(null);
    const passwordRef = useRef<HTMLDivElement>(null);
    const confirmPasswordRef = useRef<HTMLDivElement>(null);
    const usernameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus username field when page loads
    useEffect(() => {
        if (usernameInputRef.current) {
            usernameInputRef.current.focus();
        }
    }, []);

    // Form validation errors
    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const validateForm = (): boolean => {
        let isValid = true;
        let firstErrorRef: React.RefObject<HTMLDivElement | null> | null = null;

        // Username validation
        if (!username) {
            setUsernameError('Username is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = usernameRef;
        } else if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = usernameRef;
        } else {
            setUsernameError('');
        }

        // Email validation
        if (!email) {
            setEmailError('Email is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = emailRef;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = emailRef;
        } else {
            setEmailError('');
        }

        // Password validation
        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = passwordRef;
        } else if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = passwordRef;
        } else if (!/[A-Z]/.test(password)) {
            setPasswordError('Password must contain at least one uppercase letter');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = passwordRef;
        } else if (!/[a-z]/.test(password)) {
            setPasswordError('Password must contain at least one lowercase letter');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = passwordRef;
        } else if (!/[0-9]/.test(password)) {
            setPasswordError('Password must contain at least one digit');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = passwordRef;
        } else {
            setPasswordError('');
        }

        // Confirm password validation
        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = confirmPasswordRef;
        } else if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = confirmPasswordRef;
        } else {
            setConfirmPasswordError('');
        }

        // Scroll to first error if validation failed
        if (!isValid && firstErrorRef?.current) {
            setTimeout(() => {
                firstErrorRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 100);
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            await register({ username, email, password });
            toast.success('Account created successfully!');
        } catch (error) {
            console.error('Registration error:', error);
            toast.error('Failed to create account. Email may already be in use.');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="w-full max-w-md space-y-8">
                    <LoadingTips />

                    {/* Header skeleton */}
                    <div className="text-center space-y-2">
                        <Skeleton variant="branded" className="h-10 w-48 mx-auto" />
                        <Skeleton variant="branded" className="h-5 w-40 mx-auto" />
                    </div>

                    {/* Form skeleton */}
                    <div className="mt-8 space-y-6">
                        <div className="space-y-4">
                            {/* Username field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-20" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                            </div>

                            {/* Email field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-12" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                            </div>

                            {/* Password field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-20" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                                <Skeleton variant="branded" className="h-3 w-full" />
                            </div>

                            {/* Confirm password field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-32" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                            </div>
                        </div>

                        {/* Submit button skeleton */}
                        <Skeleton variant="branded" className="h-10 w-full" />

                        {/* Login link skeleton */}
                        <Skeleton variant="branded" className="h-4 w-56 mx-auto" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold">SceneStack</h1>
                    <p className="mt-2 text-muted-foreground">
                        Create your account
                    </p>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
                    <div className="space-y-4">
                        {/* Username Field */}
                        <div ref={usernameRef}>
                            <Label htmlFor="username">Username</Label>
                            <Input
                                ref={usernameInputRef}
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (usernameError) setUsernameError('');
                                }}
                                onBlur={() => {
                                    if (username && username.length < 3) {
                                        setUsernameError('Username must be at least 3 characters');
                                    }
                                }}
                                placeholder="Choose a username"
                                disabled={isLoading}
                                className={usernameError ? 'border-destructive' : ''}
                            />
                            {usernameError && (
                                <p className="text-sm text-destructive mt-1">{usernameError}</p>
                            )}
                        </div>

                        {/* Email Field */}
                        <div ref={emailRef}>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError('');
                                }}
                                onBlur={() => {
                                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                                        setEmailError('Please enter a valid email');
                                    }
                                }}
                                placeholder="Enter your email address"
                                disabled={isLoading}
                                className={emailError ? 'border-destructive' : ''}
                            />
                            {emailError && (
                                <p className="text-sm text-destructive mt-1">{emailError}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div ref={passwordRef}>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError('');
                                    // Clear confirm password error if passwords now match
                                    if (confirmPassword && e.target.value === confirmPassword) {
                                        setConfirmPasswordError('');
                                    }
                                }}
                                placeholder="Create a strong password"
                                disabled={isLoading}
                                className={passwordError ? 'border-destructive' : ''}
                            />
                            {passwordError && (
                                <p className="text-sm text-destructive mt-1">{passwordError}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Must be 8+ characters with uppercase, lowercase, and digit
                            </p>
                        </div>

                        {/* Confirm Password Field */}
                        <div ref={confirmPasswordRef}>
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (confirmPasswordError) setConfirmPasswordError('');
                                }}
                                onBlur={() => {
                                    if (confirmPassword && password !== confirmPassword) {
                                        setConfirmPasswordError('Passwords do not match');
                                    }
                                }}
                                placeholder="Re-enter your password"
                                disabled={isLoading}
                                className={confirmPasswordError ? 'border-destructive' : ''}
                            />
                            {confirmPasswordError && (
                                <p className="text-sm text-destructive mt-1">{confirmPasswordError}</p>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating account...' : 'Create account'}
                    </Button>

                    {/* Login Link */}
                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="text-primary hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}