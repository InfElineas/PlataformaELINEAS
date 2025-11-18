import { NextResponse } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/auth';
import { deleteUserGoogleTokens, isOAuthConfigured } from '@/lib/google/oauth';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';

export async function DELETE(request) {
  if (!isOAuthConfigured()) {
    return NextResponse.json({ ok: false, error: 'Google OAuth no está disponible' }, { status: 400 });
  }

  const session = await requirePermission(request, PERMISSIONS.IMPORTS_MANAGE, { orgScoped: false });
  await deleteUserGoogleTokens(session.user.id);
  await connectDB();
  await AuditLog.create({
    org_id: session.orgId,
    user_id: session.user.id,
    action: 'integrations.google.disconnected',
    resource: 'integrations',
    resource_id: session.user.id
  });
  return NextResponse.json({ ok: true });
}
