import { NextRequest, NextResponse } from 'next/server';

import { actOnApproval } from '@/lib/approvals/act.server';

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ approval_id: string; action: string }> },
): Promise<NextResponse> {
  const { approval_id, action } = await ctx.params;
  if (action !== 'accept' && action !== 'reject') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  return actOnApproval(approval_id, action);
}
