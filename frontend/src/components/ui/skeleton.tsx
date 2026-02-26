import { cn } from "@/lib/utils"

function Skeleton({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "branded" | "poster"
}) {
  const variants = {
    default: "bg-muted/50 animate-pulse",
    branded: "bg-gradient-to-r from-muted/50 via-primary/20 to-muted/50 animate-shimmer bg-[length:200%_100%]",
    poster: "bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse aspect-[2/3]"
  };

  return (
    <div
      data-slot="skeleton"
      className={cn(variants[variant], "rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
