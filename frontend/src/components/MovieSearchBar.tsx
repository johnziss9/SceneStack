"use client";

import { useState, useEffect, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { movieApi } from '@/lib';
import type { TmdbMovie, TmdbSearchResponse, TmdbPerson } from '@/types';

interface MovieSearchBarProps {
    onResultsChange: (results: TmdbMovie[], totalResults?: number, totalPages?: number, query?: string) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    initialQuery?: string;
    onSearchTypeChange?: (type: 'movies' | 'people') => void;
    onPersonResultsChange?: (results: TmdbPerson[], totalResults?: number, totalPages?: number, query?: string) => void;
    showTypeToggle?: boolean;
}

export interface MovieSearchBarRef {
    focus: () => void;
}

export const MovieSearchBar = memo(forwardRef<MovieSearchBarRef, MovieSearchBarProps>(function MovieSearchBar({ onResultsChange, onLoadingChange, initialQuery = '', onSearchTypeChange, onPersonResultsChange, showTypeToggle = false }, ref) {
    const [query, setQuery] = useState(initialQuery);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchType, setSearchType] = useState<'movies' | 'people'>('movies');
    const inputRef = useRef<HTMLInputElement>(null);
    const isInitialMount = useRef(true);

    // Set initial query if provided
    useEffect(() => {
        if (initialQuery && isInitialMount.current) {
            setQuery(initialQuery);
            isInitialMount.current = false;
        }
    }, [initialQuery]);

    useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
        }
    }));

    // Debounced search effect
    useEffect(() => {
        // Don't search if query is empty
        if (!query.trim()) {
            onResultsChange([], 0, 0, '');
            onPersonResultsChange?.([], 0, 0, '');
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
                if (searchType === 'people') {
                    onSearchTypeChange?.('people');
                    const response = await movieApi.searchPeople(query);
                    onPersonResultsChange?.(response.results, response.total_results, response.total_pages, query);
                } else {
                    const response = await movieApi.searchMovies(query);
                    onResultsChange(response.results, response.total_results, response.total_pages, query);
                }
                setError(null);
            } catch (err) {
                console.error('Search error:', err);
                setError(searchType === 'people' ? 'Failed to search people. Please try again.' : 'Failed to search movies. Please try again.');
                if (searchType === 'people') {
                    onPersonResultsChange?.([], 0, 0, '');
                } else {
                    onResultsChange([], 0, 0, '');
                }
            } finally {
                setIsLoading(false);
                onLoadingChange?.(false);
            }
        }, 500);

        // Cleanup: cancel the timeout if query changes before 500ms
        return () => clearTimeout(timeoutId);
    }, [query, searchType, onResultsChange, onPersonResultsChange, onSearchTypeChange, onLoadingChange]);

    const handleClear = () => {
        setQuery('');
        setError(null);
        onResultsChange([], 0, 0, '');
    };

    const handleSearchTypeChange = (value: string) => {
        const type = value as 'movies' | 'people';
        setSearchType(type);
        onSearchTypeChange?.(type);
    };

    const placeholder = searchType === 'movies'
        ? 'Search for a movie...'
        : 'Search for a person (actor, director, writer)...';

    return (
        <div className="space-y-3">
            {showTypeToggle && (
                <Tabs value={searchType} onValueChange={handleSearchTypeChange} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="movies">Movies</TabsTrigger>
                        <TabsTrigger value="people">People</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
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
}));