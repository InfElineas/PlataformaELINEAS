export const PERMISSIONS = {
  CATALOG_READ: 'catalog.read',
  CATALOG_WRITE: 'catalog.write',
  PRICES_READ: 'prices.read',
  PRICES_WRITE: 'prices.write',
  PRICES_PUBLISH: 'prices.publish',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_WRITE: 'inventory.write',
  INVENTORY_UTILS: 'inventory.utils',
  REPLENISHMENT_READ: 'replenishment.read',
  REPLENISHMENT_GENERATE: 'replenishment.generate',
  REPLENISHMENT_APPROVE: 'replenishment.approve',
  ORDERS_READ: 'orders.read',
  ORDERS_WRITE: 'orders.write',
  USERS_MANAGE: 'users.manage',
  SUPPORT_TOOLS: 'support.tools',
  REPORTS_READ: 'reports.read',
  REPORTS_EXPORT: 'reports.export',
  IMPORTS_MANAGE: 'imports.manage'
  REPORTS_EXPORT: 'reports.export'
};

export const DEFAULT_ROLE_DEFINITIONS = [
  {
    key: 'superadmin',
    name: 'Super Administrator',
    description: 'Global administrator with unrestricted access',
    scope: 'global',
    permissions: Object.values(PERMISSIONS)
  },
  {
    key: 'org_admin',
    name: 'Organization Administrator',
    description: 'Manages users and catalog within their organization',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.CATALOG_WRITE,
      PERMISSIONS.PRICES_READ,
      PERMISSIONS.PRICES_WRITE,
      PERMISSIONS.PRICES_PUBLISH,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.INVENTORY_UTILS,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.REPLENISHMENT_GENERATE,
      PERMISSIONS.REPLENISHMENT_APPROVE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.IMPORTS_MANAGE,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_EXPORT
    ]
  },
  {
    key: 'manager_ops',
    name: 'Operations Manager',
    description: 'Leads warehouse operations and inventory accuracy',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.INVENTORY_UTILS,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.REPLENISHMENT_GENERATE,
      PERMISSIONS.REPLENISHMENT_APPROVE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.IMPORTS_MANAGE,
      PERMISSIONS.REPORTS_READ
    ]
  },
  {
    key: 'manager_commercial',
    name: 'Commercial Manager',
    description: 'Owns catalog and pricing decisions',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.CATALOG_WRITE,
      PERMISSIONS.PRICES_READ,
      PERMISSIONS.PRICES_WRITE,
      PERMISSIONS.PRICES_PUBLISH,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.IMPORTS_MANAGE,
      PERMISSIONS.REPORTS_READ
    ]
  },
  {
    key: 'auditor',
    name: 'Auditor',
    description: 'Read-only with access to exports',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.PRICES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_EXPORT
    ]
  },
  {
    key: 'support',
    name: 'Support Engineer',
    description: 'Support tooling without pricing control',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.PRICES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_UTILS,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.REPLENISHMENT_GENERATE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.SUPPORT_TOOLS,
      PERMISSIONS.IMPORTS_MANAGE,
      PERMISSIONS.REPORTS_READ
    ]
  },
  {
    key: 'operador',
    name: 'Operator',
    description: 'Executes day-to-day inventory movements',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.PRICES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.REPLENISHMENT_GENERATE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.REPORTS_READ
    ]
  },
  {
    key: 'read_only',
    name: 'Read Only',
    description: 'Read-only observer',
    scope: 'org',
    permissions: [
      PERMISSIONS.CATALOG_READ,
      PERMISSIONS.PRICES_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.REPLENISHMENT_READ,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.REPORTS_READ
    ]
  }
];
