"use client";

import { useState, useEffect } from "react";
import { Lightbulb } from "lucide-react";

const LOADING_TIPS = [
    "Did you know you can bulk edit privacy settings for multiple movies?",
    "Try AI Search to find movies by mood, theme, or specific scenes",
    "Drag and drop to reorder your watchlist priorities",
    "Share specific watches with different groups for tailored sharing",
    "Use filters to quickly find your highest-rated movies",
    "Premium members get unlimited groups and AI-powered insights",
    "You can track rewatches to see your favorite movies over time",
    "Add watch locations to remember where you saw each movie",
    "Group feeds show what your friends are watching in real-time",
    "Export your watch history to share with other platforms",
    "Use the search bar to find movies by title, year, or genre",
    "Check your stats page to see your watching patterns and trends",
];

interface LoadingTipsProps {
    className?: string;
    interval?: number; // milliseconds between tip rotations
}

export function LoadingTips({ className = "", interval = 3000 }: LoadingTipsProps) {
    // Start with index 0 to avoid hydration mismatch (server and client must match)
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // Randomize the initial tip after mount (client-side only)
    useEffect(() => {
        setCurrentTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    }, []);

    useEffect(() => {
        const rotationTimer = setInterval(() => {
            setIsVisible(false);

            // Wait for fade out, then change tip
            setTimeout(() => {
                setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
                setIsVisible(true);
            }, 200);
        }, interval);

        return () => clearInterval(rotationTimer);
    }, [interval]);

    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 ${className}`}>
            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p
                className={`text-sm text-muted-foreground transition-opacity duration-200 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {LOADING_TIPS[currentTipIndex]}
            </p>
        </div>
    );
}
