import connectDB from '@/lib/mongodb';
import Role from '@/lib/models/Role';
import Permission from '@/lib/models/Permission';
import RolePermission from '@/lib/models/RolePermission';
import UserRole from '@/lib/models/UserRole';

export async function resolveUserAccess(userId, orgId) {
  await connectDB();

  const userRoles = await UserRole.find({
    user_id: userId,
    $or: [
      { org_id: null },
      { org_id: orgId }
    ]
  }).lean();

  if (userRoles.length === 0) {
    return { roleKeys: [], permissionKeys: [] };
  }

  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await Role.find({ _id: { $in: roleIds } }).lean();
  const roleMap = new Map(roles.map((role) => [role._id.toString(), role]));
  const roleKeys = roles.map((role) => role.key);

  const rolePermissions = await RolePermission.find({ role_id: { $in: roleIds } }).lean();
  const permissionIds = rolePermissions.map((rp) => rp.permission_id);
  const permissions = await Permission.find({ _id: { $in: permissionIds } }).lean();
  const permissionKeys = [...new Set(permissions.map((permission) => permission.key))];

  return { roleKeys, permissionKeys, roleMap };
}

export function hasPermission({ permissionKeys, roleKeys }, permission) {
  if (!permission) return true;
  if (roleKeys?.includes('superadmin')) return true;
  return permissionKeys?.includes(permission);
}
