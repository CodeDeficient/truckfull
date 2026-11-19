import Link from '@/components/navigation/IntentLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdditionalLinksSection() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>
              <Link href="/admin/data-cleanup" className="text-blue-600 hover:underline text-sm">
                Data Cleanup Tools
              </Link>
            </li>
            <li>
              <Link
                href="/admin/data-completeness"
                className="text-blue-600 hover:underline text-sm"
              >
                Data Completeness Reports
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>
              <Link href="/admin/system" className="text-blue-600 hover:underline text-sm">
                System Configuration
              </Link>
            </li>
            <li>
              <a
                href="/api/admin/radius-status"
                className="text-blue-600 hover:underline text-sm"
                target="_blank"
                rel="noreferrer"
              >
                Radius Status
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>
              <Link href="/admin/tools" className="text-blue-600 hover:underline text-sm">
                Admin Tools
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
