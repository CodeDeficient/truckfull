// app/admin/tools/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ToolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Tools</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Tools</CardTitle>
          <CardDescription>Utility tools and administrative functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <p>Admin tools and utilities coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
