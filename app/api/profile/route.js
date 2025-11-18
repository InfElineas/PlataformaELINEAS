import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { requirePermission, logAuditEvent } from '@/lib/auth';
import { buildSessionPayload, applySessionCookie } from '@/lib/auth/session';

function sanitizeProfileBody(body) {
  const allowedFields = ['full_name', 'phone', 'language', 'timezone', 'avatar_url'];
  return Object.fromEntries(
    Object.entries(body)
      .filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
  );
}

export async function GET(request) {
  try {
    const context = await requirePermission(request, null, { orgScoped: false });
    await connectDB();
    const user = await User.findById(context.user.id).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user: { ...context.user, ...sanitizeProfileBody(user) } });
  } catch (error) {
    console.error('Profile GET error:', error);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to load profile' }, { status });
  }
}

export async function PUT(request) {
  try {
    const context = await requirePermission(request, null, { orgScoped: false });
    const body = await request.json();
    const updates = sanitizeProfileBody(body);

    await connectDB();
    const user = await User.findById(context.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    Object.assign(user, updates);
    await user.save();

    const response = NextResponse.json({
      user: {
        ...context.user,
        ...updates
      }
    });

    const sessionData = await buildSessionPayload(user, { rememberMe: context.rememberMe });
    applySessionCookie(response, sessionData.token, sessionData.maxAge);

    await logAuditEvent({
      org_id: user.org_id,
      user_id: user._id,
      action: 'profile.update',
      resource: 'user',
      resource_id: user._id.toString(),
      meta: { fields: Object.keys(updates) },
      request
    });

    return response;
  } catch (error) {
    console.error('Profile update error:', error);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status });
  }
}
