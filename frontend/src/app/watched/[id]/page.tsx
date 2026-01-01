'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { watchApi } from '@/lib';
import type { Watch, Movie } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface WatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WatchDetailPage({ params }: WatchDetailPageProps) {
  const router = useRouter();
  const [movieId, setMovieId] = useState<number | null>(null);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWatch, setEditingWatch] = useState<Watch | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingWatch, setDeletingWatch] = useState<Watch | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRewatchDialogOpen, setIsRewatchDialogOpen] = useState(false);

  const handleEditSuccess = async () => {
    // Refetch watches after edit
    if (movieId) {
      try {
        const watchesData = await watchApi.getWatchesByMovie(movieId, 1);
        setWatches(watchesData);
      } catch (err) {
        console.error('Error refetching watches:', err);
      }
    }
  };

  const handleEditClick = (watch: Watch) => {
    setEditingWatch(watch);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (watch: Watch) => {
    setDeletingWatch(watch);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWatch || !movieId) return;

    setIsDeleting(true);
    try {
      await watchApi.deleteWatch(deletingWatch.id);

      // Refetch watches after delete
      const watchesData = await watchApi.getWatchesByMovie(movieId, 1);

      if (watchesData.length === 0) {
        // No more watches for this movie, redirect to watched list
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
      toast.error('Failed to delete watch', {
        description: 'Please try again later',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRewatchSuccess = async () => {
    // Refetch watches after adding another watch
    if (movieId) {
      try {
        const watchesData = await watchApi.getWatchesByMovie(movieId, 1);
        setWatches(watchesData);
        if (watchesData.length > 0) {
          setMovie(watchesData[0].movie); // Update movie data in case it changed
        }
      } catch (err) {
        console.error('Error refetching watches:', err);
      }
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params;
        const parsedId = parseInt(id);
        setMovieId(parsedId);

        // Fetch watches for this movie
        const watchesData = await watchApi.getWatchesByMovie(parsedId, 1); // userId: 1 for Phase 1

        if (watchesData.length === 0) {
          setError('No watches found for this movie.');
          setIsLoading(false);
          return;
        }

        setWatches(watchesData);
        // Movie data comes with the watches
        setMovie(watchesData[0].movie);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading watch details:', err);
        setError('Failed to load watch details. Please try again.');
        setIsLoading(false);
      }
    }

    loadData();
  }, [params]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-48" />
          </div>

          {/* Movie Info Card Skeleton */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex gap-6">
                <Skeleton className="w-48 h-72 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Watch History Table Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>Watch History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 flex-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/watched')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Watched List
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">{error || 'Movie not found.'}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/watched')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Watched List
          </Button>
          <Button onClick={() => setIsRewatchDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Another Watch
          </Button>
        </div>

        {/* Movie Info Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* Movie Poster */}
              <div className="flex-shrink-0">
                {movie.posterPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                    alt={movie.title}
                    className="w-48 h-72 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-72 bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">No poster</span>
                  </div>
                )}
              </div>

              {/* Movie Details */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  {movie.title}
                  {movie.year && (
                    <span className="text-muted-foreground ml-2">({movie.year})</span>
                  )}
                </h1>

                {/* Watch Stats */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Watches:</span>
                    <span className="ml-2 font-semibold">{watches.length}</span>
                  </div>
                  {watches.some(w => w.rating) && (
                    <div>
                      <span className="text-muted-foreground">Average Rating:</span>
                      <span className="ml-2 font-semibold text-primary">
                        {(watches.reduce((sum, w) => sum + (w.rating || 0), 0) / watches.filter(w => w.rating).length).toFixed(1)}/10
                      </span>
                    </div>
                  )}
                </div>

                {/* Synopsis */}
                {movie.synopsis && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Synopsis</h3>
                    <p className="text-sm leading-relaxed">{movie.synopsis}</p>
                  </div>
                )}

                {/* AI Synopsis if available */}
                {movie.aiSynopsis && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">AI Summary</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{movie.aiSynopsis}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watch Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Watch History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Date Watched</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Rating</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Location</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Watched With</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Notes</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watches.map((watch) => (
                    <tr key={watch.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-4 px-4 text-sm">
                        {new Date(watch.watchedDate).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                        {watch.isRewatch && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                            Rewatch
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {watch.rating ? (
                          <span className="font-semibold text-primary">{watch.rating}/10</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {watch.watchLocation || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {watch.watchedWith || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-4 px-4 text-sm max-w-md">
                        {watch.notes ? (
                          <p className="line-clamp-2">{watch.notes}</p>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(watch)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(watch)}
                          >
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

        {/* Edit Watch Dialog */}
        <EditWatchDialog
          watch={editingWatch}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
        />

        {/* Delete Confirmation Dialog */}
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
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
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

        {/* Log Another Watch Dialog */}
        {movie && (
          <WatchForm
            movie={{
              id: movie.tmdbId,
              title: movie.title,
              release_date: movie.year ? `${movie.year}-01-01` : undefined,
              poster_path: movie.posterPath || undefined,
              overview: movie.synopsis || undefined,
              vote_average: 0,
              vote_count: 0,
            }}
            open={isRewatchDialogOpen}
            onOpenChange={setIsRewatchDialogOpen}
            onSuccess={handleRewatchSuccess}
          />
        )}
      </div>
    </main>
  );
}