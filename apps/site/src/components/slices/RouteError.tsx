import { type ErrorComponentProps, useRouter } from '@tanstack/react-router';
import { RotateCwIcon, TriangleAlertIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          We couldn&apos;t load this page. Please try again in a moment.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {import.meta.env.DEV && error instanceof Error && (
          <pre className="w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <Button variant="outline" onClick={() => void router.invalidate()}>
          <RotateCwIcon />
          Retry
        </Button>
      </EmptyContent>
    </Empty>
  );
}
