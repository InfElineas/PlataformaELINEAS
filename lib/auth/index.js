import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import Role from "@/lib/models/Role";
import UserRole from "@/lib/models/UserRole";
import AuditLog from "@/lib/models/AuditLog";
import {
  buildSessionPayload,
  applySessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
} from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { resolveUserAccess } from "@/lib/auth/access";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";

export { PERMISSIONS };

function serializeUser(user) {
  const id = user._id ? user._id.toString() : user.id;
  return {
    id,
    org_id: user.org_id,
    email: user.email,
    full_name: user.full_name,
    username: user.username,
    phone: user.phone || "",
    language: user.language || "es",
    timezone: user.timezone || "UTC",
    avatar_url: user.avatar_url || "",
    mfa_enabled: Boolean(user.mfa_enabled),
    is_active: Boolean(user.is_active),
    google_connected: Boolean(user.integrations?.google?.refresh_token),
    import_preferences: {
      default_structure: user.import_preferences?.default_structure || "header",
      replace_existing: user.import_preferences?.replace_existing ?? true,
    },
  };
}

export async function authenticateUser(identifier, password) {
  await connectDB();

  const query = identifier.includes("@")
    ? { email: identifier.toLowerCase() }
    : { username: identifier.toLowerCase() };

  const user = await User.findOne(query);
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (!user.is_active) {
    throw new ForbiddenError("User is inactive");
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    throw new UnauthorizedError("Invalid credentials");
  }

  user.last_login_at = new Date();
  await user.save();

  return user;
}

export async function createSessionResponse({
  user,
  rememberMe = false,
  request,
  response,
}) {
  const sessionData = await buildSessionPayload(user, { rememberMe });

  if (response) {
    applySessionCookie(response, sessionData.token, sessionData.maxAge);
  }

  await AuditLog.create({
    org_id: user.org_id,
    user_id: user._id,
    action: "auth.login",
    resource: "user",
    resource_id: user._id.toString(),
    ip: request?.headers.get("x-forwarded-for") || request?.ip || null,
    user_agent: request?.headers.get("user-agent") || null,
  });

  return {
    response,
    session: {
      user: serializeUser(user),
      permissions: sessionData.permissions,
      roleKeys: sessionData.roleKeys,
      rememberMe,
    },
  };
}

export async function destroySessionResponse({ user, response, request }) {
  if (response) {
    clearSessionCookie(response);
  }

  if (user) {
    await AuditLog.create({
      org_id: user.org_id,
      user_id: user.id || user._id,
      action: "auth.logout",
      resource: "user",
      resource_id: user.id || user._id?.toString(),
      ip: request?.headers.get("x-forwarded-for") || request?.ip || null,
      user_agent: request?.headers.get("user-agent") || null,
    });
  }

  return response;
}

export async function requirePermission(
  request,
  permission,
  { orgScoped = true } = {},
) {
  const session = getSessionFromRequest(request);

  if (!session.user) {
    throw new UnauthorizedError();
  }

  await connectDB();
  const user = await User.findById(session.user.id);

  if (!user || !user.is_active) {
    throw new UnauthorizedError();
  }

  const access = await resolveUserAccess(user._id, user.org_id);
  const isSuperAdmin = access.roleKeys.includes("superadmin");

  if (
    permission &&
    !isSuperAdmin &&
    !access.permissionKeys.includes(permission)
  ) {
    throw new ForbiddenError();
  }

  const overrideOrgId =
    request.headers.get("x-org-id") || request.headers.get("x-org");
  const orgId = isSuperAdmin && overrideOrgId ? overrideOrgId : user.org_id;

  if (orgScoped && !orgId) {
    throw new ForbiddenError("Organization scope required");
  }

  return {
    user: serializeUser(user),
    permissions: access.permissionKeys,
    roleKeys: access.roleKeys,
    orgId,
    isSuperAdmin,
    rememberMe: session.rememberMe,
  };
}

export async function registerUser({
  org_id,
  email,
  full_name,
  username,
  password,
  roles = [],
}) {
  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ForbiddenError("Email already registered");
  }

  const usernameExists = await User.findOne({
    username: username.toLowerCase(),
  });
  if (usernameExists) {
    throw new ForbiddenError("Username already in use");
  }

  const password_hash = await hashPassword(password);
  const user = await User.create({
    org_id,
    email: email.toLowerCase(),
    full_name,
    username: username.toLowerCase(),
    password_hash,
    is_active: true,
  });

  if (roles.length > 0) {
    const roleDocs = await resolveRolesByKeys(roles, org_id);
    await assignRolesToUser(user._id, roleDocs, org_id);
  }

  return user;
}

async function resolveRolesByKeys(roleKeys, orgId) {
  if (!roleKeys?.length) return [];
  const roles = await resolveRoles(roleKeys, orgId);
  if (roles.length !== roleKeys.length) {
    throw new ForbiddenError("One or more roles are invalid");
  }
  return roles;
}

async function resolveRoles(roleKeys, orgId) {
  const globalRoles = await Role.find({
    key: { $in: roleKeys },
    scope: "global",
  }).lean();
  const orgRoles = await Role.find({
    key: { $in: roleKeys },
    scope: "org",
    $or: [{ org_id: null }, { org_id: orgId }],
  }).lean();

  const map = new Map();
  [...globalRoles, ...orgRoles].forEach((role) => {
    map.set(role.key, role);
  });
  return [...map.values()];
}

async function assignRolesToUser(userId, roles, orgId) {
  const ops = roles.map((role) => ({
    updateOne: {
      filter: {
        user_id: userId,
        role_id: role._id,
        org_id: role.scope === "global" ? null : orgId,
      },
      update: {
        user_id: userId,
        role_id: role._id,
        org_id: role.scope === "global" ? null : orgId,
      },
      upsert: true,
    },
  }));

  if (ops.length) {
    await UserRole.bulkWrite(ops, { ordered: false });
  }
}

export async function updateUserRoles(userId, roles, orgId) {
  await connectDB();
  const roleDocs = await resolveRolesByKeys(roles, orgId);
  const UserRole = User.db.model("UserRole");

  await UserRole.deleteMany({
    user_id: userId,
    $or: [{ org_id: orgId }, { org_id: null }],
  });

  await assignRolesToUser(userId, roleDocs, orgId);
}

export async function logAuditEvent({
  org_id,
  user_id,
  action,
  resource,
  resource_id,
  meta,
  request,
}) {
  await AuditLog.create({
    org_id,
    user_id,
    action,
    resource,
    resource_id,
    meta,
    ip: request?.headers.get("x-forwarded-for") || request?.ip || null,
    user_agent: request?.headers.get("user-agent") || null,
  });
}

export function maskUserForResponse(user) {
  if (!user) return null;
  const serialized = serializeUser(user);
  delete serialized.is_active;
  return serialized;
}
