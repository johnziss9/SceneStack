'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { aiApi } from '@/lib/api';
import { PremiumRequiredError, RateLimitError } from '@/lib/api-client';
import type { AiInsightResponse } from '@/types';
import { UpgradeToPremiumModal } from './UpgradeToPremiumModal';
import { PremiumBadge } from './PremiumBadge';

interface MovieInsightProps {
    movieId: number;
    watchCount: number;
    isPremium: boolean;
}

export function MovieInsight({ movieId, watchCount, isPremium }: MovieInsightProps) {
    const [insight, setInsight] = useState<AiInsightResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState<'premium' | 'rate-limit' | 'general' | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // Don't render if user hasn't watched the movie
    if (watchCount === 0) {
        return null;
    }

    // Load cached insight on mount (if premium user)
    useEffect(() => {
        if (isPremium) {
            loadCachedInsight();
        }
    }, [movieId, isPremium]);

    const loadCachedInsight = async () => {
        try {
            const cached = await aiApi.getCachedInsight(movieId);
            setInsight(cached);
        } catch (err: unknown) {
            // 404 is expected if no cached insight exists - that's okay
            if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
                return;
            }
            // Other errors can be silently ignored (we'll show generate button)
            console.error('Error loading cached insight:', err);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await aiApi.generateInsight({ movieId });
            setInsight(result);

            if (result.cached) {
                toast.success('Insight loaded from cache');
            } else {
                toast.success('AI insight generated!', {
                    description: 'Your personalised insight is ready',
                });
            }
        } catch (err) {
            console.error('Error generating insight:', err);

            if (err instanceof PremiumRequiredError) {
                setError('premium');
            } else if (err instanceof RateLimitError) {
                setError('rate-limit');
                toast.error('Rate limit exceeded', {
                    description: 'Please try again in a few minutes',
                });
            } else {
                setError('general');
                toast.error('Failed to generate insight', {
                    description: 'Please try again later',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        setError(null);

        try {
            const result = await aiApi.regenerateInsight({ movieId });
            setInsight(result);
            toast.success('Insight regenerated!', {
                description: 'Your insight has been updated with the latest information',
            });
        } catch (err) {
            console.error('Error regenerating insight:', err);

            if (err instanceof PremiumRequiredError) {
                setError('premium');
            } else if (err instanceof RateLimitError) {
                setError('rate-limit');
                toast.error('Rate limit exceeded', {
                    description: 'Please try again in a few minutes',
                });
            } else {
                setError('general');
                toast.error('Failed to regenerate insight', {
                    description: 'Please try again later',
                });
            }
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Insight
                    <span className="ml-2">
                        <PremiumBadge />
                    </span>
                </CardTitle>
                <CardDescription>
                    Your personalised journey with this film
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Non-Premium User: Upgrade Prompt */}
                {!isPremium && (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground mb-4">
                            AI Insights are available with a premium subscription
                        </p>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => setIsUpgradeModalOpen(true)}
                        >
                            Upgrade to Premium
                        </Button>
                    </div>
                )}

                {/* Premium User: Loading State */}
                {isPremium && isLoading && !insight && (
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                )}

                {/* Premium User: Error States */}
                {isPremium && error && !insight && (
                    <div className="text-center py-6">
                        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        {error === 'rate-limit' && (
                            <div>
                                <p className="text-sm font-medium mb-2">Rate Limit Reached</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    You've reached your hourly limit for AI insights. Please try again in a few minutes.
                                </p>
                            </div>
                        )}
                        {error === 'general' && (
                            <div>
                                <p className="text-sm font-medium mb-2">Something went wrong</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Unable to generate insight. Please try again later.
                                </p>
                                <Button variant="outline" size="sm" onClick={handleGenerate}>
                                    Try Again
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Premium User: No Insight Yet - Show Generate Button */}
                {isPremium && !insight && !isLoading && !error && (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground mb-4">
                            Generate a personalised AI insight that combines the movie's plot with your viewing history
                        </p>
                        <Button onClick={handleGenerate} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate AI Insight
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Premium User: Insight Exists - Show Content */}
                {isPremium && insight && (
                    <div className="space-y-4">
                        <div className="prose prose-sm max-w-none">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{insight.content}</p>
                        </div>

                        {/* Insight Metadata */}
                        <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                                <span>
                                    Generated {new Date(insight.generatedAt).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                            >
                                {isRegenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Regenerate
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Upgrade Modal */}
            <UpgradeToPremiumModal
                open={isUpgradeModalOpen}
                onOpenChange={setIsUpgradeModalOpen}
                feature="insights"
            />
        </Card>
    );
}