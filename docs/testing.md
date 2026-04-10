# Testing y Calidad

## Estrategia

- unit tests sobre reglas de negocio puras
- integration tests sobre servicios transaccionales
- e2e tests sobre flujos criticos
- smoke tests UI para navegacion, filtros y formularios

## Casos criticos

- alta de socio duplicado por documento
- cambio de categoria con fecha retroactiva
- pago con imputacion mayor al importe
- anulacion de pago con allocations existentes
- generacion de mora por periodos impagos
- exportacion con filtros combinados
- permiso insuficiente para ver auditoria
- campana WhatsApp sobre socios sin telefono

## Seguridad

- fuerza bruta en login
- elevacion horizontal de permisos
- acceso a archivos fuera del ownership permitido
- inyeccion en filtros de reportes
- abuso de endpoints de exportacion masiva

