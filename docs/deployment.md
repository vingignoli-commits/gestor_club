# Despliegue y Operacion

## Local

1. Copiar `.env.example` a `.env`
2. Crear base PostgreSQL `gestion_club`
3. Ejecutar `pnpm install`
4. Ejecutar `pnpm db:generate`
5. Ejecutar `pnpm db:migrate`
6. Ejecutar `pnpm db:seed`
7. Ejecutar `pnpm dev`

## Produccion

- `web`: Vercel o contenedor Node
- `api`: contenedor Docker en Fly.io, Railway, ECS, Render o VM
- `db`: PostgreSQL administrado con backups PITR
- `storage`: S3 compatible
- `queue`: Redis/BullMQ recomendado para campanas y exportaciones

## Migraciones

El `start` de la API es `prisma:migrate:deploy && node dist/main`: las migraciones
pendientes se aplican **al arrancar el proceso**, no en el build.

Por que asi y no en el build command de Render:

- El repo queda autosuficiente. Antes, aplicar una migracion dependia de como
  estuviera configurado el build command en el panel de Render, que no esta
  versionado y nadie recuerda revisar al agregar una migracion nueva.
- Garantiza que `DATABASE_URL` este disponible: en build time puede no estarlo.
- Si la migracion falla, el proceso no levanta. Es lo que se busca: arrancar con
  el esquema desfasado rompe cualquier consulta que toque las columnas nuevas,
  no solo las funcionalidades agregadas.

`prisma migrate deploy` es idempotente y toma un advisory lock en Postgres, de
modo que repetirlo en cada arranque no hace nada y es seguro aun con varias
instancias levantando a la vez.

Por esto el CLI `prisma` vive en `dependencies` y no en `devDependencies`: se
ejecuta en runtime, y si el entorno poda las dev-deps la API no arrancaria.

## Backups

- backup diario full
- WAL o PITR habilitado
- retencion minima 30 dias
- prueba de restauracion mensual

## Monitoreo

- logs estructurados
- alertas de errores 5xx
- latencia por endpoint
- uso de almacenamiento
- tasa de fallas de WhatsApp

## Mantenimiento

- rotacion de secretos
- revision trimestral de roles y permisos
- vacuum/analyze programado
- revision de indices segun crecimiento de reportes

