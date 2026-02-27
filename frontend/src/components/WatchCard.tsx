"use client";

import { memo, useState } from "react";
import { GroupedWatch } from "@/types/watch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Lock, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UpgradeToPremiumModal } from "./UpgradeToPremiumModal";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { formatWatchDate } from "@/lib/utils";

interface WatchCardProps {
    groupedWatch: GroupedWatch;
}

export const WatchCard = memo(function WatchCard({ groupedWatch }: WatchCardProps) {
    const { user } = useAuth();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { movie, watchCount, averageRating, watches } = groupedWatch;

    // Format rating to show whole numbers without decimals, or .5 ratings
    const avgRating = averageRating
        ? (averageRating % 1 === 0 ? averageRating.toString() : averageRating.toFixed(1))
        : null;
    const lastWatch = watches[0];

    const lastWatchedDate = formatWatchDate(lastWatch.watchedDate);

    const posterUrl = movie.posterPath
        ? `https://image.tmdb.org/t/p/w342${movie.posterPath}`
        : null;

    // Determine privacy status
    const allPrivate = watches.every(w => w.isPrivate);
    const allShared = watches.every(w => !w.isPrivate && w.groupIds && w.groupIds.length > 0);
    const hasShared = watches.some(w => !w.isPrivate && w.groupIds && w.groupIds.length > 0);

    return (
        <TooltipProvider>
            <Link href={`/watched/${movie.id}`} className="flex flex-col h-full">
            <Card className="flex flex-col h-full overflow-hidden transition-all hover:ring-2 hover:ring-primary duration-200">
                <CardHeader className="p-0">
                    <div className="aspect-[2/3] bg-muted relative">
                        {posterUrl ? (
                            <>
                                <img
                                    src={posterUrl}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No poster
                            </div>
                        )}

                        {watchCount > 1 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                                        watchCount >= 5
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                            : 'bg-primary text-primary-foreground'
                                    }`}>
                                        {watchCount >= 5 ? (
                                            <Sparkles className="w-3 h-3" />
                                        ) : (
                                            <Eye className="w-3 h-3" />
                                        )}
                                        {watchCount}x
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>You've watched this {watchCount} time{watchCount > 1 ? 's' : ''}!</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-base line-clamp-2 mb-1 hover:underline h-12">
                        {movie.title}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-2">
                        {movie.year || '\u00A0'}
                    </p>

                    {/* Rating - fixed height */}
                    <div className="h-9 mb-2 flex items-center justify-between">
                        {avgRating ? (
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold text-primary">
                                    {avgRating}
                                </span>
                                <span className="text-sm text-muted-foreground">/10</span>
                            </div>
                        ) : <div />}

                        {/* Privacy indicator */}
                        {allPrivate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="bg-primary text-primary-foreground p-1.5 rounded-full">
                                        <Lock className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>This watch is private</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        {!allPrivate && hasShared && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="bg-primary text-primary-foreground p-1.5 rounded-full">
                                        <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Shared with groups</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                        <p>Last watched: {lastWatchedDate}</p>
                        {lastWatch.watchLocation && (
                            <p className="flex items-center gap-1">
                                {lastWatch.watchLocation === "Cinema" ? "🎬" : "🏠"} {lastWatch.watchLocation}
                            </p>
                        )}
                        {lastWatch.watchedWith && (
                            <p className="truncate">With: {lastWatch.watchedWith}</p>
                        )}
                    </div>

                    {/* AI Insight Teaser */}
                    {!user?.isPremium && (
                        <div className="pt-2 mt-2 border-t">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowUpgradeModal(true);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Badge
                                            variant="secondary"
                                            className="w-full justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            AI Insight
                                            <Lock className="w-3 h-3" />
                                        </Badge>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Get AI-powered personalized insights</p>
                                    <p className="text-xs text-muted-foreground">Premium feature</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>

        {/* Upgrade Modal (for free users) */}
        {!user?.isPremium && (
            <UpgradeToPremiumModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                feature="insights"
            />
        )}
        </TooltipProvider>
    );
});
