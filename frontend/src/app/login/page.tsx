'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingTips } from '@/components/LoadingTips';
import Link from 'next/link';
import { toast } from '@/lib/toast';

export default function LoginPage() {
    const { login, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Refs for auto-scrolling to errors
    const emailRef = useRef<HTMLDivElement>(null);
    const passwordRef = useRef<HTMLDivElement>(null);

    // Form validation
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = (): boolean => {
        let isValid = true;
        let firstErrorRef: React.RefObject<HTMLDivElement> | null = null;

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
            await login({ email, password });
            toast.success('Logged in successfully!');
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Invalid email or password');
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
                            {/* Email field skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="branded" className="h-4 w-12" />
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
                                }}
                                placeholder="Enter your password"
                                disabled={isLoading}
                                className={passwordError ? 'border-destructive' : ''}
                            />
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