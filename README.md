# Teatro UCB

Plataforma web del Teatro UCB para consultar obras y funciones, reservar butacas, postular a talleres y administrar la cartelera. La versión oficial se encuentra alojada en Render y utiliza una base PostgreSQL compartida en Neon.

## Acceso oficial

**Enlace para usar la aplicación:** <https://teatro-ucb.onrender.com>

Abre ese enlace desde cualquier computadora o teléfono con conexión a internet. No necesitas instalar programas, clonar el repositorio ni mantener tu computadora encendida. Todas las personas usan la misma aplicación y los datos compartidos.

Render utiliza el plan gratuito; después de un período sin actividad, el primer acceso puede tardar mientras el servicio vuelve a iniciarse. Las preferencias de tema y obras favoritas se guardan en el navegador, por lo que pueden ser distintas en cada dispositivo.

## Funciones del sitio

- **Cartelera:** consulta las obras activas, busca por título o dramaturgia y filtra por género.
- **Funciones y butacas:** elige una función, consulta las butacas disponibles y reserva entre una y cuatro. El sistema genera un código de confirmación.
- **Archivo y páginas informativas:** incluye obras pasadas, galería, información del teatro, elenco y contacto.
- **Talleres:** consulta convocatorias y envía postulaciones cuando hay cupos disponibles. El equipo administrador puede publicar y archivar talleres, ver sus cupos y revisar las postulaciones.
- **Cuentas:** regístrate con CI y contraseña, inicia/cierra sesión y personaliza el perfil con nombre visible, biografía y frase favorita.
- **Historial personal:** consulta los accesos y las reservas asociadas a tu cuenta. Después de una función reservada y finalizada, puedes dejar una valoración y opinión privada.
- **Opiniones:** solo quien envió la opinión y el equipo administrador pueden leerla; no se publica en la cartelera.
- **Interfaz:** navegación, menús desplegables y acordeones con animaciones, respetando la preferencia del dispositivo por reducir movimiento.
- **Temas y favoritas:** cambia entre tema claro y oscuro y guarda obras favoritas en el navegador actual.

## Roles de cuenta

| Rol | Permisos |
| --- | --- |
| Visitante | Ver cartelera, consultar butacas, reservar y postular a talleres. |
| Usuario | Lo anterior, además de editar su perfil y ver su historial personal. |
| Administrador | Revisar reservas, exportarlas a CSV, consultar reportes por semana/mes/año, crear y archivar obras, programar funciones, gestionar talleres y convocatorias, revisar postulaciones y leer opiniones privadas. |
| Superadministrador | Todo lo del administrador; además, consultar todas las cuentas y sus historiales, revisar accesos, otorgar o retirar el rol de administrador y gestionar invitaciones administrativas. |

El registro solicita CI (5 a 15 dígitos) y contraseña (8 a 128 caracteres). Los permisos de administrador no se obtienen mediante un registro normal. El superadministrador se aprovisiona en el servidor mediante las variables secretas `SUPERADMIN_CI` y `SUPERADMIN_PASSWORD`; no las publiques ni las incluyas en el repositorio.

## Administración y datos

- Las reservas realizadas con sesión iniciada quedan asociadas a esa cuenta. Las reservas sin sesión pueden realizarse, pero no aparecen en el historial personal.
- Los accesos registrados corresponden a cuentas que inician sesión o se registran. No se identifican ni rastrean visitas anónimas.
- Los importes de los reportes se calculan a partir de las reservas. **No son pagos cobrados:** el sitio no procesa pagos en línea.
- Las funciones dejan de aceptar reservas cuando comienzan o vencen.
- Las portadas personalizadas de obras se almacenan en la base de datos como imágenes JPG de hasta 3 MB.
- Las postulaciones a talleres guardan nombre y correo; cada correo puede postular una vez por taller y los cupos disponibles se controlan en el servidor.
- Para enviar una opinión, la cuenta debe tener una reserva con butacas asociadas a esa función y la función debe haber terminado. Cada cuenta puede opinar una sola vez por función.

## Datos compartidos y alojamiento

La aplicación publicada consta de:

- **Interfaz y API:** un servicio web de Render, bajo este mismo dominio.
- **Base de datos:** PostgreSQL alojado en Neon y configurado en Render mediante el secreto `DATABASE_URL`.
- **Migraciones:** se aplican al iniciar el servicio. Los datos no viven en las computadoras de las personas que visitan el sitio.

Los cambios publicados en el repositorio se reflejan en el enlace después de que Render despliega correctamente la rama conectada al servicio. Un `commit` local por sí solo no publica cambios; hay que subirlos al repositorio remoto (`push`).

## Información técnica

- Interfaz: React 19, TypeScript y Vite.
- API: Node.js, Express 5 y validación de datos con Zod.
- Persistencia: PostgreSQL y Prisma 7.
- Despliegue: Render; base de datos compartida en Neon.

La API ofrece rutas públicas para salud del servicio, cartelera, portadas, talleres, disponibilidad de butacas, reservas y postulaciones. Las rutas de cuenta requieren sesión. Las rutas administrativas requieren rol de administrador o superadministrador; la consulta de usuarios, sus historiales y los cambios de rol están reservados al superadministrador.

## Seguridad y operación

- Las contraseñas se almacenan como hashes; la sesión usa una cookie `HttpOnly`.
- Las credenciales y cadenas de conexión se configuran como secretos en el proveedor de alojamiento. No deben escribirse aquí, enviarse por chat ni guardarse en Git.
- Para reportar un problema de acceso, comparte el mensaje de error y la hora aproximada; oculta CI, contraseñas, cookies, tokens y `DATABASE_URL`.
- El despliegue puede mostrar datos de ejemplo iniciales. Los datos posteriores se comparten entre todos los visitantes mediante la base alojada.
