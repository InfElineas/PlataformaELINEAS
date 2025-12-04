# Changelog

## Inventario importado correctamente
- `lib/imports/constants.js`: se actualizó la plantilla de encabezados y los alias para reconocer variaciones con acentos, abreviaturas y puntos.
- `lib/imports/utils.js`: el resolvedor de campos acepta también los nombres canónicos normalizados para mapear encabezados dinámicos.
- `lib/imports/parser.js`: se alinearon los mapeos de columnas con `existencia_fisica`, `reserva`, `disponible_tienda` y `Alm.` como número/nombre de almacén, incluyendo validaciones en español.
- `lib/imports/products.js`: `buildProductDocument()` ahora consume los campos normalizados y persiste existencias, reservas y almacenes en los lugares correctos.
- `lib/models/Product.js`: se estandarizaron los campos de inventario en español con alias para nombres previos y se evitó la duplicidad de datos.
- `app/api/imports/products/google/route.js`: mensajes de error inesperado en español y consistentes con el flujo de importación.
