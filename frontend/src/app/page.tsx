import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">SceneStack</h1>
          <p className="text-muted-foreground">Search for movies and track what you've watched</p>
        </div>

        {/* Color Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Component Color Test</CardTitle>
            <CardDescription>Testing your custom dark blue + orange theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-input">Test Input</Label>
              <Input id="test-input" placeholder="Type something..." />
            </div>
            
            <div className="flex gap-4">
              <Button>Primary Button (Orange)</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}