# Gestion de Club

## 1. Resumen Ejecutivo

`Gestion de Club` es una plataforma web administrativa para clubes orientada a padrón de socios, tesorería, deuda, trazabilidad, reporting y mensajería. El diseño prioriza tres principios: historificación completa, consistencia financiera reconstruible y operación rápida para personal no técnico.

La solución propuesta separa con claridad:

- estado operativo actual
- historial versionado de cambios
- movimientos económicos inmutables o reversables mediante ajustes
- auditoría transversal por entidad y usuario
- integraciones desacopladas para WhatsApp y archivos

El sistema queda preparado para crecer hacia cobro online, carnet digital, control de acceso, reservas, disciplinas, multi-sede y app mobile sin rehacer el núcleo de datos.

## 2. Supuestos de Negocio

- El club administra una sola razón social en la primera etapa, pero el modelo deja preparada la extensión a `branch_id` o `site_id`.
- La cuota se determina por categoría, condición o asignación específica al socio; puede haber excepciones y descuentos.
- La deuda debe poder reconstruirse por período usando reglas históricas, no por sobrescritura del valor vigente.
- Las bajas físicas se evitan; se usan bajas lógicas, estados y vigencias.
- Los pagos no se borran. Si hubo error, se anulan o compensan con movimientos correctivos auditados.
- Los cierres mensuales son deseables. El diseño soporta snapshots futuros, pero inicialmente la verdad contable se reconstruye desde transacciones e historial.
- Un socio puede pertenecer a un grupo familiar con un titular y adherentes.
- La mensajería por WhatsApp debe poder cambiar de proveedor sin afectar casos de uso internos.
- Los archivos pueden residir fuera de la base; la BD solo conserva metadatos, ownership, hash opcional y referencias.

## 3. Alcance Funcional Completo

### Gestión de socios

- Alta, edición, baja lógica y reactivación
- Búsqueda simple y avanzada
- Ficha 360 del socio
- Datos personales, contacto y dirección
- Grupo familiar y relación titular/adherente
- Observaciones internas
- Estado actual y trazabilidad histórica
- Categorías y condiciones configurables

### Gestión histórica del socio

- Historial de categoría
- Historial de estado administrativo
- Historial de asignación de plan/cuota
- Historial de observaciones relevantes
- Motivo, fecha efectiva y usuario responsable

### Tesorería y cobranzas

- Registro de pagos
- Imputación a uno o varios períodos
- Pagos parciales, múltiples y anticipados
- Saldo a favor
- Deuda por socio, período, categoría y antigüedad
- Recordatorios y campañas a morosos

### Finanzas institucionales

- Ingresos por cuotas
- Otros ingresos
- Egresos
- Categorías contables configurables
- Comprobantes adjuntos
- Balance resumido y análisis por período

### Reporting y analítica

- Reportes operativos exportables
- Dashboard ejecutivo
- Series temporales
- Rankings, mora, cobrabilidad y flujo

### Seguridad y gobierno

- Login
- Roles y permisos
- Auditoría consultable
- Trazabilidad documental

### Integraciones

- WhatsApp individual y masivo
- Storage externo para comprobantes

## 4. Módulos del Sistema

1. `Auth y Usuarios`
   - login, sesiones, recuperación, roles, permisos
2. `Socios`
   - padrón, ficha, grupos familiares, notas, documentos
3. `Categorías y Estados`
   - catálogo y reglas de negocio
4. `Cuotas`
   - tipos, reglas, valores históricos, asignaciones, excepciones
5. `Pagos`
   - registro, imputación, comprobantes, recibos internos
6. `Cuenta Corriente`
   - deuda, saldo, mora, reconstrucción histórica
7. `Caja e Institucional`
   - ingresos y egresos extra cuota
8. `Archivos`
   - adjuntos y trazabilidad documental
9. `Reportes`
   - filtros, exportaciones, vistas analíticas
10. `Dashboard`
   - KPIs y alertas
11. `Mensajería`
   - plantillas, campañas y envíos
12. `Auditoría`
   - historial por entidad, usuario y rango temporal
13. `Configuración`
   - parámetros, categorías, métodos de pago, conceptos

## 5. Casos de Uso

### Administración

- Dar de alta un socio con categoría inicial y cuota aplicable
- Actualizar contacto o grupo familiar
- Suspender o reactivar un socio
- Consultar historial completo del socio
- Emitir padrón filtrado por estado y categoría

### Tesorería

- Registrar pago e imputarlo a meses adeudados
- Detectar morosos por rango y categoría
- Registrar ingreso extraordinario
- Registrar egreso con comprobante
- Analizar cobrabilidad del mes

### Presidencia

- Consultar tablero ejecutivo
- Ver evolución de padrón, mora e ingresos
- Revisar balance resumido y alertas

### Atención al socio

- Buscar socio por nombre, DNI o teléfono
- Consultar deuda actual e historial
- Enviar recordatorio o confirmación por WhatsApp

### Auditor interno

- Ver quién editó una cuota
- Revisar cambios de estado de socios
- Detectar movimientos sin comprobante

## 6. Reglas de Negocio

1. Nunca se elimina historial relevante.
2. Toda modificación sensible genera registro de auditoría.
3. Toda condición del socio tiene fecha efectiva y motivo.
4. Toda cuota tiene vigencia y no sobrescribe importes pasados.
5. Todo pago debe poder rastrearse a sus imputaciones.
6. Un pago anulado conserva su registro y genera estado de anulación.
7. Un egreso o ingreso puede corregirse por reversión o ajuste, no por borrado.
8. El cálculo de deuda se basa en períodos exigibles menos imputaciones efectivas, aplicando descuentos y excepciones vigentes.
9. Los reportes deben poder filtrarse por período operativo y por fecha real de carga.
10. El usuario que crea o modifica un dato debe quedar persistido.
11. El sistema debe soportar permisos granulares por acción.
12. El diseño evita duplicar estado actual e histórico sin una fuente de verdad definida.

## 7. Arquitectura Recomendada

### Opción elegida

- Frontend: `Next.js 15` con App Router, TypeScript y `Tailwind CSS`
- Backend: `NestJS` modular con TypeScript
- Base de datos: `PostgreSQL`
- ORM: `Prisma`
- Auth: sesión basada en access token + refresh token rotado, hashing con Argon2
- UI: componentes reutilizables con patrón admin dashboard
- Reporting: consultas SQL/Prisma + exportación CSV/XLSX/PDF server-side
- Archivos: S3 compatible o Supabase Storage
- Mensajería: adaptador desacoplado por proveedor WhatsApp
- Infra: monorepo con `pnpm`

### Justificación

- `Next.js` permite una UI administrativa rápida, SSR/ISR donde conviene y crecimiento hacia portal socio o app híbrida.
- `NestJS` da estructura modular, validaciones, guards, interceptors y escalabilidad para dominio administrativo complejo.
- `PostgreSQL` resuelve bien integridad relacional, reportes, índices compuestos, JSONB controlado y consultas analíticas.
- `Prisma` acelera modelado y migraciones sin sacrificar claridad.

### Alternativas y trade-offs

- `Express/Fastify` puro: más liviano, pero menos estructura para permisos, auditoría y crecimiento modular. Se descarta.
- `Django`: sólido para backoffice, pero menos alineado si se busca mismo lenguaje en frontend y backend.
- `Supabase full stack`: rápido para MVP, pero menos control para reglas históricas complejas, auditoría rica y adaptadores propios.

### Principios técnicos

- Monolito modular primero, preparado para extraer servicios después.
- Dominio explícito por bounded contexts internos.
- Escrituras transaccionales.
- Historial mediante tablas de vigencia y eventos auditables.
- Integraciones desacopladas por puertos/adaptadores.

## 8. Modelo de Datos

### Modelo conceptual

Entidades centrales:

- `member`
- `member_category`
- `member_status`
- `member_status_history`
- `membership_plan`
- `membership_plan_price`
- `member_plan_assignment`
- `member_discount`
- `billing_period`
- `charge`
- `payment`
- `payment_allocation`
- `cash_transaction`
- `accounting_category`
- `file_asset`
- `file_link`
- `user`
- `role`
- `permission`
- `audit_log`
- `whatsapp_template`
- `message_campaign`
- `message_dispatch`

### Estrategia de historificación

- Los catálogos configurables tienen `is_active` y timestamps.
- Los cambios temporales usan tablas de historial con `effective_from` y `effective_to`.
- Los valores monetarios versionados usan vigencias sin update destructivo.
- Las correcciones contables se resuelven por reversión o ajuste.
- La auditoría complementa, pero no reemplaza, las tablas históricas del dominio.

### Datos obligatorios

- Socio: nombre, apellido, documento, fecha de alta, estado inicial, categoría inicial
- Pago: socio, fecha real, importe, moneda, método, usuario creador
- Movimiento económico: tipo, fecha, categoría contable, importe, usuario creador

### Datos opcionales

- Email, dirección, observaciones, comprobante externo, notas internas, hash de archivo

### Datos solo lectura luego del registro

- Importe original y fecha efectiva de pagos
- Imputaciones de pago ya conciliadas, salvo anulación mediante proceso autorizado
- auditoría

### Índices recomendados

- `member(document_number)` único parcial por club
- `member(last_name, first_name)`
- `member(current_status_code, current_category_id)`
- `member_status_history(member_id, effective_from desc)`
- `member_plan_assignment(member_id, effective_from desc)`
- `payment(member_id, paid_at desc)`
- `payment_allocation(payment_id, billing_period_id)`
- `charge(member_id, billing_period_id, status)`
- `cash_transaction(occurred_at, direction, accounting_category_id)`
- `audit_log(entity_name, entity_id, created_at desc)`
- `message_dispatch(status, scheduled_at)`

## 9. Diseño de API

### Convenciones

- Prefijo `/api/v1`
- DTOs validados con `class-validator`
- Respuestas paginadas con metadatos estándar
- Soft delete y acciones explícitas para anular/reactivar
- Idempotencia para operaciones sensibles de mensajería y pagos masivos

### Endpoints principales

#### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

#### Socios

- `GET /members`
- `POST /members`
- `GET /members/:id`
- `PATCH /members/:id`
- `POST /members/:id/deactivate`
- `POST /members/:id/reactivate`
- `POST /members/:id/status-changes`
- `POST /members/:id/category-changes`
- `POST /members/:id/plan-assignments`
- `GET /members/:id/account-statement`
- `GET /members/:id/payments`

#### Cuotas

- `GET /membership-plans`
- `POST /membership-plans`
- `POST /membership-plans/:id/prices`
- `GET /membership-plans/:id/prices`

#### Facturación y deuda

- `POST /billing-periods/generate`
- `GET /charges`
- `GET /delinquency`

#### Pagos

- `GET /payments`
- `POST /payments`
- `GET /payments/:id`
- `POST /payments/:id/void`

#### Caja

- `GET /cash-transactions`
- `POST /cash-transactions`
- `GET /cash-transactions/:id`

#### Archivos

- `POST /files/presign`
- `POST /files/link`
- `GET /files/:id`

#### Reportes

- `GET /reports/members`
- `GET /reports/delinquency`
- `GET /reports/collections`
- `GET /reports/balance-summary`
- `GET /reports/audit`
- `GET /reports/export/:reportKey`

#### Dashboard

- `GET /dashboard/executive`
- `GET /dashboard/treasury`

#### Auditoría

- `GET /audit-logs`

#### WhatsApp

- `GET /whatsapp/templates`
- `POST /whatsapp/templates`
- `POST /whatsapp/messages/send`
- `POST /whatsapp/campaigns`
- `POST /whatsapp/campaigns/:id/dispatch`

## 10. UX/UI Propuesta

### Sitemap

- Login
- Dashboard
- Socios
- Ficha de socio
- Cuotas
- Pagos
- Cuenta corriente
- Ingresos/Egresos
- Reportes
- Mensajería
- Auditoría
- Configuración

### Navegación lateral

- Dashboard
- Socios
- Tesorería
- Reportes
- Mensajería
- Auditoría
- Configuración

### Wireframes textuales

#### Dashboard

- Encabezado con filtros globales
- 8 cards KPI
- gráfico de recaudación mensual
- gráfico de mora histórica
- tabla de alertas
- tabla de morosos críticos

#### Padrón de socios

- barra superior con búsqueda, filtros persistentes y acciones masivas
- tabla con columnas configurables
- badges de estado, deuda y categoría
- acceso lateral a exportar y alta rápida

#### Ficha del socio

- bloque superior con identidad, estado, categoría y deuda
- tabs: resumen, historial, pagos, deuda, archivos, mensajes, auditoría
- panel lateral con acciones rápidas

#### Tesorería

- submódulos: pagos, cuenta corriente, ingresos, egresos
- vista diaria con filtros por caja, método y responsable

### Criterios UX

- una tarea frecuente no debe requerir más de 3 interacciones principales
- filtros recordados por módulo
- feedback claro para operaciones sensibles
- uso intensivo de tablas accionables y paneles laterales

## 11. Dashboard e Indicadores

KPIs base:

- socios totales
- socios activos
- morosos
- porcentaje de mora
- recaudación del mes
- deuda total
- ingresos vs egresos
- cobrabilidad mensual
- altas y bajas del período

Gráficos:

- evolución mensual de padrón
- evolución de cobranzas
- deuda por antigüedad
- ingresos/egresos por categoría

Alertas:

- aumento de mora superior al umbral
- movimientos sin comprobante
- campañas pendientes

## 12. Reportes

### Mínimos obligatorios

- padrón total
- socios activos
- socios inactivos
- socios morosos
- historial de pagos por socio
- deuda por socio
- deuda por período
- ingresos por período
- egresos por período
- balance resumido
- movimientos sin comprobante
- cambios de condición
- trazabilidad por usuario
- evolución de socios
- evolución de mora
- ranking de cobrabilidad

### Exportación

- CSV para extracción masiva
- XLSX para operación administrativa
- PDF para envío formal y presidencia

## 13. Seguridad, Permisos y Auditoría

### Roles sugeridos

- `superadmin`
- `administrador`
- `tesoreria`
- `operador`
- `solo_lectura`

### Controles

- autenticación con refresh token rotado
- RBAC con permisos granulares
- hashing Argon2
- rate limit en login y mensajería
- auditoría de cambios sensibles
- soft delete
- validación server-side obligatoria

### Auditoría

Cada evento debe registrar:

- usuario
- entidad
- id entidad
- acción
- timestamp
- payload anterior
- payload nuevo
- ip y user agent cuando aplique

## 14. Integración WhatsApp

### Arquitectura

- `MessageService` depende de un puerto `MessagingProvider`
- proveedores implementables:
  - Meta WhatsApp Business API
  - Twilio
  - proveedor intermedio
- plantillas internas del sistema
- render de variables previo a despacho
- campañas asincrónicas con estado

### Flujo

1. usuario selecciona destino o segmento
2. sistema resuelve contactos elegibles
3. renderiza mensaje con variables
4. genera `message_dispatch`
5. envía por proveedor configurado
6. persiste resultado o error

## 15. Roadmap de Implementación por Fases

### Fase 1

- definición funcional
- modelo de datos
- arquitectura

### Fase 2

- auth
- usuarios
- socios
- categorías
- estados

### Fase 3

- cuotas
- períodos
- cargos
- pagos
- cuenta corriente

### Fase 4

- ingresos/egresos
- archivos
- dashboard
- reportes base

### Fase 5

- mensajería WhatsApp
- auditoría avanzada
- exportaciones

### Fase 6

- hardening
- observabilidad
- backup
- despliegue productivo

## 16. Riesgos y Decisiones de Diseño

### Riesgos

- ambigüedad de reglas históricas por cambios manuales sin fecha efectiva
- inconsistencias si se permiten ediciones destructivas de pagos
- dependencia de proveedor externo de WhatsApp
- crecimiento de reportes complejos sin índices ni vistas materializadas

### Decisiones

- elegir tablas históricas explícitas en vez de solo audit logs
  - trade-off: más tablas, pero reconstrucción confiable
- usar monolito modular
  - trade-off: menor complejidad operativa inicial, fácil extracción posterior
- modelar cuenta corriente por períodos
  - trade-off: requiere job o proceso de generación de cargos, pero permite deuda explicable y filtros robustos

## 17. Código Inicial del Proyecto

La base técnica incluida en este repositorio deja:

- monorepo `pnpm`
- app `web` en Next.js
- app `api` en NestJS
- esquema `Prisma` con historial y auditoría
- módulos iniciales de auth, socios, pagos, dashboard, reportes y mensajería
- seeds de ejemplo
- tests base

## 18. Próximos Pasos Técnicos Concretos

1. Instalar dependencias y generar cliente Prisma.
2. Ejecutar migraciones sobre PostgreSQL.
3. Completar autenticación real con JWT/refresh token.
4. Implementar servicios transaccionales de cargos, deuda y anulaciones.
5. Conectar storage S3 y proveedor WhatsApp real.
6. Completar exportaciones y reportes SQL optimizados.
7. Incorporar e2e tests y políticas de backup/observabilidad.

## Fase 1: Análisis y Definición

### Objetivos

- centralizar la operación administrativa y financiera del club
- reducir errores humanos y pérdida de historial
- mejorar cobrabilidad y trazabilidad
- habilitar control ejecutivo con indicadores

### Usuarios del sistema

- superadmin
- administrador general
- tesorería
- operador administrativo
- presidencia o dirección con vista analítica
- lectura/auditoría

### Riesgos funcionales relevantes

- cambios manuales retroactivos sin control
- pagos cargados fuera de período
- socios duplicados por mala identificación
- campañas enviadas a números inválidos
- comprobantes sin asociación correcta

### Decisiones de arquitectura clave

- historial separado del estado actual
- cuenta corriente por cargos + imputaciones
- archivos externos con metadata local
- mensajería por cola/adaptador

## Fase 2: Diseño Funcional

### Requerimientos funcionales organizados

#### Socios

- ABM con baja lógica
- estado actual e historial
- categoría actual e historial
- grupo familiar
- observaciones internas

#### Cuotas

- tipos configurables
- precios versionados
- asignación por socio y categoría
- descuentos y excepciones

#### Cobranzas

- pagos manuales
- imputación múltiple
- pagos parciales
- saldo a favor

#### Finanzas

- otros ingresos
- egresos
- comprobantes
- categorías contables

#### Reportes y dashboard

- filtros persistentes
- exportación
- KPIs

#### Seguridad

- login
- permisos
- auditoría

#### Mensajería

- plantillas
- envíos individuales
- campañas masivas

### Flujos principales

#### 1. Alta de socio

1. operador inicia alta desde padrón
2. completa identidad, contacto y categoría
3. sistema valida duplicados por documento/teléfono/email
4. registra socio
5. crea historial inicial de estado y categoría
6. opcionalmente asigna plan/cuota vigente
7. genera evento de auditoría

#### 2. Cambio de categoría o condición

1. usuario abre ficha
2. selecciona cambio de estado o categoría
3. indica fecha efectiva y motivo
4. sistema cierra vigencia previa
5. crea nuevo registro histórico
6. recalcula elegibilidad de cuota futura
7. audita el cambio

#### 3. Registro de pago

1. tesorería busca socio
2. visualiza deuda abierta
3. ingresa importe, fecha real y método
4. selecciona imputación automática o manual
5. adjunta comprobante si existe
6. sistema crea pago + allocations + cash transaction de ingreso
7. emite recibo interno
8. opcionalmente habilita confirmación por WhatsApp

#### 4. Consulta de historial de socio

1. operador accede a ficha
2. consulta tabs de resumen, historial, pagos y deuda
3. puede filtrar por período y tipo de evento
4. exporta estado de cuenta si corresponde

#### 5. Detección de mora

1. tesorería abre módulo de cuenta corriente
2. filtra por meses adeudados, categoría y rango de deuda
3. sistema calcula listado y aging
4. permite exportar o lanzar campaña

#### 6. Emisión de reporte

1. usuario elige reporte
2. define filtros
3. vista previa en pantalla
4. exporta en formato requerido

#### 7. Registro de ingreso

1. tesorería registra concepto, categoría, importe y método
2. adjunta comprobante opcional
3. sistema crea movimiento y auditoría

#### 8. Registro de egreso con comprobante

1. tesorería registra egreso
2. adjunta o vincula comprobante
3. sistema valida categoría y responsable
4. guarda movimiento y archivo relacionado

#### 9. Envío individual por WhatsApp

1. usuario abre ficha del socio
2. selecciona plantilla
3. sistema previsualiza variables
4. usuario confirma
5. sistema despacha y registra resultado

#### 10. Envío masivo a morosos

1. usuario genera segmento de morosos
2. define plantilla y filtros finales
3. sistema muestra muestra previa y cantidad
4. usuario confirma campaña
5. el envío se procesa asincrónicamente

#### 11. Consulta de auditoría por usuario

1. auditor abre módulo
2. filtra por usuario, entidad, rango y acción
3. ve diff anterior/nuevo

#### 12. Dashboard de presidencia/tesorería

1. usuario ingresa
2. aplica filtro de fecha
3. revisa KPIs, series y alertas
4. navega a listados accionables

### Mapa de navegación

- `Dashboard`
- `Socios`
- `Socios > Nuevo`
- `Socios > Ficha`
- `Tesorería > Pagos`
- `Tesorería > Cuenta Corriente`
- `Tesorería > Ingresos`
- `Tesorería > Egresos`
- `Reportes`
- `Mensajería`
- `Auditoría`
- `Configuración`

## Fase 3: Diseño Técnico

### Arquitectura general

- `web` consume `api` REST
- `api` organiza módulos por dominio
- `Prisma` accede a PostgreSQL
- storage y WhatsApp se conectan vía adaptadores

### Validaciones críticas

- unicidad flexible de documento por club
- importes positivos
- fecha efectiva no nula en cambios históricos
- no superposición de vigencias por socio/plan
- no imputar más que el saldo del pago
- no registrar allocation sobre cargo anulado

### Estrategia de autenticación y autorización

- login con email/username + contraseña
- access token corto
- refresh token persistido con rotación
- guards por permiso y rol

### Estrategia de auditoría

- interceptor o servicio transversal
- captura create/update/delete lógico/acciones de dominio
- serializa before/after en JSONB

### Integración con archivos

- presigned upload
- persistencia local de metadata
- relación polimórfica por `file_link`

### Integración con WhatsApp

- proveedor configurable
- tabla de campañas y despachos
- reintentos y estados

