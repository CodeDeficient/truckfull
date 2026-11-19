import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'open';
  className?: string;
}

/**
 * A chip-style component to display active filters with optional remove functionality
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  onRemove,
  variant = 'outline',
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Badge variant={variant} className="rounded-full px-3 py-1 text-xs font-medium">
        {label}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1.5 p-0 hover:bg-transparent hover:text-current hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label={`Remove ${label} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </Badge>
    </div>
  );
};
