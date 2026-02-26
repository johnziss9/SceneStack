"use client";

interface ModernLoaderProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    variant?: "spinner" | "dots" | "pulse";
}

export function ModernLoader({ size = "md", text, variant = "spinner" }: ModernLoaderProps) {
    const sizes = {
        sm: { container: "w-8 h-8", dot: "w-2 h-2" },
        md: { container: "w-12 h-12", dot: "w-3 h-3" },
        lg: { container: "w-16 h-16", dot: "w-4 h-4" },
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            {variant === "spinner" && (
                <div className={`${sizes[size].container} relative`}>
                    {/* Outer rotating ring with gradient */}
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/50 animate-spin" />

                    {/* Inner pulsing circle */}
                    <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
                </div>
            )}

            {variant === "dots" && (
                <div className="flex items-center gap-2">
                    <div className={`${sizes[size].dot} rounded-full bg-primary animate-bounce [animation-delay:-0.3s]`} />
                    <div className={`${sizes[size].dot} rounded-full bg-primary animate-bounce [animation-delay:-0.15s]`} />
                    <div className={`${sizes[size].dot} rounded-full bg-primary animate-bounce`} />
                </div>
            )}

            {variant === "pulse" && (
                <div className={`${sizes[size].container} relative`}>
                    {/* Expanding rings */}
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full bg-primary/40 animate-pulse" />
                    <div className="absolute inset-3 rounded-full bg-primary" />
                </div>
            )}

            {/* Loading text */}
            {text && (
                <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
            )}
        </div>
    );
}
