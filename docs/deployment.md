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

