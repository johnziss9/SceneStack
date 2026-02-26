"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, TrendingUp, Eye, Users, ArrowRight, Sparkles, Crown, Zap, Loader2 } from 'lucide-react';
import { MovieSearchBar } from "@/components/MovieSearchBar";
import { MovieCard } from "@/components/MovieCard";
import { WatchCard } from "@/components/WatchCard";
import { WatchForm } from "@/components/WatchForm";
import { UpgradeToPremiumModal } from "@/components/UpgradeToPremiumModal";
import { useAuth } from "@/contexts/AuthContext";
import { watchApi, movieApi } from "@/lib";
import type { TmdbMovie, GroupedWatch } from '@/types';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<TmdbMovie[]>([]);
  const [totalSearchResults, setTotalSearchResults] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Logged-in user data
  const [recentWatches, setRecentWatches] = useState<GroupedWatch[]>([]);
  const [totalWatchCount, setTotalWatchCount] = useState(0);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Fetch recent watches and stats for logged-in users
  useEffect(() => {
    if (user) {
      fetchRecentWatches();
    }
  }, [user]);

  const fetchRecentWatches = async () => {
    try {
      setIsLoadingRecent(true);
      const data = await watchApi.getGroupedWatches({
        sortBy: 'recentlyWatched',
        page: 1,
        pageSize: 5,
      });
      setRecentWatches(data.items ?? []);
      setTotalWatchCount(data.totalCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch recent watches:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleAddToWatched = (movie: TmdbMovie) => {
    if (!user) {
      // Redirect to register for logged-out users
      router.push('/register');
      return;
    }
    setSelectedMovie(movie);
    setIsFormOpen(true);
  };

  const handleWatchSuccess = () => {
    // Refresh recent watches after adding a new one
    if (user) {
      fetchRecentWatches();
    }
  };

  const handleSearchChange = useCallback((results: TmdbMovie[], totalResults: number = 0, totalPages: number = 0, query: string = '') => {
    setSearchResults(results);
    setTotalSearchResults(totalResults);
    setTotalPages(totalPages);
    setCurrentPage(1);
    setCurrentQuery(query);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsSearching(loading);
  }, []);

  const handleLoadMore = async () => {
    if (!currentQuery || isLoadingMore || currentPage >= totalPages) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await movieApi.searchMovies(currentQuery, nextPage);

      // Filter out any duplicates
      const existingIds = new Set(searchResults.map(m => m.id));
      const uniqueResults = response.results.filter(movie => !existingIds.has(movie.id));

      // Append unique results
      if (uniqueResults.length > 0) {
        setSearchResults(prev => [...prev, ...uniqueResults]);
      }

      // Always increment page so we don't keep fetching the same page
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section for Logged-In Users */}
        {user && (
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">
              Welcome back, {user.username}!
            </h1>
            <p className="text-muted-foreground">Ready to log another movie?</p>
          </div>
        )}

        {/* Premium Features Banner for Free Users */}
        {user && !user.isPremium && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm sm:text-base">Unlock Premium Features</h3>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      Starting at £5/month
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Get AI-powered search, personalized insights, unlimited groups, and more.
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3 pt-0.5">
                    <div className="flex items-center gap-1 text-xs">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">AI Features</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Unlimited Groups</span>
                    </div>
                  </div>
                </div>
                <div className="w-full sm:w-auto">
                  <Button
                    onClick={() => setShowUpgradeModal(true)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Section for Logged-Out Users */}
        {!user && searchResults.length === 0 && (
          <div className="text-center py-12 space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
                Track Every Movie <br />
                <span className="text-primary">You Watch</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your personal movie journal. Log watches, share with friends, and discover insights about your viewing habits.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Feature Cards for Logged-Out Users */}
        {!user && searchResults.length === 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Film className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Track Your Watches</CardTitle>
                  <CardDescription>
                    Log every movie you watch with ratings, notes, and viewing details. Build your personal film history.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Share with Groups</CardTitle>
                  <CardDescription>
                    Create groups with friends and family. Share what you're watching and discover new recommendations.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>View Your Stats</CardTitle>
                  <CardDescription>
                    Get insights into your viewing patterns, favorite genres, top-rated films, and watching trends.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* AI Features Premium Section */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-2xl">AI-Powered Insights</CardTitle>
                      <div className="flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full">
                        <Crown className="h-3 w-3 text-primary" />
                        <span className="text-xs font-semibold text-primary">PREMIUM</span>
                      </div>
                    </div>
                    <CardDescription className="text-base">
                      Search your watch history with natural language and get AI-generated insights that analyze your viewing patterns, favorite companions, preferred locations, and personal notes to reveal your unique movie journey.
                    </CardDescription>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Intelligent AI search</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Personalized AI insights</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Deep viewing analysis</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Search Section - Priority for logged-in users */}
        {user && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Search Movies</CardTitle>
                <CardDescription>
                  Search TMDb to find movies to add to your watched list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MovieSearchBar
                  onResultsChange={handleSearchChange}
                  onLoadingChange={handleLoadingChange}
                />
                {!isSearching && searchResults.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Try searching for:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-muted rounded-full">"Inception"</span>
                      <span className="px-3 py-1 bg-muted rounded-full">"The Matrix"</span>
                      <span className="px-3 py-1 bg-muted rounded-full">"Interstellar"</span>
                      <span className="px-3 py-1 bg-muted rounded-full">"Pulp Fiction"</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Results for Logged-In Users */}
            {isSearching && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Searching...</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-[450px] w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold">Search Results</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {totalSearchResults > searchResults.length ? (
                      <>Showing {searchResults.length} of {totalSearchResults.toLocaleString()} results</>
                    ) : (
                      <>{searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found</>
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onAddToWatched={handleAddToWatched}
                    />
                  ))}
                </div>
                {currentPage < totalPages && (
                  <div className="flex justify-center py-8">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      size="lg"
                      variant="outline"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More Results'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Quick Stats for Logged-In Users */}
        {user && searchResults.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/watched" className="block hover:scale-[1.02] transition-transform">
              <Card className="h-full cursor-pointer hover:border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Watches</CardTitle>
                  <Film className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingRecent ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      totalWatchCount
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    View all watches
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/groups" className="block hover:scale-[1.02] transition-transform">
              <Card className="h-full cursor-pointer hover:border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Groups</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">View Groups</div>
                  <p className="text-xs text-muted-foreground">
                    Share with friends
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/stats" className="block hover:scale-[1.02] transition-transform">
              <Card className="h-full cursor-pointer hover:border-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Stats</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">View Stats</div>
                  <p className="text-xs text-muted-foreground">
                    Insights & trends
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Recent Watches Preview for Logged-In Users */}
        {user && searchResults.length === 0 && recentWatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Recently Watched</h2>
              <Link href="/watched">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentWatches.map((groupedWatch) => (
                <WatchCard key={groupedWatch.movieId} groupedWatch={groupedWatch} />
              ))}
            </div>
          </div>
        )}

        {/* Loading Recent Watches */}
        {user && searchResults.length === 0 && isLoadingRecent && recentWatches.length === 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Recently Watched</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[450px] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for Logged-In Users with No Watches */}
        {user && searchResults.length === 0 && !isLoadingRecent && recentWatches.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Film className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold">No watches yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Start tracking your movie journey! Search for a movie below and add your first watch.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Try It Out Section for Logged-Out Users */}
        {!user && (
          <div className="space-y-4">
            {searchResults.length === 0 && (
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Try It Out</h2>
                <p className="text-muted-foreground">
                  Search our movie database powered by TMDb
                </p>
              </div>
            )}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <MovieSearchBar
                  onResultsChange={handleSearchChange}
                  onLoadingChange={handleLoadingChange}
                />
                {!isSearching && searchResults.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Try searching for:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-muted rounded-full cursor-default">"Inception"</span>
                      <span className="px-3 py-1 bg-muted rounded-full cursor-default">"The Matrix"</span>
                      <span className="px-3 py-1 bg-muted rounded-full cursor-default">"Interstellar"</span>
                      <span className="px-3 py-1 bg-muted rounded-full cursor-default">"Pulp Fiction"</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Results Grid for Logged-Out Users */}
        {!user && isSearching && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Searching...</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-[450px] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!user && !isSearching && searchResults.length > 0 && (
          <>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Search Results</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalSearchResults > searchResults.length ? (
                    <>Showing {searchResults.length} of {totalSearchResults.toLocaleString()} results</>
                  ) : (
                    <>{searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found</>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {searchResults.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onAddToWatched={handleAddToWatched}
                  />
                ))}
              </div>
              {currentPage < totalPages && (
                <div className="flex justify-center py-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    size="lg"
                    variant="outline"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Results'
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* CTA after search results */}
            <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <h3 className="text-2xl font-bold text-center">Ready to start tracking?</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Sign up now to log movies, share with friends, and unlock your viewing stats.
                </p>
                <div className="flex gap-4">
                  <Link href="/register">
                    <Button size="lg">Create Free Account</Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline">Sign In</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}


        {/* Watch Form Dialog */}
        <WatchForm
          movie={selectedMovie}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={handleWatchSuccess}
        />

        {/* Upgrade Modal */}
        <UpgradeToPremiumModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="search"
        />
      </div>
    </main>
  );
}
