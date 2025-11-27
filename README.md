# ELÍNEAS - Plataforma de inventario y reabastecimiento

Sistema inteligente de gestión de inventario y reabastecimiento con motor de cálculo avanzado basado en demanda, estacionalidad y reglas configurables.

## 🚀 Features

### Core Business Logic

- **Intelligent Replenishment Engine**: Cálculo automático de cantidades de reabastecimiento basado en:
  - Stock actual vs. target stock
  - Demanda diaria promedio (calculada de snapshots históricos)
  - Days of cover + lead time
  - Factores de estacionalidad (San Valentín, Día de las Madres, Navidad)
  - MOQ (Minimum Order Quantity) y pack size
  - Safety stock y service level
  - Max/min stock limits

- **Hierarchical Rules System**: Configuración flexible con jerarquía:
  - Global (organización)
  - Por tienda
  - Por categoría
  - Por producto específico
- **Multi-Store Management**: Gestión de múltiples tiendas y bodegas
- **Purchase Order Generation**: Agrupa recomendaciones por proveedor automáticamente
- **Historical Inventory Tracking**: 30+ días de snapshots de inventario seeded

### Technical Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Mongoose ODM
- **Database**: MongoDB (local o Atlas)
- **Auth**: Sesiones HTTP-only con RBAC multi-tenant (roles dinámicos y permisos por organización)
- **Multitenancy**: org_id filtrado en todas las queries
- **Importaciones inteligentes**: Carga masiva desde archivos .xlsx o Google Sheets con validaciones y historial

### Roles iniciales

- `superadmin`: acceso global, gestiona roles y organizaciones
- `org_admin`: administra usuarios, catálogos y reglas dentro de su organización
- `manager_ops`: operaciones de inventario, generación/aprobación de planes y órdenes
- `manager_commercial`: catálogo y listas de precios
- `support`: herramientas de soporte e inventario utilitario
- `auditor`: acceso de solo lectura con exportaciones
- `operador`: movimientos operativos básicos
- `read_only`: observador sin permisos de escritura

## 📦 Installation

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- Yarn

### Quick Start

1. **Install dependencies**:

```bash
yarn install
```

2. **Configure environment**:

```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=inventory_replenishment_db
ORG_ID_DEFAULT=ELINEAS
JWT_SECRET=change-me-super-secret
ALLOWED_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=12
DEFAULT_SUPERADMIN_EMAIL=superadmin@example.com
DEFAULT_SUPERADMIN_PASSWORD=ChangeMeNow!2025
GOOGLE_SERVICE_ACCOUNT_JSON_INLINE='{"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n..."}'
GOOGLE_OAUTH_CLIENT_ID=your-oauth-client.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-oauth-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/google/oauth/callback
```

3. **Seed database y roles**:

```bash
npm run seed
npm run seed:auth
```

Esto crea:

- ✅ 8 categorías (flores, arreglos, accesorios con subcategorías)
- ✅ 3 tiendas (1 bodega + 2 tiendas retail)
- ✅ 5 proveedores
- ✅ 50 productos
- ✅ 4,650 inventory snapshots (50 productos × 3 tiendas × 31 días)
- ✅ 50 price lists
- ✅ 3 replenishment rules (global + por categoría + por tienda)
- ✅ Roles/Permisos base y usuario superadmin (credenciales arriba)

4. **Start development server**:

```bash
npm run dev
```

App disponible en: https://stockflow-295.preview.emergentagent.com (ruta de login: `/login`)

## 📥 Importaciones de productos

El módulo de importaciones permite poblar el catálogo sin depender de `seed.js`.

### Fuentes soportadas

- **Archivos .xlsx locales**: se suben desde `/imports`, se convierten mediante Google Drive y se procesan con validaciones estrictas.
- **Google Sheets**: puedes importar una hoja puntual o todo el spreadsheet (concatenando todas las hojas).
- **OAuth opcional**: los usuarios pueden vincular su cuenta de Google para acceder a documentos privados; por defecto se usa el service account definido en las variables de entorno.

### Flujo backend

1. `POST /api/imports/products/upload` recibe un `FormData` con el archivo `.xlsx`.
2. El archivo se sube temporalmente a Google Drive (`drive.file`), se convierte a spreadsheet y se lee vía `sheets.values`.
3. `importProductsFromValues` normaliza columnas obligatorias (`Categoría Online`, `Cód. Prod.`, `Precio`, etc.), convierte tipos y aborta si hay errores.
4. Se realiza `upsert` en `products` (respetando `replaceExisting`), se registra la acción en `imports` y se genera un `AuditLog`.
5. `GET /api/imports/history` devuelve el historial multi-tenant integrable en reportes.

### Configuración requerida

- **Service Account**: define `GOOGLE_SERVICE_ACCOUNT_JSON_INLINE` o combina `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Este usuario necesita `drive.file` y `sheets.readonly`.
- **OAuth cliente**: define `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` y `GOOGLE_OAUTH_REDIRECT_URI` si quieres que cada usuario conecte su propio Drive (beneficios: acceso a archivos privados sin compartirlos con TI, auditoría por usuario, revocación inmediata desde la UI).
- **Permiso RBAC**: sólo roles con `imports.manage` (superadmin, org_admin, manager_ops, manager_commercial, support) pueden usar `/imports`.

### UI `/imports`

- Selector de archivo .xlsx con opciones de reemplazo, detección de encabezados y modo OAuth.
- Importación directa desde Google Sheets: listado de hojas, modo "single" o "all" y switch para OAuth.
- Estado de vinculación de Google y botón para conectar/desconectar.
- Estadísticas (filas procesadas, insertados, actualizados, duplicados) + preview de las primeras filas.
- Historial con resumen por lote y badges de resultados.

## 🎯 Usage

### 1. Dashboard

- Vista general del sistema
- KPIs: Total productos, tiendas, low stock items, pending POs
- Quick start guide

### 2. Products

- Lista completa de productos
- Búsqueda y filtros
- Categorización por tipo

### 3. Inventory

- Consultar snapshots de inventario por:
  - Tienda
  - Fecha
  - Producto
- Ver stock físico, unidades, cajas, precios

### 4. Replenishment Planner (⭐ CORE FEATURE)

**El "Aha Moment" del sistema**

1. Seleccionar tienda y fecha
2. Click "Generate Plan"
3. El motor calcula:
   - Current stock (de último snapshot)
   - Target stock = (days_of_cover + lead_time) × avg_demand × seasonality + safety_stock
   - Recommended qty = max(0, target - current)
   - Aplica pack_size rounding y MOQ
   - Aplica max_stock cap

4. Resultado: Tabla con recomendaciones mostrando:
   - Current Stock
   - Target Stock
   - Avg Daily Demand
   - Days of Cover
   - Seasonality Factor
   - **Recommended Qty** (bold, en color primary)

5. Click "Approve Plan" cuando esté listo

6. Click "Create Purchase Orders" para convertir en POs

### 5. Purchase Orders

- Lista de POs generados
- Agrupados automáticamente por proveedor
- Ver líneas de cada PO

## 🧮 Replenishment Algorithm

```javascript
// 1. Resolve Rules (product > category > store > global)
const rules = await resolveRules(orgId, storeId, categoryId, productId);

// 2. Calculate Average Daily Demand
const demand = computeAvgDailyDemand(productId, storeId, windowDays, planDate);

// 3. Get Seasonality Multiplier
const seasonality = currentSeasonalityMultiplier(planDate, rules.seasonality);
// Examples: Feb 14 = 1.5x, Mother's Day = 1.8x, Nov-Dec = 1.4x

// 4. Calculate Target Stock
const target = Math.ceil(
  (rules.days_of_cover + rules.lead_time_days) * demand * seasonality +
    rules.safety_stock,
);
target = Math.max(target, rules.min_stock || 0);

// 5. Get Current Stock
const current = getOnHand(productId, storeId, planDate);

// 6. Calculate Recommendation
let recommended = Math.max(0, target - current);

// 7. Apply Pack Size Rounding
if (recommended > 0) {
  recommended = Math.ceil(recommended / rules.pack_size) * rules.pack_size;
}

// 8. Apply MOQ
if (rules.moq && recommended > 0) {
  recommended = Math.max(recommended, rules.moq);
}

// 9. Apply Max Stock Cap
if (rules.max_stock) {
  const maxBuy = Math.max(0, rules.max_stock - current);
  recommended = Math.min(recommended, maxBuy);
}

// 10. Zero out inactive products
if (product.status !== "active") {
  recommended = 0;
}
```

## 🗄️ Database Schema

### Collections

- **products**: Catálogo con org_id, product_code, category_id, supplier_id
- **categories**: Árbol jerárquico con path denormalizado
- **stores**: Tiendas y bodegas (is_shop flag)
- **suppliers**: Proveedores con aliases
- **inventory_snapshots**: Snapshots diarios de stock por tienda/producto
- **price_lists**: Histórico de precios con valid_from
- **replenishment_rules**: Configuración jerárquica de reglas
- **replenishment_plans**: Planes generados (draft → approved → converted_to_po)
- **purchase_orders**: POs con lines agrupadas por proveedor

### Key Indexes

```javascript
// Products
{ org_id: 1, product_code: 1 } // unique
{ org_id: 1, category_id: 1 }
{ org_id: 1, status: 1 }

// Inventory Snapshots
{ org_id: 1, date: 1, store_id: 1 }
{ org_id: 1, product_id: 1, date: 1 }

// Replenishment Plans
{ org_id: 1, plan_date: 1, store_id: 1 }
{ org_id: 1, status: 1 }
```

## 🔧 API Endpoints

### Products

- `GET /api/products?search=&status=&category=&page=&limit=`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Stores

- `GET /api/stores`
- `POST /api/stores`

### Suppliers

- `GET /api/suppliers`

### Categories

- `GET /api/categories`

### Inventory

- `GET /api/inventory?date=&store_id=&product_id=`

### Replenishment

- `POST /api/replenishment/plan` - Generate plan
  ```json
  { "plan_date": "2025-01-10", "store_id": "xxx" }
  ```
- `GET /api/replenishment/plans?store_id=&status=&plan_date=`
- `POST /api/replenishment/plans/:id/approve`

### Purchase Orders

- `POST /api/purchase-orders/from-plan`
  ```json
  { "plan_date": "2025-01-10", "store_id": "xxx" }
  ```
- `GET /api/purchase-orders?status=`
- `GET /api/purchase-orders/:id`

### Rules (Admin)

- `GET /api/rules`
- `POST /api/rules`
- `PUT /api/rules/:id`
- `DELETE /api/rules/:id`

## 🧪 Testing

### Test Replenishment Engine

```bash
# Generate plan for Bodega Central
curl -X POST http://localhost:3000/api/replenishment/plan \
  -H "Content-Type: application/json" \
  -d '{"plan_date": "2025-01-10", "store_id": "YOUR_STORE_ID"}'

# View generated plan
curl http://localhost:3000/api/replenishment/plans?plan_date=2025-01-10

# Approve plan
curl -X POST http://localhost:3000/api/replenishment/plans/PLAN_ID/approve

# Create POs
curl -X POST http://localhost:3000/api/purchase-orders/from-plan \
  -H "Content-Type: application/json" \
  -d '{"plan_date": "2025-01-10", "store_id": "YOUR_STORE_ID"}'

# View POs
curl http://localhost:3000/api/purchase-orders
```

## 📊 Example Results

From seed data:

- **Total Items**: 50 products
- **Items to Restock**: ~48 items
- **Total Recommended Qty**: ~8,264 units
- **Purchase Orders Created**: 5 (grouped by supplier)

Sample calculations:

```
Product: Rosa Roja Premium
- Current Stock: 58
- Target Stock: 396 (7 days cover + 3 days lead time)
- Avg Daily Demand: 38.6
- Seasonality: 1.00x (normal period)
- Pack Size: 25
- Recommended Qty: 338 (rounded to pack size)
```

## 🔐 Security & Multi-tenancy

- All queries filtered by `org_id` (ELINEAS)
- Compound indexes on org_id for performance
- JWT auth (toggleable con AUTH_DISABLED flag)
- CORS configured
- Input validation with Zod (TODO: implement full validation)

## 📈 Performance

- P95 target: < 200ms for simple reads, < 500ms for filtered lists
- Pagination mandatory (default 50-100 items)
- Lean queries for read-only operations
- Connection pooling con Mongoose

## 🚧 Roadmap

### Sprint 2 (Next)

- [ ] UI para CRUD de replenishment rules
- [ ] Dashboard con KPIs reales (rotación, rupturas, fill rate)
- [ ] Simulador de escenarios (what-if analysis)
- [ ] Exportación de planes a Excel/CSV

### Sprint 3 (Future)

- [ ] Pronóstico con modelos estadísticos (media móvil, ETS)
- [ ] Alertas automáticas (low stock, overstock)
- [ ] Webhooks a proveedores
- [ ] Integración con ERP

## 📝 Development Notes

### Code Structure

```
/app
├── app/
│   ├── api/[[...path]]/route.js  # All API endpoints
│   ├── layout.js                 # Root layout with sidebar
│   ├── page.js                   # Dashboard
│   ├── products/page.js
│   ├── inventory/page.js
│   ├── replenishment/page.js     # ⭐ Core feature
│   └── purchase-orders/page.js
├── components/
│   ├── Sidebar.jsx
│   └── ui/                       # shadcn components
├── lib/
│   ├── mongodb.js                # DB connection
│   ├── auth.js                   # JWT utilities
│   ├── replenishment-engine.js   # ⭐ Core algorithm
│   └── models/                   # Mongoose schemas
└── scripts/
    └── seed.js                   # Data seeding
```

### Best Practices Implemented

- ✅ DRY: Reusable DataTable, Forms, Cards
- ✅ SOLID light: Single responsibility components
- ✅ Type safety: Mongoose schemas + Zod validation (partially)
- ✅ Error handling: Try-catch + user-friendly messages
- ✅ Performance: Indexes, lean queries, pagination
- ✅ Operability: Logs estructurados, seed script, clear API

## 🤝 Contributing

### Commit Convention

```
feat: Add inventory snapshot upload
fix: Correct seasonality multiplier calculation
refactor: Extract replenishment rules to separate service
docs: Update API documentation
```

## 📄 License

MIT

## 🎉 Acknowledgments

Built for ELINEAS - Sistema robusto de reabastecimiento inteligente con algoritmos de clase enterprise.

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Org**: ELÍNEAS
