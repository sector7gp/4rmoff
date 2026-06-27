# ADR 0001 - Stack Frontend Offline

## Estado
Aprobado

## Contexto
4rmOff debe funcionar 100% offline en Android Chrome, sin backend ni sincronizacion, con persistencia local y exportacion CSV.

## Decision
- UI: `HTML + CSS + JavaScript` en cliente.
- Persistencia: `IndexedDB`.
- Offline: `Service Worker` con estrategia cache-first.
- PWA: `manifest.json` en modo standalone.
- Seguridad local: PIN admin hasheado con `PBKDF2 + SHA-256` via `SubtleCrypto`.

## Consecuencias
- Sin dependencias de servidor y menor complejidad operativa.
- Cada dispositivo mantiene su propio dataset.
- Se prioriza compatibilidad con Android Chrome.
- No hay soporte de autenticacion multiusuario ni recuperacion remota de datos.
