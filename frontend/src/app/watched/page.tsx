'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WatchList } from '@/components/WatchList';
import { AiSearchBar } from '@/components/AiSearchBar';
import { AiSearchResults } from '@/components/AiSearchResults';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Users, Sparkles, Search, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { UpgradeToPremiumModal } from '@/components/UpgradeToPremiumModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AiSearchResponse } from '@/types/ai';

function WatchedListContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from URL params
  // Free users can see ai-search but in demo mode
  const [mode, setMode] = useState<'regular' | 'ai-search' | 'ai-search-demo'>(
    searchParams.get('mode') === 'ai-search'
      ? (user?.isPremium ? 'ai-search' : 'ai-search-demo')
      : 'regular'
  );
  const [searchResults, setSearchResults] = useState<AiSearchResponse | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isAiShowcaseCollapsed, setIsAiShowcaseCollapsed] = useState(false);

  // Update URL when mode changes
  const handleModeChange = (newMode: 'regular' | 'ai-search') => {
    // Free users get demo mode, premium users get full AI search
    const actualMode = newMode === 'ai-search' && !user?.isPremium
      ? 'ai-search-demo'
      : newMode;

    setMode(actualMode as 'regular' | 'ai-search' | 'ai-search-demo');

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">My Watches</h1>
            <p className="text-muted-foreground">
              Your personal movie watching history
            </p>
          </div>

          {/* Toggle between Regular and AI Search */}
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as 'regular' | 'ai-search')}>
            <TabsList>
              <TabsTrigger value="regular">Regular View</TabsTrigger>
              <TabsTrigger value="ai-search">
                <div className="flex items-center gap-1.5">
                  AI Search
                  {!user?.isPremium && (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Privacy Icon Legend */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <div className="flex items-center gap-1.5">
            <div className="bg-primary text-primary-foreground p-1 rounded-full">
              <Lock className="w-3 h-3" strokeWidth={2.5} />
            </div>
            <span>Private</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-primary text-primary-foreground p-1 rounded-full">
              <Users className="w-3 h-3" strokeWidth={2.5} />
            </div>
            <span>Shared with groups</span>
          </div>
        </div>

        {/* AI Features Showcase (Free users only) */}
        {!user?.isPremium && mode === 'regular' && (
          <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className={isAiShowcaseCollapsed ? "!pb-3 sm:!pb-4" : "pb-3"}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                    <CardTitle className="text-lg sm:text-xl">AI-Powered Features</CardTitle>
                    <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs">Premium</Badge>
                  </div>
                  <CardDescription className="text-sm mt-2">
                    Unlock powerful AI features to enhance your movie tracking experience
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Starting at £5/month</span>
                    <Button
                      onClick={() => setShowUpgradeModal(true)}
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Upgrade
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAiShowcaseCollapsed(!isAiShowcaseCollapsed)}
                    className="flex-shrink-0"
                  >
                    {isAiShowcaseCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {/* Mobile upgrade button - always visible */}
              <div className="flex sm:hidden flex-col gap-2 mt-3">
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  size="sm"
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
                <span className="text-xs text-muted-foreground text-center">Starting at £5/month</span>
              </div>
            </CardHeader>
            {!isAiShowcaseCollapsed && (
              <CardContent className="space-y-4 sm:space-y-6 pt-0">
              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* AI Search Feature */}
                <div className="p-3 sm:p-4 border rounded-lg bg-card/50">
                  <div className="flex items-start gap-2 sm:gap-3 mb-3">
                    <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 flex-shrink-0">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1">Natural Language Search</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                        Find movies using natural language queries instead of filters
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-2 sm:p-3 rounded border text-xs sm:text-sm space-y-1.5 sm:space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Example queries:</p>
                    <p className="italic text-xs sm:text-sm">"Find that thriller I watched last summer"</p>
                    <p className="italic text-xs sm:text-sm">"Show me highly rated comedies from 2023"</p>
                    <p className="italic text-xs sm:text-sm">"Movies I watched at home with friends"</p>
                  </div>
                </div>

                {/* AI Insights Feature */}
                <div className="p-3 sm:p-4 border rounded-lg bg-card/50">
                  <div className="flex items-start gap-2 sm:gap-3 mb-3">
                    <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 flex-shrink-0">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1">Personalized AI Insights</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                        Get AI-generated insights combining plot and your viewing history
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-2 sm:p-3 rounded border space-y-1.5 sm:space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Example insight:</p>
                    <p className="italic text-xs leading-relaxed">
                      "You watched this thriller at home and rated it 8.5/10.
                      The intricate plot twists and suspenseful atmosphere clearly resonated
                      with your taste, similar to your other highly-rated mystery films..."
                    </p>
                    <div className="pt-1 sm:pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3 flex-shrink-0" />
                      <span className="blur-[2px]">Full insight hidden - upgrade to read</span>
                    </div>
                  </div>
                </div>
              </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Regular mode: show normal watch list */}
        {mode === 'regular' && <WatchList />}

        {/* AI Search mode (premium users only) */}
        {mode === 'ai-search' && (
          <div>
            <AiSearchBar
              onResultsChange={handleResultsChange}
              isPremium={user?.isPremium ?? false}
            />
            <AiSearchResults results={searchResults} isLoading={false} />
          </div>
        )}

        {/* AI Search Demo mode (free users) */}
        {mode === 'ai-search-demo' && (
          <div className="space-y-6">
            {/* Demo Badge */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-primary">AI Search Preview</h2>
                <Badge variant="secondary" className="bg-primary text-primary-foreground">Demo Mode</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                This is a preview of AI Search. Upgrade to Premium to search your own watch history using natural language.
              </p>
            </div>

            {/* Demo Search Bar */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Try: 'Find that thriller I watched last summer'"
                  disabled
                  className="flex-1 px-4 py-3 rounded-lg border bg-muted/50 cursor-not-allowed text-muted-foreground"
                />
                <Button disabled className="px-6">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              <div className="absolute inset-0 cursor-not-allowed" onClick={() => setShowUpgradeModal(true)} />
            </div>

            {/* Example Queries */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Example Queries You Could Use:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Show me highly rated thrillers from 2023",
                  "Find movies I watched at the cinema with Sarah",
                  "What comedies did I rate above 8?",
                  "Movies I watched alone at home last month"
                ].map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setShowUpgradeModal(true)}
                    className="text-left p-3 border rounded-lg bg-card hover:bg-accent hover:border-primary/50 transition-all text-sm"
                  >
                    <Search className="h-3.5 w-3.5 inline mr-2 text-primary" />
                    "{query}"
                  </button>
                ))}
              </div>
            </div>

            {/* Fake Demo Results */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Example Search Results:</h3>
              <div className="relative">
                {/* Blur overlay */}
                <div className="absolute inset-0 backdrop-blur-sm bg-background/30 z-10 flex items-center justify-center">
                  <Card className="max-w-md">
                    <CardContent className="p-6 text-center space-y-4">
                      <Sparkles className="h-12 w-12 text-primary mx-auto" />
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Unlock AI Search</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Search your watch history using natural language queries.
                          Find exactly what you're looking for instantly.
                        </p>
                      </div>
                      <Button onClick={() => setShowUpgradeModal(true)} size="lg" className="w-full">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                      <p className="text-xs text-muted-foreground">Starting at £5/month</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Fake blurred results */}
                <div className="space-y-3 opacity-50 blur-[2px] pointer-events-none">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4 bg-card">
                      <div className="flex gap-4">
                        <div className="w-16 h-24 bg-muted rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                          <div className="h-4 bg-muted rounded w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeToPremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="search"
      />
    </main>
  );
}

export default function WatchedListPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-bold mb-8">My Watches</h1>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    }>
      <WatchedListContent />
    </Suspense>
  );
}