import Link from '@/components/navigation/IntentLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActionsSection() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Manage Food Trucks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">View, edit, and add food trucks</p>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/admin/food-trucks">Go to Trucks</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Manage users and roles</p>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/admin/users">Manage Users</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:bg-muted/50 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Webhook Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">View webhook events and sync status</p>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/admin/webhook-monitoring">View Webhooks</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
