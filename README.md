# 4rmOff

Aplicacion PWA offline para captura y gestion de contactos, orientada a uso interno en Android Chrome.

## Caracteristicas principales

- Funciona offline (despues de la primera carga) con `Service Worker`.
- Almacenamiento local en `IndexedDB` (sin backend).
- Dos perfiles:
  - `Operador`: carga de nuevos registros.
  - `Administrador`: listado, busqueda, edicion, eliminacion, exportacion CSV, configuracion de campos y cambio de PIN.
- Acceso admin por PIN local hasheado (`PBKDF2 + SHA-256`).
- Bloqueo anti fuerza bruta: 5 intentos fallidos -> 5 minutos.
- Exportacion CSV con formato compatible RFC 4180.
- Compartir CSV por Web Share API (si esta disponible) o descarga local como fallback.

## Stack tecnico

- `HTML + CSS + JavaScript` (sin framework)
- `IndexedDB`
- `Service Worker` (cache-first)
- `Web Crypto API` para hashing de PIN
- `Web Share API` para compartir exportaciones
- `manifest.json` para instalacion PWA

Mas detalle en `docs/adr/0001-frontend-stack.md`.

## Estructura del proyecto

```text
4rmoff/
  index.html
  styles.css
  app.js
  manifest.json
  sw.js
  icons/
  src/
    db/indexeddb.js
    auth/pin-auth.js
    fields/fields-config.js
    records/records-service.js
    export/csv-export.js
    ui/router.js
  docs/
    adr/0001-frontend-stack.md
    acceptance-checklist-v1.1.md
```

## Requisitos

- Navegador moderno (objetivo principal: Android + Chrome).
- Servir por `http://localhost` o `https://...` (no abrir con `file://`).

## Ejecucion local

### Opcion A: Apache (recomendada si ya lo usas)

1. Publica esta carpeta como sitio estatico en Apache.
2. Asegurate de poder acceder a `http://localhost/.../index.html` (o dominio HTTPS).
3. Verifica en DevTools que:
   - `manifest.json` carga bien.
   - `sw.js` se registra sin errores.

> No necesitas Python para ejecutar la app.

### Opcion B: Python (servidor rapido)

Desde la raiz del proyecto:

```bash
python3 -m http.server 8080
```

Luego abre:

```text
http://localhost:8080
```

## Primer uso

1. Abre la app.
2. Veras modo `Operador` por defecto.
3. Usa el acceso discreto `...` para ingresar a admin.
4. PIN inicial de fabrica: `1234`.
5. Cambia el PIN inmediatamente desde "Cambiar PIN admin".

## Flujo funcional

### Operador

- Completa el formulario dinamico.
- Guarda registro.
- El formulario se limpia automaticamente.

### Administrador

- Accede por PIN.
- Gestiona campos (agregar/editar/reordenar/eliminar y marcar obligatorios).
- Consulta listado, busca y ordena.
- Edita o elimina registros.
- Exporta CSV (todos o filtrados).
- Cierra sesion admin cuando termina.

## Persistencia y seguridad local

- Datos en `IndexedDB` local del navegador.
- No hay sincronizacion entre dispositivos.
- PIN almacenado como hash, nunca en texto plano.
- Lockout temporal tras multiples intentos fallidos.

## Exportacion CSV

- Nombre de archivo: `contactos_YYYY-MM-DD.csv`.
- Incluye encabezados y columnas segun configuracion de campos.
- Escapa comillas, comas y saltos de linea para compatibilidad.

## Instalacion como PWA (Android Chrome)

1. Abre la app por HTTP/HTTPS.
2. Menu de Chrome -> "Agregar a pantalla principal" o "Instalar app".
3. Ejecuta en modo standalone desde el icono.

## Validacion funcional

Usa la checklist:

- `docs/acceptance-checklist-v1.1.md`

## Limitaciones de v1.1

- Sin backend.
- Sin sincronizacion entre dispositivos.
- Sin multiples admins con PIN distintos.
- Sin importacion CSV.
- Sin exportacion a Excel/PDF nativa.

## Troubleshooting rapido

- Si no funciona offline:
  - recarga una vez online,
  - verifica registro del Service Worker,
  - limpia cache del sitio y vuelve a abrir.
- Si no aparece opcion de compartir CSV:
  - el navegador/dispositivo puede no soportar compartir archivos por Web Share API,
  - se usara descarga como fallback.
