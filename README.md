# Teatro UCB

Aplicación full stack para consultar la cartelera, reservar butacas e inscribirse a talleres. El frontend usa React + TypeScript; la API usa Express y valida entradas con Zod; PostgreSQL almacena funciones, disponibilidad y solicitudes mediante Prisma.

## Requisitos

- Node.js 20.19+ o 22.12+
- Docker Compose

## Desarrollo local

1. Copia `.env.example` a `.env`.
2. Instala dependencias: `npm install`.
3. Inicia PostgreSQL: `docker compose up -d db`.
4. Crea el esquema: `npm run db:migrate -- --name init`.
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
- `GET /api/shows`: cartelera y próximas funciones.
- `GET /api/workshops`: talleres activos y cupos.
- `GET /api/performances/:id/seats`: mapa y disponibilidad de butacas.
- `POST /api/reservations`: crea una reserva atómica (1–4 butacas).
- `POST /api/workshop-applications`: registra una solicitud de inscripción.

La API devuelve errores con `{ "error": { "code": "...", "message": "..." } }`. La reserva bloquea butacas en una transacción y calcula el importe con precios de base de datos; los pagos en línea aún no están habilitados.

## Producción

Configura `DATABASE_URL`, `PORT`, `NODE_ENV=production` y `WEB_ORIGIN` con valores del entorno de despliegue. Ejecuta `npm run db:deploy`, `npm run build` y `npm start`. La API compilada sirve los recursos del frontend desde `dist`.

El usuario y contraseña de `docker-compose.yml` son solo para desarrollo local. Antes de aceptar datos reales, configura secretos seguros, HTTPS, política de privacidad/retención y controles operativos adecuados para el despliegue.
