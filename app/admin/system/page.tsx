// app/admin/system/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SystemPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Configuration</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Manage system settings and configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <p>System configuration features coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
