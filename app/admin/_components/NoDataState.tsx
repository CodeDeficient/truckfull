import { Card, CardContent } from '@/components/ui/card';

export function NoDataState() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No dashboard data available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
