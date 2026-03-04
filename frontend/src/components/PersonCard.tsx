"use client";

import { memo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Film } from 'lucide-react';
import type { TmdbPerson } from '@/types';

interface PersonCardProps {
    person: TmdbPerson;
    onViewMovies: (person: TmdbPerson) => void;
}

export const PersonCard = memo(function PersonCard({ person, onViewMovies }: PersonCardProps) {
    const profileUrl = person.profile_path
        ? `https://image.tmdb.org/t/p/w342${person.profile_path}`
        : null;

    const knownForMovies = person.known_for
        .filter(item => item.media_type === 'movie' && item.title)
        .slice(0, 3)
        .map(item => item.title)
        .join(', ');

    return (
        <Card className="overflow-hidden hover:ring-2 hover:ring-primary transition-all flex flex-col h-full">
            <div className="aspect-[2/3] relative bg-muted">
                {profileUrl ? (
                    <img
                        src={profileUrl}
                        alt={person.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <User className="h-16 w-16" />
                    </div>
                )}
            </div>

            <CardContent className="p-4 space-y-2 flex-grow">
                <h3 className="font-semibold line-clamp-2 leading-tight">
                    {person.name}
                </h3>

                {person.known_for_department && (
                    <p className="text-sm text-muted-foreground">
                        {person.known_for_department}
                    </p>
                )}

                {knownForMovies && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                        Known for: {knownForMovies}
                    </p>
                )}
            </CardContent>

            <CardFooter className="p-4 pt-0">
                <Button
                    onClick={() => onViewMovies(person)}
                    className="w-full"
                    variant="outline"
                >
                    <Film className="h-4 w-4 mr-2" />
                    View Movies
                </Button>
            </CardFooter>
        </Card>
    );
});
