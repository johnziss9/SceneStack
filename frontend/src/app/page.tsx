"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MovieSearchBar } from "@/components/MovieSearchBar";
import { MovieCard } from "@/components/MovieCard";
import { WatchForm } from "@/components/WatchForm";
import type { TmdbMovie } from '@/types';

export default function Home() {
  const [searchResults, setSearchResults] = useState<TmdbMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddToWatched = (movie: TmdbMovie) => {
    setSelectedMovie(movie);
    setIsFormOpen(true);
  };

  const handleWatchSuccess = () => {
    // TODO: Show success message or redirect to watched list
    console.log('Watch added successfully!');
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">SceneStack</h1>
          <p className="text-muted-foreground">Search for movies and track what you've watched</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Movies</CardTitle>
            <CardDescription>Search TMDb to find movies to add to your watched list</CardDescription>
          </CardHeader>
          <CardContent>
            <MovieSearchBar onResultsChange={setSearchResults} />
          </CardContent>
        </Card>

        {/* Search Results Grid */}
        {searchResults.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Search Results ({searchResults.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchResults.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onAddToWatched={handleAddToWatched}
                />
              ))}
            </div>
          </div>
        )}

        {/* Watch Form Dialog */}
        <WatchForm
          movie={selectedMovie}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={handleWatchSuccess}
        />
      </div>
    </main>
  );
}