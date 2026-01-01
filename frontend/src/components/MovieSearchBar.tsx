"use client";

import { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { movieApi } from '@/lib';
import type { TmdbMovie } from '@/types';

interface MovieSearchBarProps {
    onResultsChange: (results: TmdbMovie[]) => void;
    onLoadingChange?: (isLoading: boolean) => void;
}

export function MovieSearchBar({ onResultsChange, onLoadingChange }: MovieSearchBarProps) {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced search effect
    useEffect(() => {
        // Don't search if query is empty
        if (!query.trim()) {
            onResultsChange([]);
            onLoadingChange?.(false);
            return;
        }

        // Set loading state immediately
        setIsLoading(true);
        setError(null);
        onLoadingChange?.(true);

        // Debounce: wait 500ms after user stops typing
        const timeoutId = setTimeout(async () => {
            try {
                const response = await movieApi.searchMovies(query);
                onResultsChange(response.results);
                setError(null);
            } catch (err) {
                console.error('Search error:', err);
                setError('Failed to search movies. Please try again.');
                onResultsChange([]);
            } finally {
                setIsLoading(false);
                onLoadingChange?.(false);
            }
        }, 500);

        // Cleanup: cancel the timeout if query changes before 500ms
        return () => clearTimeout(timeoutId);
    }, [query, onResultsChange]);

    const handleClear = () => {
        setQuery('');
        setError(null);
        onResultsChange([]);
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search for a movie..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-10"
                />
                {query && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                    </Button>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}

            {isLoading && query && (
                <p className="text-sm text-muted-foreground">Searching...</p>
            )}
        </div>
    );
}