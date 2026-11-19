// app/admin/data-quality/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataQualityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Quality Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Quality</CardTitle>
          <CardDescription>Monitor and improve data quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            <p>Data quality management features coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
