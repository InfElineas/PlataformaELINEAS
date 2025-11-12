import { NextResponse } from 'next/server';
import { authenticateUser, createSessionResponse, maskUserForResponse } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/errors';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = (body.email || body.username || body.identifier || '').trim().toLowerCase();
    const password = body.password || '';
    const rememberMe = Boolean(body.rememberMe);

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username and password are required' }, { status: 400 });
    }

    const user = await authenticateUser(identifier, password);
    const response = NextResponse.json({
      user: maskUserForResponse(user)
    });

    const { session } = await createSessionResponse({
      user,
      rememberMe,
      request,
      response
    });

    response.headers.set('x-user-org', session.user.org_id);
    response.headers.set('x-user-roles', session.roleKeys.join(','));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Unexpected error during login' }, { status: 500 });
  }
}
