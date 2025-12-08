# Changelog

## Ajustes visuales de inventario (actual)
- `app/(app)/inventory/page.js`: las columnas de existencia física, reserva y disponible en tienda ahora se muestran en solo lectura con formato numérico consistente (igual a la vista de productos) y sin inputs redundantes.

## Ajustes responsivos y densidad tipográfica
- `app/globals.css`: se redujo ligeramente el tamaño base de fuente y se evitó el scroll horizontal global para mejorar la lectura en pantallas pequeñas.
- `components/Sidebar.jsx`: el panel lateral se colapsa automáticamente en pantallas estrechas, conserva la transición suave y aplica un contenedor centralizado para el contenido.
- `app/(app)/products/page.js` y `app/(app)/inventory/page.js`: se añadieron contenedores fluidos, bordes y anchos mínimos responsivos para las tablas, reduciendo el uso de espacio horizontal sin perder datos clave.
- `app/(app)/page.js`: titulares y tarjetas ajustan el espaciado y tipografía para adaptarse mejor a vistas móviles y de escritorio.

## Previsualización de productos e inventario completo (actual)
- `app/(app)/products/page.js`: tooltip enriquecido en el nombre del producto con imagen, códigos, proveedor, almacén e inventario; alias de inventario ampliados (incluyendo metadata.*) para evitar mostrar 0 cuando existen valores importados.
- `app/(app)/inventory/page.js`: los alias de EF/Reserva/Tienda también leen rutas metadata.* y rutas anidadas para mantener coherencia con la vista de productos.

## Normalización de inventario y estado global persistente
- API y vistas reutilizan el mismo set de alias de inventario (EF/Reserva/Tienda) para leer valores desde documento o metadata y evitar que se muestren 0 cuando hay datos.
- `hooks/useProductFilters.js`: el estado global de filtros ahora guarda también el orden seleccionado (`sortBy/sortDir`) en localStorage para mantener el mismo ordenamiento al navegar o recargar.
- `app/(app)/products/page.js`: se reutiliza el orden global persistido, se leen campos de almacén y proveedores desde metadata cuando faltan en el documento principal y se priorizan cadenas/números reales antes de mostrar "—".
- `app/api/[[...path]]/route.js`: la respuesta de productos normaliza `no_almacen`, `warehouse_code` y `warehouse_name` combinando datos principales y metadata para no perder el número de almacén al calcular existencias, reservas y disponibles.
- `app/(app)/inventory/page.js`: la vista de inventario recupera el número/nombre de almacén desde metadata cuando es el único lugar donde existe.

## Correcciones de filtros y ordenamiento global
- `app/(app)/products/page.js`: se corrigieron referencias de filtros aplicados, se agregaron cabeceras ordenables que actualizan la consulta global y se mostraron indicadores de orden por columna.
- `app/api/[[...path]]/route.js`: el listado de productos acepta `sortBy/sortDir` seguros para ordenar desde cualquier encabezado visible, manteniendo un desempate por fecha de creación.

## Valores de inventario coherentes en vistas y API
- `lib/models/Product.js`: los campos base de inventario ahora usan `existencia_fisica`, `reserva` y `disponible_tienda` como caminos primarios con alias hacia los nombres previos en inglés.
- `app/api/[[...path]]/route.js`: el filtrado por existencia acepta documentos antiguos y nuevos, y la normalización numérica maneja miles y decimales mixtos.
- `app/(app)/products/page.js`: la conversión numérica reconoce comas y puntos en cualquier orden y considera valores guardados en metadata para mostrar EF/A/T reales.
- `app/(app)/inventory/page.js`: las lecturas de inventario usan el mismo normalizador robusto y contemplan metadata para no descartar cantidades válidas.

## Inventario importado correctamente
- `lib/imports/constants.js`: se actualizó la plantilla de encabezados y los alias para reconocer variaciones con acentos, abreviaturas y puntos.
- `lib/imports/utils.js`: el resolvedor de campos acepta también los nombres canónicos normalizados para mapear encabezados dinámicos.
- `lib/imports/parser.js`: se alinearon los mapeos de columnas con `existencia_fisica`, `reserva`, `disponible_tienda` y `Alm.` como número/nombre de almacén, incluyendo validaciones en español.
- `lib/imports/products.js`: `buildProductDocument()` ahora consume los campos normalizados y persiste existencias, reservas y almacenes en los lugares correctos.
- `lib/models/Product.js`: se estandarizaron los campos de inventario en español con alias para nombres previos y se evitó la duplicidad de datos.
- `app/api/imports/products/google/route.js`: mensajes de error inesperado en español y consistentes con el flujo de importación.

## Filtros globales de inventario
- `app/api/[[...path]]/route.js`: el handler de productos acepta filtros por existencia, almacén, suministrador, marca y estado de activación, además de respetar el parámetro `perPage`.
- `app/(app)/inventory/page.js`: la vista de inventario usa filtros globales (existencia, almacén y suministrador) en vez de fecha o snapshot local, consultando directamente los productos de la base de datos.

## Filtros globales con estado de tienda
- `hooks/useProductFilters.js`: se añadió `estado_tienda` como filtro global compartido.
- `app/api/[[...path]]/route.js`: la ruta de productos acepta `estado_tienda`, consolida el valor desde documento/metadata y expone opciones distintas en la metadata de filtros.
- `app/(app)/products/page.js` y `app/(app)/inventory/page.js`: ambos consumen el filtro de estado en tienda desde el proveedor global y muestran las opciones derivadas de los datos cargados.

## Correcciones de inventario visibles
- `app/api/[[...path]]/route.js`: la respuesta incluye valores virtuales de inventario y metadatos globales de filtros (almacenes, proveedores y marcas) para no limitar los selectores a los ítems paginados.
- `app/(app)/inventory/page.js`: los filtros globales se alimentan con las listas completas desde la API, los nombres de producto usan `name` como prioridad y las cantidades EF/A/T priorizan los campos base `physical_stock`, `reserve_qty` y `store_qty`.
- `app/(app)/products/page.js`: los cálculos de existencias, reserva y disponibilidad de tienda priorizan los campos base almacenados para reflejar los valores reales importados.

## Inventario visible en productos
- `app/api/[[...path]]/route.js`: se normalizan los valores de inventario desde cualquier alias (incluyendo metadata) sin forzarlos a cero, preservando existencias, reservas y disponibles reales en las respuestas de productos.
- `app/(app)/products/page.js`: la paginación respeta el `perPage` devuelto por la API para evitar recálculos que oculten datos al navegar.

## Corrección de duplicados y almacenes
- `app/api/[[...path]]/route.js`: se refactorizó la derivación de almacenes para evitar sombras de variables al compilar y mantener `no_almacen`, `warehouse_code` y `warehouse_name` alineados.
- `app/(app)/products/page.js`: las búsquedas de almacén ahora resuelven rutas anidadas (metadata.*) para mostrar el número/nombre correcto en la tabla junto con existencias reales.

## Restablecimiento de filtros globales y existencias reales
- `components/providers/ProductFiltersProvider.jsx`: nuevo proveedor global para compartir filtros, búsqueda y ordenamiento entre páginas sin duplicar lógica.
- `app/(app)/layout.js`: el layout principal envuelve el panel en el proveedor de filtros para reutilizar el mismo estado en toda la plataforma.
- `app/(app)/products/page.js`: la página de productos consume el contexto global de filtros y conserva la lógica de existencias, reserva y disponible leyendo alias y metadata.
- `app/api/[[...path]]/route.js`: los alias de inventario incluyen rutas con metadata y el resolvedor soporta claves anidadas para no devolver 0 cuando los datos viven en metadata.

## Experiencia responsive sin scroll lateral
- `app/(app)/products/page.js`: la tabla de escritorio se mantiene intacta y se añadió una vista de tarjetas compactas en móviles que muestra EF/Reserva/Tienda, almacén y estados sin obligar a hacer scroll horizontal.
- `app/(app)/inventory/page.js`: se incorporó una lista editable en tarjetas para pantallas pequeñas, centrando inputs de EF/A/T y selectores de clasificación dentro de un flujo vertical legible.

## Flujo de inventario con prioridades y exportación
- `app/api/[[...path]]/route.js`: se añadió el endpoint `/api/inventory/adjustments` con permisos de escritura para guardar históricos de conteo (real, diferencia, estado, subir/bajar tienda) y consultar ajustes recientes por fecha o producto.
- `lib/models/InventoryAdjustment.js`: nuevo modelo que almacena el conteo real, diferencia calculada, estado (pendiente/ok/faltante/sobrante), motivo y cantidades a subir/bajar a tienda.
- `app/(app)/inventory/page.js`: la vista agrupa por prioridad (Sin reserva, No en tienda, Últimas piezas, Próximo, Sin ID), limita la cola diaria por meta rápida de 20 productos, calcula estado al ingresar conteo real, captura subir/bajar a tienda, exporta CSV con el vale de ajustes y muestra el estado calculado en escritorio y móvil.

## Ajustes visuales y exportación multiformato
- `app/(app)/inventory/page.js`: se reordenaron las columnas para ubicar la “Cantidad real” entre la disponibilidad en tienda y los movimientos (Subir/Bajar T), dejando el estado del ajuste como último campo tanto en tabla como en tarjetas móviles. Se añadió selector de formato y exportación a CSV, Excel o PDF reutilizando las mismas filas calculadas.
