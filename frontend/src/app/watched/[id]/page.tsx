'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { watchApi } from '@/lib';
import { movieApi, watchlistApi } from '@/lib/api';
import { useWatchlist } from '@/contexts/WatchlistContext';
import type { Watch, Movie, MovieDetail } from '@/types';
import { ApiError, PremiumRequiredError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Star } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EditWatchDialog from '@/components/EditWatchDialog';
import { WatchForm } from '@/components/WatchForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, AlertCircle, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingTips } from "@/components/LoadingTips";
import { MovieInsight } from '@/components/MovieInsight';
import { useAuth } from '@/contexts/AuthContext';

interface WatchDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function WatchDetailPage({ params }: WatchDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { incrementCount, decrementCount } = useWatchlist();
  const [movieId, setMovieId] = useState<number | null>(null);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWatch, setEditingWatch] = useState<Watch | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingWatch, setDeletingWatch] = useState<Watch | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRewatchDialogOpen, setIsRewatchDialogOpen] = useState(false);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [watchlistHover, setWatchlistHover] = useState(false);

  const handleEditSuccess = async () => {
    if (movieId) {
      try {
        const watchesData = await watchApi.getWatchesByMovie(movieId);
        setWatches(watchesData);
      } catch (err) {
        console.error('Error refetching watches:', err);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWatch || !movieId) return;
    setIsDeleting(true);
    try {
      await watchApi.deleteWatch(deletingWatch.id);
      const watchesData = await watchApi.getWatchesByMovie(movieId);
      if (watchesData.length === 0) {
        toast.success('Watch deleted successfully');
        router.push('/watched');
      } else {
        setWatches(watchesData);
        toast.success('Watch deleted successfully');
      }
      setIsDeleteDialogOpen(false);
      setDeletingWatch(null);
    } catch (err) {
      console.error('Error deleting watch:', err);
      toast.error('Failed to delete watch', { description: 'Please try again later' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRewatchSuccess = async () => {
    if (movieId) {
      try {
        const watchesData = await watchApi.getWatchesByMovie(movieId);
        setWatches(watchesData);
        if (watchesData.length > 0) setMovie(watchesData[0].movie);
      } catch (err) {
        console.error('Error refetching watches:', err);
      }
    }
  };

  const handleWatchlistToggle = async () => {
    if (!user || !movie || !movieId) return;
    setIsTogglingWatchlist(true);
    try {
      if (onWatchlist) {
        await watchlistApi.removeFromWatchlist(movieId);
        setOnWatchlist(false);
        decrementCount();
        toast.success('Removed from watchlist');
      } else {
        await watchlistApi.addToWatchlist(movie.tmdbId);
        setOnWatchlist(true);
        incrementCount();
        toast.success('Saved to watchlist');
      }
    } catch (err) {
      if (err instanceof PremiumRequiredError) {
        toast.error('Watchlist limit reached. Upgrade to Premium for unlimited saves.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params;
        const parsedId = parseInt(id);
        setMovieId(parsedId);

        const watchesData = await watchApi.getWatchesByMovie(parsedId);
        if (watchesData.length === 0) {
          setError('No watches found for this movie.');
          setIsLoading(false);
          return;
        }

        setWatches(watchesData);
        const basicMovie = watchesData[0].movie;
        setMovie(basicMovie);

        try {
          const detail = await movieApi.getDetail(basicMovie.tmdbId);
          setMovieDetail(detail);
        } catch {
          // Enriched detail is optional
        }

        // Fetch watchlist status
        if (user) {
          try {
            const status = await movieApi.getMyStatus(basicMovie.tmdbId);
            setOnWatchlist(status.onWatchlist);
          } catch {
            // Silently ignore watchlist status errors
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading watch details:', err);
        setError('Failed to load watch details. Please try again.');
        setIsLoading(false);
      }
    }
    loadData();
  }, [params, user]);

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <div className="p-4 sm:p-6">
          <LoadingTips />
        </div>
        <Skeleton variant="branded" className="w-full h-56 sm:h-72 rounded-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Skeleton variant="branded" className="h-8 w-2/3" />
          <Skeleton variant="branded" className="h-4 w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
            <div className="space-y-4">
              <Skeleton variant="branded" className="h-32 w-full" />
              <Skeleton variant="branded" className="h-48 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              const searchParams = new URLSearchParams(window.location.search);
              router.push(`/watched?${searchParams.toString()}`);
            }}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Watched List
          </Button>
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <p className="text-center text-muted-foreground">{error || 'Movie not found.'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const backdropUrl = movieDetail?.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${movieDetail.backdropPath}`
    : null;

  const avgRating = watches.some(w => w.rating)
    ? (watches.reduce((sum, w) => sum + (w.rating || 0), 0) / watches.filter(w => w.rating).length).toFixed(1)
    : null;

  return (
    <main className="min-h-screen pb-12">
      {/* Backdrop */}
      <div className="relative w-full h-56 sm:h-72 bg-muted overflow-hidden">
        {backdropUrl && (
          <img src={backdropUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute top-4 left-0 right-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const searchParams = new URLSearchParams(window.location.search);
                router.push(`/watched?${searchParams.toString()}`);
              }}
              className="!bg-muted !text-primary !border-primary shadow-sm hover:!bg-primary hover:!text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Watched
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Poster + Title row — overlaps backdrop */}
        <div className="flex gap-5 -mt-16 sm:-mt-24 relative z-10 mb-6">
          {/* Poster */}
          <div className="hidden sm:block flex-shrink-0 w-32 rounded-lg overflow-hidden shadow-xl border border-border">
            {movie.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center text-muted-foreground text-xs">
                No poster
              </div>
            )}
          </div>

          {/* Title + meta + action */}
          <div className="flex-1 pt-20 sm:pt-0 sm:self-end pb-2 space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              {movie.title}
              {movie.year && (
                <span className="text-muted-foreground font-normal ml-2 text-xl">({movie.year})</span>
              )}
            </h1>

            {movieDetail?.tagline && (
              <p className="text-sm text-muted-foreground italic">{movieDetail.tagline}</p>
            )}

            {/* TMDb rating */}
            {movieDetail?.tmdbRating && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {movieDetail.tmdbRating.toFixed(1)}
                {movieDetail.tmdbVoteCount && (
                  <span className="text-xs">({movieDetail.tmdbVoteCount.toLocaleString()})</span>
                )}
              </div>
            )}

            {/* Genres + runtime as pills */}
            <div className="flex flex-wrap gap-1.5">
              {movieDetail?.runtime && (
                <span className="px-2.5 py-0.5 rounded-full text-xs border border-border bg-muted flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRuntime(movieDetail.runtime)}
                </span>
              )}
              {movieDetail?.genres?.map(genre => (
                <span key={genre} className="px-2.5 py-0.5 rounded-full text-xs border border-border bg-muted">
                  {genre}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Button onClick={() => setIsRewatchDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Log Another Watch
              </Button>

              {user && (
                <Button
                  variant={onWatchlist ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleWatchlistToggle}
                  disabled={isTogglingWatchlist}
                  onMouseEnter={() => setWatchlistHover(true)}
                  onMouseLeave={() => setWatchlistHover(false)}
                >
                  {onWatchlist ? (
                    watchlistHover ? (
                      <><BookmarkPlus className="h-4 w-4 mr-2 text-destructive" />Remove</>
                    ) : (
                      <><BookmarkCheck className="h-4 w-4 mr-2" />On Watchlist</>
                    )
                  ) : (
                    <><BookmarkPlus className="h-4 w-4 mr-2" />Save to Watchlist</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: movie info + cast */}
          <div className="lg:col-span-1 space-y-6">

            {/* Your stats */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Stats</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Times watched</span>
                  <span className="font-bold text-lg">{watches.length}</span>
                </div>
                {avgRating && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your avg rating</span>
                    <span className="font-bold text-lg text-primary">{avgRating}<span className="text-sm font-normal text-muted-foreground">/10</span></span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Synopsis */}
            {movie.synopsis && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Overview</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{movie.synopsis}</p>
              </div>
            )}

            {/* AI Synopsis */}
            {movie.aiSynopsis && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Summary</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{movie.aiSynopsis}</p>
              </div>
            )}

            {/* Director */}
            {movieDetail?.directorName && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Director</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {movieDetail.directorName.charAt(0)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{movieDetail.directorName}</p>
                </div>
              </div>
            )}

            {/* Cast */}
            {movieDetail?.cast && movieDetail.cast.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cast</h2>
                <div className="grid grid-cols-4 gap-3">
                  {movieDetail.cast.slice(0, 8).map((member, i) => {
                    const profileUrl = member.profilePath
                      ? `https://image.tmdb.org/t/p/w185${member.profilePath}`
                      : null;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {profileUrl ? (
                            <img src={profileUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">{member.name.charAt(0)}</span>
                          )}
                        </div>
                        <p className="text-xs font-medium leading-tight line-clamp-2">{member.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column: watch history + AI insight */}
          <div className="lg:col-span-2 space-y-6">

            {/* AI Insight */}
            <MovieInsight
              movieId={movieId!}
              watchCount={watches.length}
              isPremium={user?.isPremium ?? false}
            />

            {/* Watch History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Watch History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium text-xs text-muted-foreground">Date</th>
                        <th className="text-left py-2 px-4 font-medium text-xs text-muted-foreground">Rating</th>
                        <th className="hidden sm:table-cell text-left py-2 px-4 font-medium text-xs text-muted-foreground">Location</th>
                        <th className="hidden sm:table-cell text-left py-2 px-4 font-medium text-xs text-muted-foreground">With</th>
                        <th className="hidden md:table-cell text-left py-2 px-4 font-medium text-xs text-muted-foreground">Notes</th>
                        <th className="text-right py-2 px-4 font-medium text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watches.map((watch) => (
                        <tr key={watch.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-4 text-sm whitespace-nowrap">
                            {new Date(watch.watchedDate).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                            {watch.isRewatch && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                Rewatch
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {watch.rating
                              ? <span className="font-semibold text-primary">{watch.rating}/10</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="hidden sm:table-cell py-3 px-4 text-sm">
                            {watch.watchLocation || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="hidden sm:table-cell py-3 px-4 text-sm">
                            {watch.watchedWith || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="hidden md:table-cell py-3 px-4 text-sm max-w-xs">
                            {watch.notes
                              ? <p className="line-clamp-2 text-muted-foreground">{watch.notes}</p>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingWatch(watch); setIsEditDialogOpen(true); }}>
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setDeletingWatch(watch); setIsDeleteDialogOpen(true); }}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditWatchDialog
        watch={editingWatch}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Watch Entry</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you sure you want to delete this watch entry?</p>
                {deletingWatch && (
                  <div className="mt-2 text-sm">
                    <strong>{deletingWatch.movie.title}</strong> watched on{' '}
                    {new Date(deletingWatch.watchedDate).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </div>
                )}
                <p className="mt-2">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {movie && (
        <WatchForm
          movie={{
            id: movie.tmdbId,
            title: movie.title,
            release_date: movie.year ? `${movie.year}-01-01` : undefined,
            poster_path: movie.posterPath || undefined,
            overview: movie.synopsis || undefined,
            vote_average: movieDetail?.tmdbRating ?? 0,
            vote_count: movieDetail?.tmdbVoteCount ?? 0,
          }}
          open={isRewatchDialogOpen}
          onOpenChange={setIsRewatchDialogOpen}
          onSuccess={handleRewatchSuccess}
        />
      )}
    </main>
  );
}
