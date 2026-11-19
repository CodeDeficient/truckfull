'use client';

import * as React from 'react';
import { Progress } from '@/components/ui/progress';

type ColorType = 'green' | 'yellow' | 'gray';

interface ScoreBreakdownBarProps {
  label: string;
  score: number;
  maxScore: number;
  color?: ColorType;
}

function getColorByPercentage(percentage: number, providedColor?: ColorType): ColorType {
  if (providedColor) return providedColor;
  if (percentage >= 80) return 'green';
  if (percentage >= 40) return 'yellow';
  return 'gray';
}

function getColorClasses(color: ColorType): string {
  switch (color) {
    case 'green': {
      return 'bg-green-500';
    }
    case 'yellow': {
      return 'bg-yellow-500';
    }
    case 'gray': {
      return 'bg-gray-400';
    }
  }
}

export function ScoreBreakdownBar({ label, score, maxScore, color }: ScoreBreakdownBarProps) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const resolvedColor = getColorByPercentage(percentage, color);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium min-w-[100px]">{label}</span>
      <div className="flex-1">
        <Progress
          value={percentage}
          className="h-2"
          indicatorClassName={getColorClasses(resolvedColor)}
        />
      </div>
      <span className="text-sm text-muted-foreground min-w-[50px] text-right">
        {score}/{maxScore}
      </span>
    </div>
  );
}