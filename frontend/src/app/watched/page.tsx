import { WatchList } from "@/components/WatchList";

export default function WatchedPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Watches</h1>
          <p className="text-muted-foreground">
            Your personal movie watching history
          </p>
        </div>

        <WatchList />
      </div>
    </main>
  );
}