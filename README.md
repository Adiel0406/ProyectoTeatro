# Teatro UCB

Aplicación full stack para consultar la cartelera, reservar butacas, inscribirse a talleres y explorar páginas sobre el teatro, el elenco, la galería y el contacto. El frontend usa React + TypeScript; la API usa Express y valida entradas con Zod; PostgreSQL almacena funciones, disponibilidad y solicitudes mediante Prisma.

Las funciones vencen automáticamente al completar la duración configurada para la obra; después se ocultan de la cartelera y ya no aceptan reservas. El tema y las obras favoritas se guardan en el navegador.

## Requisitos

- Node.js 24.22.1 y npm 11.19.1
- Docker Compose
- Git

Las versiones exactas están fijadas en `package.json`, `package-lock.json` y `.nvmrc`. Para evitar que dos máquinas resuelvan paquetes distintos, no uses `npm install` para actualizar el entorno local: usa `npm ci`.

Con nvm:

```bash
nvm install
nvm use
npm ci
npm run verify
```

## Desarrollo local

1. Copia `.env.example` a `.env`.
2. Instala exactamente las dependencias bloqueadas: `npm ci`.
3. Inicia PostgreSQL: `docker compose up -d db`.
4. Aplica las migraciones existentes: `npm run db:deploy`.
5. Carga cartelera, funciones, butacas y talleres: `npm run db:seed`.
6. Inicia el frontend y la API en desarrollo: `npm run dev`.

Como alternativa, después de crear `.env`, puedes preparar todo el entorno local con:

```bash
npm run setup
```

Ese comando usa `npm ci`, inicia PostgreSQL, aplica las migraciones y carga los datos de ejemplo.

Abre <http://localhost:5173>. Vite reenvía `/api` al servidor local en el puerto 3001. PostgreSQL se publica en el puerto 55432 para no interferir con servicios locales comunes.

Para probar la versión compilada, ejecuta `npm run build` y después `npm start`; abre la dirección indicada por la API (por defecto, <http://localhost:3001>). `npm start` configura el modo de producción para servir la interfaz desde `dist`, aunque `.env` tenga `NODE_ENV=development`. Usa `npm run dev` para desarrollo con recarga en caliente.

### Usuarios y administración

Las cuentas se registran con CI y contraseña; el servidor guarda las contraseñas con scrypt y utiliza sesiones opacas en cookies `HttpOnly`. Los códigos de administrador son aleatorios, de un solo uso, expiran y se almacenan como hashes.

El administrador gestiona cartelera y reservas. El superadministrador tiene además acceso a todas las cuentas y sus historiales y es el único que puede otorgar o retirar el rol de administrador. Para aprovisionarlo, configura `SUPERADMIN_CI` y `SUPERADMIN_PASSWORD` como secretos y ejecuta `npm run db:seed-superadmin`; en Render se ejecuta al iniciar el servicio cuando ambas variables están definidas. No incluyas credenciales reales en el repositorio ni las compartas por chat. Las cuentas nuevas son usuarios normales. El sistema no procesa pagos y no identifica ni rastrea visitas anónimas. Las reservas se asocian a una cuenta solo cuando se realizan con una sesión iniciada.

Las personas con cuenta pueden editar su nombre visible, biografía y frase favorita desde **Mi perfil**, además de consultar las reservas vinculadas a su sesión y el historial de accesos.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Frontend y API en modo desarrollo |
| `npm run build` | Genera Prisma y compila frontend, API y tipos TypeScript |
| `npm run setup` | Instala dependencias bloqueadas y prepara la base local |
| `npm run verify` | Comprueba Node, npm, el bloque de dependencias y `.env` |
| `npm test` | Ejecuta pruebas de validación |
| `npm run db:migrate -- --name nombre` | Crea/aplica una migración local |
| `npm run db:deploy` | Aplica migraciones existentes en despliegues |
| `npm run db:seed` | Inserta datos de ejemplo de forma repetible |
| `npm run db:seed-admin` | Aprovisiona el primer administrador desde `ADMIN_CI` y `ADMIN_PASSWORD` |
| `npm run db:seed-superadmin` | Crea o eleva una cuenta desde `SUPERADMIN_CI` y `SUPERADMIN_PASSWORD` |
| `npm run db:studio` | Abre Prisma Studio |

## API

- `GET /api/health`: comprueba la conexión a la base de datos.
- `GET /api/shows`: cartelera y funciones futuras aún vigentes, con hora de inicio y vencimiento.
- `GET /api/workshops`: talleres activos y cupos.
- `GET /api/performances/:id/seats`: mapa y disponibilidad de butacas.
- `POST /api/reservations`: crea una reserva atómica (1–4 butacas).
- `POST /api/workshop-applications`: registra una solicitud de inscripción.
- `GET/PATCH /api/account/profile` y `GET /api/account/history`: consulta o edita el perfil propio y revisa accesos y reservas vinculadas a la cuenta.
- Las rutas `/api/admin/*` requieren una sesión de administrador e incluyen usuarios, actividad de acceso, historial por cuenta y reportes semanales, mensuales y anuales.

La API devuelve errores con `{ "error": { "code": "...", "message": "..." } }`. La reserva bloquea butacas en una transacción y calcula el importe con precios de base de datos; los pagos en línea aún no están habilitados.

## Producción

Configura `DATABASE_URL`, `PORT` y `WEB_ORIGIN` con valores del entorno de despliegue. Ejecuta `npm run db:deploy`, `npm run build` y `npm start`. La API compilada sirve los recursos del frontend desde `dist`.

El usuario y contraseña de `docker-compose.yml` son solo para desarrollo local. En producción, configura `DATABASE_URL`, `SUPERADMIN_CI` y `SUPERADMIN_PASSWORD` como secretos del proveedor. Antes de aceptar datos reales, configura secretos seguros, HTTPS, política de privacidad/retención y controles operativos adecuados para el despliegue.

## Si las máquinas muestran versiones diferentes

No basta con que el código sea igual: cada máquina puede tener paquetes, navegador o datos locales distintos.

1. Haz `git pull --ff-only origin main`.
2. Ejecuta `nvm install && nvm use`.
3. Ejecuta `npm ci` y `npm run verify`.
4. Ejecuta `npm run db:deploy` y reinicia con `npm run dev`.
5. Actualiza el navegador con recarga fuerte o abre una sesión privada si quedaron archivos compilados en caché.

Cada computadora que usa el `docker-compose.yml` tiene su propia base PostgreSQL y su propio volumen. Las reservas, usuarios y talleres pueden verse diferentes. Para compartir exactamente los mismos datos, todas las máquinas deben configurar el mismo `DATABASE_URL` de una base PostgreSQL compartida, como la administrada usada en Render. No copies contraseñas reales en el repositorio ni en `.env.example`.

### Publicación compartida en Render

El archivo `render.yaml` configura un servicio web de Render que compila y sirve el frontend y la API bajo el mismo dominio. Para publicarlo:

1. Crea una base PostgreSQL administrada (por ejemplo, en Neon) y copia la URL de conexión directa con SSL habilitado. No uses las credenciales locales de `docker-compose.yml`.
2. En Render, crea un **Blueprint** desde este repositorio y la rama `main`. Render detectará `render.yaml`; introduce la URL y las credenciales iniciales solicitadas como secretos `DATABASE_URL`, `ADMIN_CI` y `ADMIN_PASSWORD`.
3. Usa una contraseña administrativa única y segura; estos valores solo se configuran en Render, no en Git ni en el navegador.
4. Render desplegará la app y mostrará una URL pública `https://<nombre-del-servicio>.onrender.com`. Comparte ese enlace; los usuarios usarán la misma API y base de datos. El primer deploy carga también los datos de ejemplo.

El *Blueprint* no contiene credenciales. Las migraciones se aplican al iniciar el servicio. El administrador inicial se crea solo en el hook del primer deploy cuando ambas variables de admin están configuradas. El plan gratuito de Render puede suspender servicios inactivos; la disponibilidad y límites de la base dependen del proveedor PostgreSQL elegido.
