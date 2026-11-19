'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StatCardProps {
  title: React.ReactNode;
  value: string | number;
  description?: string;
  progress?: number;
  icon?: React.ReactNode;
  iconBg?: string;
}

export function StatCard({ title, value, description, progress, icon, iconBg }: StatCardProps) {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-4 px-4 pb-1 md:pt-6 md:px-6 md:pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className={`p-2 rounded-lg ${iconBg || 'bg-muted'}`}>{icon}</div>}
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
        {progress !== undefined && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
