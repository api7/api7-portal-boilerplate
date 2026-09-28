import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type BadgeListProps = {
  data: string[];
  limitCount?: number;
  badgeClassName?: string;
};

function BadgeListItem({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="secondary"
            className={cn('max-w-32 truncate', className)}
          >
            {label}
          </Badge>
        }
      />
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function BadgeList({
  data,
  limitCount = Number.MAX_SAFE_INTEGER,
  badgeClassName,
}: BadgeListProps) {
  const visible = data.slice(0, limitCount);
  const overflow = data.slice(limitCount);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {visible.map((label, i) => (
          <BadgeListItem key={`${i}:${label}`} label={label} className={badgeClassName} />
        ))}
        {overflow.length > 0 && (
          <Popover>
            <PopoverTrigger
              render={
                <Badge variant="secondary" className="shrink-0 cursor-pointer">
                  +{overflow.length}
                </Badge>
              }
            />
            <PopoverContent className="w-auto p-2">
              <div className="flex flex-wrap gap-1 max-w-64">
                {overflow.map((label, i) => (
                  <BadgeListItem key={`${i}:${label}`} label={label} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
}
