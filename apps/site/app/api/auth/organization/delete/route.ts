import { auth } from '@/lib/auth/server';
import { errToNextResJson } from '@/lib/auth/util';
import { portal } from '@/lib/portal-sdk/server';
import { APIError } from 'better-auth';
import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

const getErrorLogContext = (error: unknown) => {
  if (SDKAPIError.isAPIError(error)) {
    return {
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof APIError) {
    return {
      message: error.message,
      status: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return { message: 'Unknown error' };
};

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const allHeaders = await headers();
    const { organizationId } = body;

    if (!organizationId) {
      return errToNextResJson(
        new APIError('BAD_REQUEST', {
          message: 'organizationId is required.',
        })
      );
    }

    // Delete organization first so auth checks happen before any privileged cleanup.
    const res = await auth.api.deleteOrganization({
      body: {
        organizationId,
      },
      headers: allHeaders,
    });

    // Delete developer account after authorization succeeds.
    // If cleanup fails after the organization is gone, keep the successful org deletion response.
    try {
      await portal.developer.delete(organizationId);
      console.log(`Successfully deleted developer ${organizationId}`);
    } catch (error) {
      if (SDKAPIError.isAPIError(error) && error.status === 404) {
        console.log(`Developer ${organizationId} was already deleted`);
      } else {
        console.error(
          `Organization ${organizationId} was deleted but developer cleanup failed:`,
          getErrorLogContext(error)
        );
      }
    }

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    console.error('Failed to delete organization:', getErrorLogContext(error));
    return errToNextResJson(error);
  }
};
