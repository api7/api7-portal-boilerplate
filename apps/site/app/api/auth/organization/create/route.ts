import { auth } from '@/lib/auth/server';
import { errToNextResJson } from '@/lib/auth/util';
import { portal } from '@/lib/portal-sdk/server';
import { APIError } from 'better-auth';
import { nanoid } from 'nanoid';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const MAX_SLUG_RETRIES = 2;

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const allHeaders = await headers();

    // Track whether slug was auto-generated (only retry on conflict for auto-generated slugs)
    const slugWasProvided = Boolean(body.slug);
    if (!slugWasProvided) {
      body.slug = nanoid(8);
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

        // Only retry with a new slug if it was auto-generated
        if (!slugWasProvided && isSlugConflict && attempt < MAX_SLUG_RETRIES) {
          body.slug = nanoid(8);
          continue;
        }
        throw error;
      }
    }

    if (!res?.id) {
      return errToNextResJson(
        new APIError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to create organization.',
        })
      );
    }

    try {
      // Create developer account for the organization
      // The organization id is used as the developer_id directly
      await portal.developer.create({ developer_id: res.id });

      console.log(`Successfully created developer for organization ${res.id}`);

      return NextResponse.json(res, { status: 200 });
    } catch (error) {
      // Rollback: delete organization if developer creation fails
      console.error(
        `Failed to create developer for organization ${res.id}, deleting organization:`,
        JSON.stringify(error, null, 2)
      );

      await auth.api.deleteOrganization({
        body: {
          organizationId: res.id,
        },
        headers: allHeaders,
      });
      return errToNextResJson(error);
    }
  } catch (error) {
    console.error('Failed to create organization:', JSON.stringify(error));
    return errToNextResJson(error);
  }
};
