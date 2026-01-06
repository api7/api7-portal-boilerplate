import { auth } from '@/lib/auth/server';
import { errToNextResJson } from '@/lib/auth/util';
import { portal } from '@/lib/portal-sdk/server';
import { APIError } from 'better-auth';
import { APIError as SDKAPIError } from '@api7/portal-sdk';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

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

    // Delete developer account first (organization id is used as developer_id)
    // If the developer was already deleted (e.g., by provider portal admin), ignore the error
    try {
      await portal.developer.delete(organizationId);
      console.log(`Successfully deleted developer  ${organizationId}`);
    } catch (error) {
      if (SDKAPIError.isAPIError(error) && error.status === 404) {
        console.log(`Developer ${organizationId} was already deleted`);
      } else {
        throw error;
      }
    }

    // Delete organization
    const res = await auth.api.deleteOrganization({
      body: {
        organizationId,
      },
      headers: allHeaders,
    });

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    console.error('Failed to delete organization:', JSON.stringify(error));
    return errToNextResJson(error);
  }
};
