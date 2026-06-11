import { auth } from '@/lib/auth/server';
import { errToNextResJson } from '@/lib/auth/util';
import { portal } from '@/lib/portal-sdk/server';
import { APIError } from 'better-auth';
import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { customAlphabet } from 'nanoid';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// All non-create/delete org requests (GET list, update, etc.) pass through to Better Auth.
export const GET = (req: Request) => auth.handler(req);

const genSlug = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

const MAX_SLUG_RETRIES = 2;

const getErrorLogContext = (error: unknown) => {
  if (SDKAPIError.isAPIError(error)) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof APIError) {
    return { message: error.message, status: error.statusCode };
  }
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: 'Unknown error' };
};

export const POST = async (
  req: Request,
  ctx: { params: Promise<{ action: string }> },
) => {
  const { action } = await ctx.params;

  if (action === 'create') {
    try {
      const body = await req.json();
      const allHeaders = await headers();

      const slugWasProvided = Boolean(body.slug);
      if (!slugWasProvided) {
        body.slug = genSlug();
      }

      let res: Awaited<ReturnType<typeof auth.api.createOrganization>> | null =
        null;

      for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
        try {
          res = await auth.api.createOrganization({
            body,
            headers: allHeaders,
          });
          break;
        } catch (error) {
          const isSlugConflict =
            error instanceof APIError &&
            error.statusCode === 422 &&
            /slug|unique|already exists/i.test(error.message ?? '');

          if (!slugWasProvided && isSlugConflict && attempt < MAX_SLUG_RETRIES) {
            body.slug = genSlug();
            continue;
          }
          throw error;
        }
      }

      if (!res?.id) {
        return errToNextResJson(
          new APIError('INTERNAL_SERVER_ERROR', {
            message: 'Failed to create organization.',
          }),
        );
      }

      try {
        await portal.developer.create({ developer_id: res.id });
        console.log(`Successfully created developer for organization ${res.id}`);
        return NextResponse.json(res, { status: 200 });
      } catch (error) {
        const createErr = error;
        console.error(
          `Failed to create developer for organization ${res.id}, deleting organization:`,
          getErrorLogContext(createErr),
        );
        try {
          await auth.api.deleteOrganization({
            body: { organizationId: res.id },
            headers: allHeaders,
          });
        } catch (rollbackErr) {
          console.error(
            `Failed to rollback organization ${res.id}:`,
            getErrorLogContext(rollbackErr),
          );
        }
        return errToNextResJson(createErr);
      }
    } catch (error) {
      console.error('Failed to create organization:', getErrorLogContext(error));
      return errToNextResJson(error);
    }
  }

  if (action === 'delete') {
    try {
      const body = await req.json();
      const allHeaders = await headers();
      const { organizationId } = body;

      if (!organizationId) {
        return errToNextResJson(
          new APIError('BAD_REQUEST', {
            message: 'organizationId is required.',
          }),
        );
      }

      const res = await auth.api.deleteOrganization({
        body: { organizationId },
        headers: allHeaders,
      });

      try {
        await portal.developer.delete(organizationId);
        console.log(`Successfully deleted developer ${organizationId}`);
      } catch (error) {
        if (SDKAPIError.isAPIError(error) && error.status === 404) {
          console.log(`Developer ${organizationId} was already deleted`);
        } else {
          console.error(
            `Organization ${organizationId} was deleted but developer cleanup failed:`,
            getErrorLogContext(error),
          );
        }
      }

      return NextResponse.json(res, { status: 200 });
    } catch (error) {
      console.error('Failed to delete organization:', getErrorLogContext(error));
      return errToNextResJson(error);
    }
  }

  // Unknown actions pass through to Better Auth (e.g. acceptInvitation, setActive, etc.)
  return auth.handler(req);
};
