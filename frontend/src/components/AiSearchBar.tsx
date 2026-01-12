'use client';

import { useState, memo } from 'react';
import { Search, X, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { aiApi } from '@/lib/api';
import { PremiumRequiredError, RateLimitError } from '@/lib/api-client';
import type { AiSearchResponse } from '@/types';
import { UpgradeToPremiumModal } from './UpgradeToPremiumModal';
import { PremiumBadge } from './PremiumBadge';

interface AiSearchBarProps {
    onResultsChange: (results: AiSearchResponse | null) => void;
    isPremium: boolean;
}

export const AiSearchBar = memo(function AiSearchBar({
    onResultsChange,
    isPremium
}: AiSearchBarProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const handleSearch = async () => {
        // Don't search if query is empty
        if (!query.trim()) {
            onResultsChange(null);
            setError(null);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const results = await aiApi.search({ query: query.trim() });
            onResultsChange(results);
            setError(null);
        } catch (err) {
            console.error('AI search error:', err);

            if (err instanceof RateLimitError) {
                setError('Rate limit exceeded. Please try again in a few minutes.');
            } else if (err instanceof PremiumRequiredError) {
                setError('Premium subscription required for AI search.');
            } else {
                setError('Search failed. Please try again.');
            }

            onResultsChange(null);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleClear = () => {
        setQuery('');
        setError(null);
        onResultsChange(null);
    };

    // If not premium, show upgrade prompt
    if (!isPremium) {
        return (
            <div className="mb-6">
                <div className="bg-muted/50 rounded-lg p-6 text-center">
                    <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">AI Search</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Use natural language to search your watches: "thriller I watched last summer with John"
                    </p>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsUpgradeModalOpen(true)}
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to Premium
                    </Button>
                </div>

                <UpgradeToPremiumModal
                    open={isUpgradeModalOpen}
                    onOpenChange={setIsUpgradeModalOpen}
                    feature="search"
                />
            </div>
        );
    }

    // Premium user: show search input
    return (
        <div className="mb-6">
            <Label htmlFor="ai-search" className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-primary" />
                AI Search
                <PremiumBadge />
            </Label>

            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="ai-search"
                        type="text"
                        placeholder='Try: "thriller I watched last summer" or "movies rated 9+ at home"'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pl-10 pr-20"
                        disabled={isSearching}
                    />

                    {/* Right side buttons */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                        {query && !isSearching && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                className="h-7 w-7 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}

                        <Button
                            onClick={handleSearch}
                            disabled={!query.trim() || isSearching}
                            size="sm"
                            className="h-7 px-3"
                        >
                            {isSearching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </div>
        </div>
    );
});