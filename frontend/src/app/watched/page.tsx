'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WatchList } from '@/components/WatchList';
import { AiSearchBar } from '@/components/AiSearchBar';
import { AiSearchResults } from '@/components/AiSearchResults';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AiSearchResponse } from '@/types/ai';

export default function WatchedListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from URL params
  const [mode, setMode] = useState<'regular' | 'ai-search'>(
    searchParams.get('mode') === 'ai-search' ? 'ai-search' : 'regular'
  );
  const [searchResults, setSearchResults] = useState<AiSearchResponse | null>(null);

  // Update URL when mode changes
  const handleModeChange = (newMode: 'regular' | 'ai-search') => {
    setMode(newMode);

    // Clear search results when switching modes
    setSearchResults(null);

    const params = new URLSearchParams(searchParams.toString());
    if (newMode === 'ai-search') {
      params.set('mode', 'ai-search');
    } else {
      params.delete('mode');
    }
    router.push(`/watched?${params.toString()}`, { scroll: false });
  };

  // Handle search results
  const handleResultsChange = (results: AiSearchResponse | null) => {
    setSearchResults(results);
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">My Watches</h1>
            <p className="text-muted-foreground">
              Your personal movie watching history
            </p>
          </div>

          {/* Toggle between Regular and AI Search (only for premium users) */}
          {user?.isPremium && (
            <Tabs value={mode} onValueChange={(v) => handleModeChange(v as 'regular' | 'ai-search')}>
              <TabsList>
                <TabsTrigger value="regular">Regular View</TabsTrigger>
                <TabsTrigger value="ai-search">AI Search</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Regular mode: show normal watch list */}
        {mode === 'regular' && <WatchList />}

        {/* AI Search mode: show search bar and results */}
        {mode === 'ai-search' && (
          <div>
            <AiSearchBar
              onResultsChange={handleResultsChange}
              isPremium={user?.isPremium ?? false}
            />
            <AiSearchResults results={searchResults} isLoading={false} />
          </div>
        )}
      </div>
    </main>
  );
}