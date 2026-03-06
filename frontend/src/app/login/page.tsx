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
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const { login, loading: authLoading } = useAuth();
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Refs for auto-scrolling to errors and focus management
    const emailOrUsernameRef = useRef<HTMLDivElement>(null);
    const passwordRef = useRef<HTMLDivElement>(null);
    const emailOrUsernameInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus email/username field when page loads
    useEffect(() => {
        if (emailOrUsernameInputRef.current) {
            emailOrUsernameInputRef.current.focus();
        }
    }, []);

    // Form validation
    const [emailOrUsernameError, setEmailOrUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = (): boolean => {
        let isValid = true;
        let firstErrorRef: React.RefObject<HTMLDivElement | null> | null = null;

        // Email or Username validation
        if (!emailOrUsername) {
            setEmailOrUsernameError('Email or username is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = emailOrUsernameRef;
        } else {
            setEmailOrUsernameError('');
        }

        // Password validation
        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
            if (!firstErrorRef) firstErrorRef = passwordRef;
        } else {
            setPasswordError('');
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
            await login({ emailOrUsername, password });
            toast.success('Logged in successfully!');
        } catch (error: any) {
            // ApiError has the message directly on the error object
            const errorMessage = error?.message || error?.response?.data?.message || 'Invalid email/username or password';
            toast.error(errorMessage);
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
                            {/* Email or Username field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-32" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                            </div>

                            {/* Password field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-20" />
                                <Skeleton variant="branded" className="h-10 w-full" />
                            </div>
                        </div>

                        {/* Submit button skeleton */}
                        <Skeleton variant="branded" className="h-10 w-full" />

                        {/* Register link skeleton */}
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
                        Sign in to your account
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
                    <div className="space-y-4">
                        {/* Email or Username Field */}
                        <div ref={emailOrUsernameRef} className="space-y-2">
                            <Label htmlFor="emailOrUsername">Email or Username</Label>
                            <Input
                                ref={emailOrUsernameInputRef}
                                id="emailOrUsername"
                                type="text"
                                value={emailOrUsername}
                                onChange={(e) => {
                                    setEmailOrUsername(e.target.value);
                                    if (emailOrUsernameError) setEmailOrUsernameError('');
                                }}
                                placeholder="Enter your email or username"
                                disabled={isLoading}
                                className={emailOrUsernameError ? 'border-destructive' : ''}
                            />
                            {emailOrUsernameError && (
                                <p className="text-sm text-destructive mt-1">{emailOrUsernameError}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div ref={passwordRef} className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (passwordError) setPasswordError('');
                                    }}
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                    className={passwordError ? 'border-destructive pr-10' : 'pr-10'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-sm text-destructive mt-1">{passwordError}</p>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>

                    {/* Register Link */}
                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link
                            href="/register"
                            className="text-primary hover:underline"
                        >
                            Create one
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}