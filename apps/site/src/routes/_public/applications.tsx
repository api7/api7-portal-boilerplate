import { createFileRoute, redirect } from '@tanstack/react-router';

import { PATH_ROOT } from '@/constants/path-prefix';

// Slug-less entry point (e.g. a bookmarked/typed URL) — bounces to the
// first organization's applications page. `_public`'s beforeLoad already
// resolved session + org membership, so by the time this runs there's
// always at least one org.
export const Route = createFileRoute('/_public/applications')({
  beforeLoad: ({ context }) => {
    const activeOrgSlug = context.orgs?.[0]?.slug;
    throw redirect({
      href: activeOrgSlug ? `/${activeOrgSlug}/applications` : PATH_ROOT,
    });
  },
});
