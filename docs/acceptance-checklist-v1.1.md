# Acceptance Checklist v1.1

## Guia de instalacion basica
- Abrir la app en Android Chrome.
- Instalar desde menu "Agregar a pantalla principal".
- PIN admin inicial de fabrica: `1234`.

## AU - Autenticacion
- [ ] AU-01: Inicia en modo Operador sin login.
- [ ] AU-02: Existe acceso discreto para PIN admin.
- [ ] AU-03: PIN correcto habilita modo Admin durante la sesion.
- [ ] AU-04: PIN incorrecto bloquea por 5 minutos tras 5 intentos.
- [ ] AU-05: Admin puede cerrar sesion y volver a Operador.
- [ ] AU-06: Admin puede cambiar PIN ingresando PIN actual.
- [ ] AU-07: PIN almacenado como hash (no texto plano).

## CF - Configuracion de campos
- [ ] CF-01: Admin agrega campo con nombre y tipo.
- [ ] CF-02: Admin reordena campos con controles de posicion.
- [ ] CF-03: Admin elimina campo con advertencia si hay datos.
- [ ] CF-04: Admin marca campo obligatorio/opcional.
- [ ] CF-05: Configuracion persiste entre sesiones.
- [ ] CF-06: Existen campos iniciales Nombre, Apellido, Telefono, Email.

## ID - Ingreso de datos
- [ ] ID-01: Formulario respeta campos y orden configurados.
- [ ] ID-02: Valida campos obligatorios al guardar.
- [ ] ID-03: Valida formato email y telefono.
- [ ] ID-04: Tras guardar, limpia formulario y muestra confirmacion.
- [ ] ID-05: Permite limpiar formulario sin guardar.

## LR - Listado
- [ ] LR-01: Admin ve tabla con columnas configuradas.
- [ ] LR-02: Muestra cantidad de registros.
- [ ] LR-03: Busqueda en tiempo real sobre todos los campos.
- [ ] LR-04: Orden por columna.
- [ ] LR-05: Permite editar desde listado.
- [ ] LR-06: Permite eliminar con confirmacion.

## ER - Edicion
- [ ] ER-01: Edicion precarga datos actuales.
- [ ] ER-02: Reutiliza validaciones del ingreso.
- [ ] ER-03: Permite cancelar edicion sin guardar.
- [ ] ER-04: Registra `fecha_modificacion`.

## EX - Exportacion CSV
- [ ] EX-01: Exporta todos los registros.
- [ ] EX-02: Incluye encabezados.
- [ ] EX-03: Respeta orden de columnas configurado.
- [ ] EX-04: Aplica escape RFC 4180.
- [ ] EX-05: Exporta solo filtrados.
- [ ] EX-06: Usa Web Share API o fallback descarga.
- [ ] EX-07: Nombre con fecha `contactos_YYYY-MM-DD.csv`.

## Criterios generales
- [ ] Funciona offline tras primera carga.
- [ ] Datos persisten al cerrar/reabrir.
- [ ] Operador no accede a funciones admin.
- [ ] CSV abre correctamente en Excel/Google Sheets.
