export default function WatchDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Watch Details</h1>
        <p className="text-gray-600 mb-4">Watch ID: {params.id}</p>
        {/* Watch details will go here */}
      </div>
    </main>
  );
}