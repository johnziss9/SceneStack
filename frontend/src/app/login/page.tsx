'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Form validation
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = (): boolean => {
        let isValid = true;

        // Email validation
        if (!email) {
            setEmailError('Email is required');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email');
            isValid = false;
        } else {
            setEmailError('');
        }

        // Password validation
        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        } else {
            setPasswordError('');
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
                        <div>
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
                                placeholder="you@example.com"
                                disabled={isLoading}
                                className={emailError ? 'border-destructive' : ''}
                            />
                            {emailError && (
                                <p className="text-sm text-destructive mt-1">{emailError}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError('');
                                }}
                                placeholder="••••••••"
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