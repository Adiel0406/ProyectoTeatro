# Teatro UCB

Aplicación full stack para consultar la cartelera, reservar butacas e inscribirse a talleres. El frontend usa React + TypeScript; la API usa Express y valida entradas con Zod; PostgreSQL almacena funciones, disponibilidad y solicitudes mediante Prisma.

Las funciones vencen automáticamente al completar la duración configurada para la obra; después se ocultan de la cartelera y ya no aceptan reservas. El tema y las obras favoritas se guardan en el navegador.

## Requisitos

- Node.js 20.19+ o 22.12+
- Docker Compose

## Desarrollo local

1. Copia `.env.example` a `.env`.
2. Instala dependencias: `npm install`.
3. Inicia PostgreSQL: `docker compose up -d db`.
4. Aplica las migraciones existentes: `npm run db:deploy`.
5. Carga cartelera, funciones, butacas y talleres: `npm run db:seed`.
6. Inicia el frontend y la API: `npm run dev`.

Abre <http://localhost:5173>. Vite reenvía `/api` al servidor local en el puerto 3001. PostgreSQL se publica en el puerto 55432 para no interferir con servicios locales comunes.

### Usuarios y administración

Las cuentas se registran con CI y contraseña; el servidor guarda las contraseñas con scrypt y utiliza sesiones opacas en cookies `HttpOnly`. Los códigos de administrador son aleatorios, de un solo uso, expiran y se almacenan como hashes.

Para aprovisionar el primer administrador, configura `ADMIN_CI` y `ADMIN_PASSWORD` en el entorno de la terminal y ejecuta `npm run db:seed-admin`. No incluyas credenciales reales en `.env.example`, el repositorio ni los registros de comandos compartidos. Las cuentas nuevas son usuarios normales; un administrador autenticado genera códigos de acceso desde el panel para otorgar permisos de administrador. El panel permite revisar reservas y agregar obras y funciones.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Frontend y API en modo desarrollo |
| `npm run build` | Genera Prisma y compila frontend, API y tipos TypeScript |
| `npm test` | Ejecuta pruebas de validación |
| `npm run db:migrate -- --name nombre` | Crea/aplica una migración local |
| `npm run db:deploy` | Aplica migraciones existentes en despliegues |
| `npm run db:seed` | Inserta datos de ejemplo de forma repetible |
| `npm run db:seed-admin` | Aprovisiona el primer administrador desde `ADMIN_CI` y `ADMIN_PASSWORD` |
| `npm run db:studio` | Abre Prisma Studio |

## API

- `GET /api/health`: comprueba la conexión a la base de datos.
- `GET /api/shows`: cartelera y funciones futuras aún vigentes, con hora de inicio y vencimiento.
- `GET /api/workshops`: talleres activos y cupos.
- `GET /api/performances/:id/seats`: mapa y disponibilidad de butacas.
- `POST /api/reservations`: crea una reserva atómica (1–4 butacas).
- `POST /api/workshop-applications`: registra una solicitud de inscripción.

La API devuelve errores con `{ "error": { "code": "...", "message": "..." } }`. La reserva bloquea butacas en una transacción y calcula el importe con precios de base de datos; los pagos en línea aún no están habilitados.

## Producción

Configura `DATABASE_URL`, `PORT`, `NODE_ENV=production` y `WEB_ORIGIN` con valores del entorno de despliegue. Ejecuta `npm run db:deploy`, `npm run build` y `npm start`. La API compilada sirve los recursos del frontend desde `dist`.

El usuario y contraseña de `docker-compose.yml` son solo para desarrollo local. Antes de aceptar datos reales, configura secretos seguros, HTTPS, política de privacidad/retención y controles operativos adecuados para el despliegue.

### Publicación compartida en Render

El archivo `render.yaml` configura un servicio web de Render que compila y sirve el frontend y la API bajo el mismo dominio. Para publicarlo:

1. Crea una base PostgreSQL administrada (por ejemplo, en Neon) y copia la URL de conexión directa con SSL habilitado. No uses las credenciales locales de `docker-compose.yml`.
2. En Render, crea un **Blueprint** desde este repositorio y la rama `main`. Render detectará `render.yaml`; introduce la URL y las credenciales iniciales solicitadas como secretos `DATABASE_URL`, `ADMIN_CI` y `ADMIN_PASSWORD`.
3. Usa una contraseña administrativa única y segura; estos valores solo se configuran en Render, no en Git ni en el navegador.
4. Render desplegará la app y mostrará una URL pública `https://<nombre-del-servicio>.onrender.com`. Comparte ese enlace; los usuarios usarán la misma API y base de datos. El primer deploy carga también los datos de ejemplo.

El *Blueprint* no contiene credenciales. Las migraciones se aplican al iniciar el servicio. El administrador inicial se crea solo en el hook del primer deploy cuando ambas variables de admin están configuradas. El plan gratuito de Render puede suspender servicios inactivos; la disponibilidad y límites de la base dependen del proveedor PostgreSQL elegido.
