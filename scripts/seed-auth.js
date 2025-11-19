import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../lib/mongodb.js';
import Permission from '../lib/models/Permission.js';
import Role from '../lib/models/Role.js';
import RolePermission from '../lib/models/RolePermission.js';
import User from '../lib/models/User.js';
import UserRole from '../lib/models/UserRole.js';
import { DEFAULT_ROLE_DEFINITIONS, PERMISSIONS } from '../lib/auth/permissions.js';
import { hashPassword } from '../lib/auth/password.js';

const DEFAULT_ORG_ID = process.env.ORG_ID_DEFAULT || 'ELINEAS';
const SUPERADMIN_EMAIL = process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@example.com';
const SUPERADMIN_PASSWORD = process.env.DEFAULT_SUPERADMIN_PASSWORD || 'ChangeMeNow!2025';
const SUPERADMIN_NAME = process.env.DEFAULT_SUPERADMIN_NAME || 'Super Admin';
const SUPERADMIN_USERNAME = process.env.DEFAULT_SUPERADMIN_USERNAME || 'superadmin';
const IMPORT_TEST_EMAIL = process.env.IMPORT_TEST_EMAIL || 'imports_tester@example.com';
const IMPORT_TEST_PASSWORD = process.env.IMPORT_TEST_PASSWORD || 'ImportameEsto!2025';
const IMPORT_TEST_NAME = process.env.IMPORT_TEST_NAME || 'Tester Importaciones';
const IMPORT_TEST_USERNAME = process.env.IMPORT_TEST_USERNAME || 'imports.tester';

async function upsertPermissions() {
  console.log('🔐 Seeding permissions...');
  for (const key of Object.values(PERMISSIONS)) {
    await Permission.updateOne(
      { key },
      { key, name: key, description: key },
      { upsert: true }
    );
  }
}

async function upsertRoles() {
  console.log('🧩 Seeding roles...');
  for (const roleDef of DEFAULT_ROLE_DEFINITIONS) {
    const filter = roleDef.scope === 'global'
      ? { key: roleDef.key, scope: 'global' }
      : { key: roleDef.key, scope: 'org', org_id: DEFAULT_ORG_ID };

    const role = await Role.findOneAndUpdate(
      filter,
      {
        ...filter,
        name: roleDef.name,
        description: roleDef.description
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const permissions = await Permission.find({ key: { $in: roleDef.permissions } });

    const ops = permissions.map((permission) => ({
      updateOne: {
        filter: { role_id: role._id, permission_id: permission._id },
        update: {
          role_id: role._id,
          permission_id: permission._id
        },
        upsert: true
      }
    }));

    if (ops.length) {
      await RolePermission.bulkWrite(ops, { ordered: false });
    }
  }
}

async function ensureSuperAdmin() {
  console.log('👤 Ensuring superadmin account...');
  let user = await User.findOne({ email: SUPERADMIN_EMAIL.toLowerCase() });

  if (!user) {
    const password_hash = await hashPassword(SUPERADMIN_PASSWORD);
    user = await User.create({
      org_id: DEFAULT_ORG_ID,
      email: SUPERADMIN_EMAIL.toLowerCase(),
      full_name: SUPERADMIN_NAME,
      username: SUPERADMIN_USERNAME.toLowerCase(),
      password_hash,
      email_verified_at: new Date(),
      is_active: true
    });
    console.log(`✅ Created superadmin user ${SUPERADMIN_EMAIL}`);
  } else {
    console.log('ℹ️ Superadmin user already exists, updating baseline fields...');
    user.full_name = SUPERADMIN_NAME;
    user.username = SUPERADMIN_USERNAME.toLowerCase();
    if (!SUPERADMIN_PASSWORD.startsWith('**unchanged**')) {
      user.password_hash = await hashPassword(SUPERADMIN_PASSWORD);
    }
    await user.save();
  }

  const role = await Role.findOne({ key: 'superadmin', scope: 'global' });
  if (!role) {
    throw new Error('Superadmin role missing');
  }

  await UserRole.updateOne(
    { user_id: user._id, role_id: role._id, org_id: null },
    { user_id: user._id, role_id: role._id, org_id: null },
    { upsert: true }
  );

  const orgAdminRole = await Role.findOne({ key: 'org_admin', scope: 'org', org_id: DEFAULT_ORG_ID });
  if (orgAdminRole) {
    await UserRole.updateOne(
      { user_id: user._id, role_id: orgAdminRole._id, org_id: DEFAULT_ORG_ID },
      { user_id: user._id, role_id: orgAdminRole._id, org_id: DEFAULT_ORG_ID },
      { upsert: true }
    );
  }
}

async function ensureImportsTester() {
  console.log('👤 Ensuring imports tester account...');
  let user = await User.findOne({ email: IMPORT_TEST_EMAIL.toLowerCase() });

  if (!user) {
    const password_hash = await hashPassword(IMPORT_TEST_PASSWORD);
    user = await User.create({
      org_id: DEFAULT_ORG_ID,
      email: IMPORT_TEST_EMAIL.toLowerCase(),
      full_name: IMPORT_TEST_NAME,
      username: IMPORT_TEST_USERNAME.toLowerCase(),
      password_hash,
      email_verified_at: new Date(),
      is_active: true
    });
    console.log(`✅ Created imports tester user ${IMPORT_TEST_EMAIL}`);
  } else {
    console.log('ℹ️ Imports tester user already exists, updating baseline fields...');
    user.full_name = IMPORT_TEST_NAME;
    user.username = IMPORT_TEST_USERNAME.toLowerCase();
    if (!IMPORT_TEST_PASSWORD.startsWith('**unchanged**')) {
      user.password_hash = await hashPassword(IMPORT_TEST_PASSWORD);
    }
    await user.save();
  }

  const opsRole = await Role.findOne({ key: 'manager_ops', scope: 'org', org_id: DEFAULT_ORG_ID });
  if (!opsRole) {
    throw new Error('Operations manager role missing');
  }

  await UserRole.updateOne(
    { user_id: user._id, role_id: opsRole._id, org_id: DEFAULT_ORG_ID },
    { user_id: user._id, role_id: opsRole._id, org_id: DEFAULT_ORG_ID },
    { upsert: true }
  );
}

async function seedAuth() {
  await connectDB();
  await upsertPermissions();
  await upsertRoles();
  await ensureSuperAdmin();
  await ensureImportsTester();
  console.log('✅ Auth seeding completed');
  process.exit(0);
}

seedAuth().catch((error) => {
  console.error('❌ Auth seeding failed', error);
  process.exit(1);
});
