import { NextResponse } from "next/server";
import { destroySessionResponse, maskUserForResponse } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function POST(request) {
  const session = getSessionFromRequest(request);
  const response = NextResponse.json({
    success: true,
    user: maskUserForResponse(session.user),
  });
  await destroySessionResponse({ user: session.user, response, request });
  return response;
}
