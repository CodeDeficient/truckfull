// app/admin/data-cleanup/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataCleanupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Cleanup</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Cleanup</CardTitle>
          <CardDescription>Tools for cleaning and maintaining data integrity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <p>Data cleanup tools coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
