# Changelog

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

## Correcciones de inventario visibles
- `app/api/[[...path]]/route.js`: la respuesta incluye valores virtuales de inventario y metadatos globales de filtros (almacenes, proveedores y marcas) para no limitar los selectores a los ítems paginados.
- `app/(app)/inventory/page.js`: los filtros globales se alimentan con las listas completas desde la API, los nombres de producto usan `name` como prioridad y las cantidades EF/A/T priorizan los campos base `physical_stock`, `reserve_qty` y `store_qty`.
- `app/(app)/products/page.js`: los cálculos de existencias, reserva y disponibilidad de tienda priorizan los campos base almacenados para reflejar los valores reales importados.

## Inventario visible en productos
- `app/api/[[...path]]/route.js`: se normalizan los valores de inventario desde cualquier alias (incluyendo metadata) sin forzarlos a cero, preservando existencias, reservas y disponibles reales en las respuestas de productos.
- `app/(app)/products/page.js`: la paginación respeta el `perPage` devuelto por la API para evitar recálculos que oculten datos al navegar.
