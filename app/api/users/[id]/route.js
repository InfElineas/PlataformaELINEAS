import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import UserRole from "@/lib/models/UserRole";
import Role from "@/lib/models/Role";
import {
  requirePermission,
  updateUserRoles,
  logAuditEvent,
  PERMISSIONS,
} from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";

function serializeUser(user, roles = []) {
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
    roles,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

async function getUserRoles(userId) {
  const assignments = await UserRole.find({ user_id: userId }).lean();
  if (assignments.length === 0) return [];
  const roleIds = assignments.map((assignment) => assignment.role_id);
  const roles = await Role.find({ _id: { $in: roleIds } }).lean();
  return roles.map((role) => role.key);
}

export async function GET(request, { params }) {
  try {
    const context = await requirePermission(request, PERMISSIONS.USERS_MANAGE);
    await connectDB();

    const user = await User.findById(params.id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!context.isSuperAdmin && user.org_id !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roles = await getUserRoles(user._id);
    return NextResponse.json({ user: serializeUser(user, roles) });
  } catch (error) {
    console.error("Get user error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to load user" },
      { status },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const context = await requirePermission(request, PERMISSIONS.USERS_MANAGE);
    const body = await request.json();

    await connectDB();
    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!context.isSuperAdmin && user.org_id !== context.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.email && body.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: body.email.toLowerCase() });
      if (existing) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 },
        );
      }
      user.email = body.email.toLowerCase();
    }

    if (body.username && body.username.toLowerCase() !== user.username) {
      const existingUsername = await User.findOne({
        username: body.username.toLowerCase(),
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: "Username already in use" },
          { status: 409 },
        );
      }
      user.username = body.username.toLowerCase();
    }

    if (body.full_name) user.full_name = body.full_name;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.language) user.language = body.language;
    if (body.timezone) user.timezone = body.timezone;
    if (body.avatar_url !== undefined) user.avatar_url = body.avatar_url;
    if (typeof body.is_active === "boolean") user.is_active = body.is_active;

    if (body.password) {
      user.password_hash = await hashPassword(body.password);
    }

    if (context.isSuperAdmin && body.org_id) {
      user.org_id = body.org_id;
    }

    await user.save();

    if (Array.isArray(body.roles)) {
      const targetOrg = context.isSuperAdmin
        ? body.org_id || user.org_id
        : context.orgId;
      await updateUserRoles(user._id, body.roles, targetOrg);
    }

    const roles = await getUserRoles(user._id);

    await logAuditEvent({
      org_id: user.org_id,
      user_id: context.user.id,
      action: "user.update",
      resource: "user",
      resource_id: user._id.toString(),
      meta: { roles },
      request,
    });

    return NextResponse.json({ user: serializeUser(user, roles) });
  } catch (error) {
    console.error("Update user error:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status },
    );
  }
}
