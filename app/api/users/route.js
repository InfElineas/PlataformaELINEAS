import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  requirePermission,
  registerUser,
  logAuditEvent,
  PERMISSIONS,
} from "@/lib/auth";

function mapUser(user) {
  return {
    id: user._id.toString(),
    org_id: user.org_id,
    email: user.email,
    full_name: user.full_name,
    username: user.username,
    phone: user.phone || "",
    language: user.language || "es",
    timezone: user.timezone || "UTC",
    avatar_url: user.avatar_url || "",
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function GET(request) {
  try {
    const context = await requirePermission(request, PERMISSIONS.USERS_MANAGE);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get("org_id");
    const filter = context.isSuperAdmin
      ? orgIdParam
        ? { org_id: orgIdParam }
        : {}
      : { org_id: context.orgId };

    const users = await User.find(filter).sort({ created_at: -1 }).lean();

    return NextResponse.json({
      data: users.map(mapUser),
      total: users.length,
    });
  } catch (error) {
    console.error("List users error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to list users" },
      { status },
    );
  }
}

export async function POST(request) {
  try {
    const context = await requirePermission(request, PERMISSIONS.USERS_MANAGE);
    const body = await request.json();

    const orgId =
      context.isSuperAdmin && body.org_id ? body.org_id : context.orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 },
      );
    }

    if (!body.email || !body.full_name || !body.username || !body.password) {
      return NextResponse.json(
        { error: "email, full_name, username and password are required" },
        { status: 400 },
      );
    }

    const user = await registerUser({
      org_id: orgId,
      email: body.email,
      full_name: body.full_name,
      username: body.username,
      password: body.password,
      roles: body.roles || [],
    });

    if (
      body.phone ||
      body.language ||
      body.timezone ||
      body.avatar_url ||
      body.is_active === false
    ) {
      Object.assign(user, {
        phone: body.phone ?? user.phone,
        language: body.language ?? user.language,
        timezone: body.timezone ?? user.timezone,
        avatar_url: body.avatar_url ?? user.avatar_url,
        is_active: body.is_active ?? true,
      });
      await user.save();
    }

    await logAuditEvent({
      org_id: orgId,
      user_id: context.user.id,
      action: "user.create",
      resource: "user",
      resource_id: user._id.toString(),
      meta: { roles: body.roles || [] },
      request,
    });

    return NextResponse.json({ user: mapUser(user) }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status },
    );
  }
}
