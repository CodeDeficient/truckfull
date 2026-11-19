'use client';

import Link from '@/components/navigation/IntentLink';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { PipelineStats } from '@/lib/api/pipeline/handlers';

interface PipelineClientProps {
  readonly stats: PipelineStats;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatTile({
  title,
  value,
  subtext,
  icon: Icon,
  href,
}: {
  readonly title: string;
  readonly value: string | number;
  readonly subtext?: string;
  readonly icon: React.ElementType;
  readonly href?: string;
}) {
  const content = (
    <Card className={href ? 'hover:border-primary transition-colors' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function PipelineClient({ stats }: PipelineClientProps) {
  const { eventCounts, geocodingFailures, syncLog, recentEvents } = stats;

  const coveragePct =
    eventCounts.total > 0
      ? ((eventCounts.withCoordinates / eventCounts.total) * 100).toFixed(1)
      : '0';
  const vettedPct =
    eventCounts.withCoordinates > 0
      ? ((eventCounts.vetted / eventCounts.withCoordinates) * 100).toFixed(1)
      : '0';
  const relevantPct =
    eventCounts.vetted > 0
      ? ((eventCounts.relevant / eventCounts.vetted) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Monitor the end-to-end event ingestion, vetting, classification, and geocoding pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          title="Total Events"
          value={eventCounts.total}
          subtext="ingested from sources"
          icon={Database}
        />
        <StatTile
          title="With Coordinates"
          value={eventCounts.withCoordinates}
          subtext={`${coveragePct}% coverage`}
          icon={MapPin}
        />
        <StatTile
          title="Vetted"
          value={eventCounts.vetted}
          subtext={`${vettedPct}% of coordinate events`}
          icon={Activity}
          href="/admin/data-quality"
        />
        <StatTile
          title="Relevant"
          value={eventCounts.relevant}
          subtext={`${relevantPct}% of vetted events`}
          icon={CheckCircle2}
          href="/owner-dashboard/relevance-review"
        />
        <StatTile
          title="Relevance Classified"
          value={eventCounts.classified}
          subtext="by keyword + LLM cascade"
          icon={Activity}
          href="/owner-dashboard/relevance-review"
        />
        <StatTile
          title="Needs Human Review"
          value={eventCounts.reviewNeeded}
          subtext="borderline confidence"
          icon={AlertTriangle}
          href="/owner-dashboard/relevance-review"
        />
        <StatTile
          title="Geocoding Failures"
          value={geocodingFailures.unresolved}
          subtext={`${geocodingFailures.total} total ever`}
          icon={XCircle}
        />
        <StatTile
          title="Active Sources"
          value={syncLog.length}
          subtext="tracked in sync log"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Source Sync Log</CardTitle>
            <CardDescription>Last sync timestamp per ingestion source</CardDescription>
          </CardHeader>
          <CardContent>
            {syncLog.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No sources have synced yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Last Synced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLog.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell className="font-medium">{row.source}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeTime(row.lastSyncedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Ingested Events</CardTitle>
            <CardDescription>Latest 20 events with their pipeline status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No events ingested yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="max-w-[200px] truncate" title={event.title}>
                        {event.title}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.source}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {event.has_coordinates ? (
                            <span title="Has coordinates">📍</span>
                          ) : null}
                          {event.vetting_score == null ? null : (
                            <span title={`Vetted: ${event.vetting_score}`}>✓</span>
                          )}
                          {event.is_food_truck_relevant === true ? (
                            <span title="Marked relevant">🎯</span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Related Monitoring</CardTitle>
          <CardDescription>
            Pipeline runs alongside these monitoring surfaces
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/webhook-monitoring">
              <ExternalLink className="mr-2 h-4 w-4" />
              Webhook Monitoring
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/data-quality">
              <ExternalLink className="mr-2 h-4 w-4" />
              Data Quality
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/owner-dashboard/relevance-review">
              <ExternalLink className="mr-2 h-4 w-4" />
              Relevance Review
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
