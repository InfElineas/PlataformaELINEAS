import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSessionFromRequest } from '@/lib/auth/session';
import { resolveUserAccess } from '@/lib/auth/access';
import { maskUserForResponse } from '@/lib/auth';

export async function GET(request) {
  const session = getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ user: null, permissions: [], roleKeys: [] }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ user: null, permissions: [], roleKeys: [] }, { status: 401 });
  }

  const access = await resolveUserAccess(user._id, user.org_id);

  return NextResponse.json({
    user: maskUserForResponse(user),
    permissions: access.permissionKeys,
    roleKeys: access.roleKeys
  });
}
