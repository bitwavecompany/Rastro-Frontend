# Rastro — Product Requirements Document

> **Versión:** 1.3 (Reglas 10-22: Traslados, formato global de fecha, concurrencia de sesiones, ciclo dual-token, ciclo de vida de cuentas desactivadas, downgrade y modal de exceso)  
> **Fecha:** Octubre 2026  
> **Estado:** Aprobado / En Implementación  

---

## Tabla de Contenidos

1. [Overview](#1-overview)
2. [Usuarios y Entitlements (Planes)](#2-usuarios-y-entitlements-planes)
3. [Cuentas](#3-cuentas)
4. [Movimientos (Transacciones)](#4-movimientos-transacciones)
5. [Dashboard y Reportes](#5-dashboard-y-reportes)
6. [Ciclo de Vida del Dato](#6-ciclo-de-vida-del-dato)
7. [Sincronización Offline](#7-sincronización-offline)
8. [Flujo de Upgrade a Premium](#8-flujo-de-upgrade-a-premium)
9. [Manejo de Límites y Colisiones](#9-manejo-de-límites-y-colisiones)
10. [Autenticación, Sesiones y Gestión de Cuenta](#10-autenticación-sesiones-y-gestión-de-cuenta)
11. [Panel de Administración](#11-panel-de-administración)
12. [Modelos de Datos](#12-modelos-de-datos)
13. [Referencia Rápida de Reglas de Negocio](#13-referencia-rápida-de-reglas-de-negocio)
14. [Preguntas Abiertas y Casos Borde Resueltos](#14-preguntas-abiertas-y-casos-borde-resueltos)
15. [Fuera de Scope (MVP) y Backlog](#15-fuera-de-scope-mvp-y-backlog)
16. [Glosario](#16-glosario)

---

## 1. Overview

**Producto:** Rastro
**Tipo:** Aplicación móvil de gestión financiera personal
**Paradigma central:** Offline-First

### Problema
Las personas necesitan registrar ingresos y gastos desde su teléfono de forma inmediata, sin depender de internet. Las soluciones existentes fallan en conectividad intermitente o pierden datos cuando no hay red.

### Solución
Rastro almacena todos los datos primero en el dispositivo. Cuando hay conexión, sincroniza con la nube de forma silenciosa en segundo plano. La app es completamente funcional sin internet en ningún momento.

### AI Build Brief
> Build a mobile Offline-First personal finance app. All reads and writes hit a local database first. An Outbox pattern queues offline changes and syncs them to the server when connected. The business model is freemium gated solely by the number of active accounts (no transaction limits at any level). Three user states: Guest (local-only, 1 account), Free (3 active accounts, 6-month history, cloud sync), Premium (unlimited accounts, full history, cloud sync, CSV export). Requires a separate admin web portal for manual Premium payment verification and plan management. All cloud data is archived, never deleted — history visibility is controlled by the plan, not by deletion.

---

## 2. Usuarios y Entitlements (Planes)

### 2.1 Tabla de Planes

| | Invitado (Guest) | Free | Premium |
|---|---|---|---|
| **Registro requerido** | No | Sí | Sí |
| **Cuentas activas** | 1 (solo Efectivo) | 3 | Ilimitadas |
| **Movimientos** | Ilimitados | Ilimitados | Ilimitados |
| **Historial visible** | Solo dispositivo local | Últimos 6 meses | Historial completo |
| **Sync con la nube** | ❌ | ✅ | ✅ |
| **Exportar CSV** | ❌ | ❌ | ✅ |
| **Dispositivos simultáneos** | 1 (solo dispositivo local, sin sesión) | 1 dispositivo activo | Ilimitados |

### 2.2 Reglas Críticas del Modelo

- **Los movimientos no tienen límite en ningún plan.** No existe ningún contador de movimientos en el sistema. Nunca mostrar al usuario un contador ni límite de movimientos.
- **El historial archivado nunca se borra del servidor.** El límite de 6 meses del plan Free es un filtro de visibilidad en la API. Hacer upgrade a Premium restaura inmediatamente el historial completo.
- **Los datos del Invitado viven exclusivamente en el dispositivo.** Desinstalar la app destruye permanentemente todos sus datos sin posibilidad de recuperación.
- **El usuario Invitado es cash-only por consecuencia del modelo, no por restricción directa:**
  - Su único slot de cuenta está ocupado por la cuenta por defecto "Efectivo" (tipo `cash`).
  - No puede crear una cuenta de tipo `bank` porque no posee slots disponibles en su plan.
  - Por lo tanto, al seleccionar `transfer` en el registro de movimientos, el listado de cuentas siempre estará vacío y se le presentará el mensaje de conversión hacia el registro de una cuenta gratuita.
  - No se valida el método de pago por plan en el backend; la regla de slots de cuenta lo resuelve implícitamente.
- **Sesiones simultáneas por plan (Regla 12):** Un dispositivo activo equivale exactamente a un refresh token válido en el servidor. El usuario Invitado opera localmente (sin sesión remota); el usuario Free tiene permitido exactamente 1 dispositivo activo a la vez; el usuario Premium cuenta con dispositivos simultáneos ilimitados.

---

## 3. Cuentas

### 3.1 Cuenta por Defecto ("Efectivo")

- Se crea automáticamente para todo usuario nuevo (Invitado o Registrado) al iniciar la app por primera vez.
- Es **inmutable**: el nombre, tipo y saldo inicial no pueden editarse bajo ninguna circunstancia.
- Es **permanente**: no puede desactivarse ni eliminarse.
- Ocupa 1 de los slots de cuenta del plan del usuario.

### 3.2 Campos de una Cuenta

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | string | Requerido. Único por usuario — no se permiten nombres duplicados. |
| `type` | `cash` \| `bank` | Requerido. **Editable** según la existencia de movimientos (ver Sección 3.5). Inmutable únicamente para la cuenta por defecto 'Efectivo'. |
| `initial_balance` | number | Requerido. Debe ser ≥ 0. Editable para corregir errores de ingreso, no como ajuste contable. |
| `description` | string | Opcional. |
| `deactivation_reason` | `'user_action'` \| `'plan_downgrade'` \| `null` | Opcional/Nulable. Controla el mensaje visible en UI y trazabilidad (Regla 17). `null` cuando la cuenta está activa. |
| `deleted_at` | string (ISO8601) \| `null` | `null` = cuenta activa \| timestamp = cuenta desactivada. |

### 3.3 Cálculo del Saldo

El saldo de una cuenta nunca se guarda estáticamente. Se calcula siempre en tiempo de consulta:

```
saldo = saldo_inicial + SUMA(movimientos activos de tipo ingreso) − SUMA(movimientos activos de tipo gasto)
```

"Activo" significa que el movimiento tiene `deleted_at = null`. Los movimientos desactivados **no afectan el saldo**.

### 3.4 Slots de Cuenta

- **Slot** = una unidad de capacidad de cuenta dentro del plan.
- Una cuenta desactivada **libera su slot de inmediato**.
- Una cuenta reactivada **ocupa un slot de inmediato**. Si no hay slot disponible, la reactivación está bloqueada hasta que el usuario libere un slot o haga upgrade.

### 3.5 Edición del Tipo de Cuenta y Cascada a Movimientos (Reglas 4 y 5)

El bloqueo permanente del tipo de cuenta queda formalmente **eliminado del PRD**.

#### Regla 4 — Edición del tipo de cuenta según si tiene movimientos

| Estado de la cuenta | ¿Se puede cambiar el tipo? | Comportamiento |
|---|---|---|
| **Sin movimientos** (activos o desactivados) | ✅ Sí | Cambio libre e inmediato, sin diálogo de confirmación ni cascada. |
| **Con al menos un movimiento** (activo o desactivado) | ✅ Sí, con confirmación | Se muestra un diálogo de advertencia explícito y el usuario debe confirmar la acción antes de aplicar el cambio. |

> **Excepción:** La cuenta por defecto "Efectivo" (`is_default = true`) permanece inmutable y su tipo no puede ser modificado bajo ninguna circunstancia.

#### Regla 5 — Cascada al cambiar el tipo de una cuenta con movimientos

Cuando el usuario cambia el tipo de una cuenta que ya tiene movimientos y confirma la acción en el diálogo de advertencia, el sistema actualiza en cascada el campo `payment_method` de **todos sus movimientos (tanto activos como desactivados)**:

```
cash → bank : todos los movimientos de la cuenta actualizan payment_method a transfer
bank → cash : todos los movimientos de la cuenta actualizan payment_method a cash
```

**Texto obligatorio del aviso de confirmación:**
> *"Cambiar el tipo de esta cuenta actualizará el método de pago de todos sus movimientos. Esta acción no se puede deshacer."*

El modal de confirmación debe contar con dos botones:
- **Cancelar** (con foco por defecto, descarta el cambio de tipo).
- **Confirmar cambio** (estilo de advertencia, ejecuta la mutación y la cascada).

> **Efecto en el saldo:** El cambio de tipo de cuenta y la actualización en cascada de `payment_method` no alteran los montos de los movimientos ni el saldo acumulado de la cuenta; únicamente alinean el método de pago para mantener la coherencia relacional exigida por el sistema.

### 3.6 Reglas Universales de Cuentas Desactivadas (Reglas 16 y 17)

#### Regla 16 — Comportamiento de una cuenta desactivada es universal
El comportamiento de una cuenta desactivada es idéntico independientemente del motivo que la originó. No existen estados de desactivación con reglas distintas.

| Comportamiento | Aplica siempre |
|---|---|
| Sus registros quedan desactivados por cascada (Regla 18) | ✅ |
| No aparece en ningún selector de la app | ✅ |
| Sus registros individuales no son editables | ✅ |
| Sus registros individuales no son reactivables | ✅ |
| Sus registros sí pueden trasladarse a una cuenta activa (Reglas 7 y 10) | ✅ |
| Puede eliminarse permanentemente | ✅ |
| Puede reactivarse si hay slot disponible en el plan | ✅ |

#### Regla 17 — Campo de razón de desactivación en cuentas
Las cuentas tienen un campo `deactivation_reason` que no altera el comportamiento del sistema pero sí controla el mensaje visible al usuario y sirve para trazabilidad de auditoría:

```typescript
deactivation_reason: 'user_action' | 'plan_downgrade' | null
```

| Valor | Cuándo se establece | Mensaje visible en UI |
|---|---|---|
| `null` | Cuenta activa | — |
| `user_action` | El usuario la desactivó manualmente | *"Cuenta desactivada"* |
| `plan_downgrade` | Desactivada durante el flujo de resolución de exceso por downgrade | *"Cuenta desactivada al cambiar tu plan a Free"* |

Al reactivar la cuenta, el campo `deactivation_reason` se restablece automáticamente a `null`.

---

## 4. Movimientos (Transacciones)

### 4.1 Campos de un Movimiento

| Campo | Tipo | Reglas |
|---|---|---|
| `amount` | number | Requerido. Debe ser > 0. Siempre positivo — el campo `type` determina si suma o resta al saldo. |
| `reason` | string | Requerido. Título corto que describe el movimiento. |
| `description` | string | Opcional. Notas adicionales. En traslados desde cuentas desactivadas, anexa la nota de auditoría. |
| `payment_method` | `cash` \| `transfer` | Requerido. Filtra de forma obligatoria las cuentas mostradas en el formulario (ver Sección 4.2). Debe ser coherente con el tipo de cuenta asignada. |
| `type` | `income` \| `expense` | Requerido. Determina la dirección del movimiento en el saldo. |
| `account_id` | string (UUID) | Requerido. Debe referenciar una cuenta **activa** (`deleted_at = null`) cuyo tipo coincida con el `payment_method` (Regla 6). |
| `date` | string (`YYYY-MM-DD` / ISO8601) | Requerido. Fecha real de la transacción. Visible y editable por el usuario. Por defecto toma el momento de creación. Se hereda en traslados (Regla 8). |
| `created_at` | string (ISO8601) | Timestamp exacto de creación en base de datos. Inmutable. Se establece automáticamente. No visible ni editable (Regla 8). |
| `updated_at` | string (ISO8601) | Timestamp de última modificación. Igual a `created_at` al crear. Se actualiza automáticamente. No visible ni editable (Regla 8). |
| `transfer_id` | string (UUID) \| null | Opcional. **Reservado desde MVP para transferencias reales entre cuentas propias (Backlog).** Almacenar como `null`. |
| `category` | string | Opcional. **Reservado para uso futuro.** Almacenar como `null`. |
| `tags` | string[] | Opcional. **Reservado para uso futuro.** Almacenar como `[]`. |
| `deleted_at` | string (ISO8601) \| `null` | `null` = activo \| timestamp = desactivado. |
| `deletion_reason` | string \| `null` | Nota opcional al desactivar manualmente, motivo obligatorio en traslados, o `'cascade_account_deactivation'` al desactivarse por cascada (Reglas 7 y 18). |

### 4.2 Selección de Método de Pago y Filtrado de Cuentas (Reglas 1, 2 y 3)

#### Regla 1 — El método de pago filtra el listado de cuentas disponibles
Al crear o editar un movimiento, el usuario interactúa primero seleccionando el `payment_method`. Ese valor filtra de forma reactiva las cuentas disponibles en el selector de cuentas:

| Método seleccionado | Cuentas que aparecen en el listado |
|---|---|
| `cash` | Solo cuentas activas de tipo `cash` |
| `transfer` | Solo cuentas activas de tipo `bank` |

Si el listado resultante está vacío, el usuario **no puede continuar ni registrar** el movimiento con ese método de pago.

#### Regla 2 — Listado vacío de cuentas muestra mensaje de conversión, no un error genérico
Cuando el usuario selecciona un método de pago y no tiene ninguna cuenta disponible del tipo correspondiente, el listado vacío debe acompañarse obligatoriamente de un mensaje explícito y contextual según su estado:

- **Usuario Invitado al seleccionar `transfer`:**
  > *"Necesitas una cuenta bancaria para registrar transferencias. Regístrate gratis para crearla."*  
  *(Acompañado de un botón de llamado a la acción directo hacia la pantalla de registro).*

- **Usuario Free o Premium sin cuentas bancarias activas al seleccionar `transfer`:**
  > *"Crea una cuenta de tipo banco para registrar transferencias."*  
  *(Acompañado de un botón para crear una nueva cuenta, sujeto a los slots disponibles de su plan).*

- **Usuario sin cuentas activas en efectivo al seleccionar `cash`:**
  > *"No tienes cuentas en efectivo activas disponibles para este método de pago."*

> **Directriz UX:** Nunca mostrar un selector o listado vacío sin una explicación clara y la acción sugerida correspondiente.

#### Regla 3 — El Invitado es cash-only por consecuencia del modelo, no por restricción directa
El usuario Invitado no tiene una restricción directa o artificial sobre el método de pago en su perfil. La restricción surge de forma natural por la arquitectura de slots:
- Su único slot está permanentemente ocupado por la cuenta predeterminada "Efectivo" (tipo `cash`).
- No puede crear una cuenta de tipo `bank` porque no posee slots disponibles en su plan.
- Por lo tanto, al seleccionar `transfer`, el listado de cuentas siempre estará vacío y el sistema le solicitará registrarse.
- No se requiere una validación especial por plan en el código; el sistema de slots y el filtrado por tipo resuelven la regla implícitamente.

### 4.3 Restricción Estricta de Asociación Cuenta-Movimiento (Regla 6)

Al crear o editar un movimiento, se valida rigurosamente en frontend y backend:
1. La cuenta seleccionada debe estar **activa** (`deleted_at = null`). Queda prohibido asociar movimientos a cuentas desactivadas.
2. El tipo de la cuenta debe coincidir exactamente con el `payment_method` seleccionado:
   - `cash` ↔ Cuenta de tipo `cash`
   - `transfer` ↔ Cuenta de tipo `bank`

Si cualquiera de las dos condiciones falla (sea por manipulación de payload o sincronización fuera de orden), el backend rechaza la petición respondiendo con código HTTP **`403` (Forbidden)**.

### 4.4 Manejo de Fechas en Todos los Registros (Regla 8 y Regla 11)

Todo registro del sistema maneja tres fechas con roles distintos:

| Campo | Visible al usuario | Editable por el usuario | Comportamiento |
|---|---|---|---|
| `date` | ✅ Sí | ✅ Sí | Fecha real de la transacción. Por defecto toma el momento de creación. Se hereda en traslados. |
| `created_at` | ❌ No | ❌ No | Timestamp exacto de creación en base de datos. Inmutable. Se establece automáticamente. |
| `updated_at` | ❌ No | ❌ No | Timestamp de la última modificación. Igual a `created_at` al crear. Se actualiza automáticamente en cada cambio. |

#### Captura y Sincronización de Fecha
- **Captura en Frontend:** El formulario solicita al usuario únicamente la fecha mediante un selector estándar (`type="date"`). Por defecto se inicializa en el día actual en formato `YYYY-MM-DD`. El usuario puede modificarla libremente para registrar gastos o ingresos pasados o futuros.
- **Eliminación del campo horario en Cliente:** El frontend no solicita, no registra localmente ni envía la hora (`HH:mm:ss` ni sufijos ISO `T...Z`).
- **Asignación en Backend:** Al recibir el registro o la operación de sincronización, el backend registra la fecha provista (`YYYY-MM-DD`) y le asigna automáticamente la hora actual del servidor (`now()`), garantizando una ordenación cronológica fidedigna y uniforme.

#### Regla 11 — Estándar Global de Formato de Fecha
Toda fecha visible al usuario en cualquier pantalla, mensaje o modal usa obligatoriamente el formato:

```
dd mmm yyyy  →  10 oct 2026
```

Queda estrictamente prohibido usar formato numérico puro (ej. `10/10/2026` ni `2026-10-10`) en interfaces de usuario para evitar ambigüedades día/mes. Este estándar aplica universalmente a:
- Listados de movimientos e historiales.
- Tarjetas y métricas del Dashboard.
- Modales, diálogos y mensajes de advertencia.
- Panel de Administración.
- Correos electrónicos transaccionales y notificaciones.

### 4.5 Edición de Movimientos

Todos los campos de un movimiento activo pueden editarse en cualquier momento. La edición recalcula el saldo de la cuenta afectada en tiempo real.

- **Cambio de método de pago durante la edición:** Si el usuario modifica el `payment_method` en un movimiento existente, el selector de cuentas se refiltra reactivamente según la Regla 1. Si la cuenta que tenía asignada previamente no coincide con el nuevo método, se desasocia y el usuario debe elegir una cuenta válida del nuevo listado para poder guardar.

### 4.6 Traslado de un Registro entre Cuentas (Reglas 7 y 10)

Mover un registro de una cuenta a otra no edita ni borra el original. Es una operación de corrección con trazabilidad completa.

#### Regla 10 — Sin cuenta destino disponible para traslado
La condición de bloqueo no es `accounts.length <= 1` sino:

```typescript
cuentas_activas_del_tipo_destino_excluyendo_cuenta_origen.length === 0
```

Cuando esa condición es verdadera, **el modal de traslado no se abre bajo ninguna circunstancia**. En su lugar, la vista presenta un banner contextual según el plan:

- **Invitado:**
  > *"Necesitas al menos una cuenta destino disponible para realizar traslados. Regístrate gratis para crear más cuentas."*  
  *(Acompañado de botón hacia `/register`).*

- **Free o Premium:**
  > *"Necesitas al menos una cuenta destino disponible para realizar traslados. Crea una nueva cuenta primero."*  
  *(Acompañado de botón hacia `/accounts`).*

#### Flujo de Traslado:
1. El usuario selecciona el método de pago destino y luego la cuenta destino dentro de ese tipo.
2. El sistema muestra un modal de confirmación con resumen:
   - *"Se trasladará de [Cuenta Origen] ([tipo]) a [Cuenta Destino] ([tipo])"*
   - Campo obligatorio: motivo del traslado.
3. Al confirmar, ocurren dos cosas simultáneamente dentro de una transacción atómica:
   - El registro original se **desactiva** en la cuenta origen. El motivo se guarda en `deletion_reason`.
   - Se **crea un nuevo registro** en la cuenta destino heredando los campos del original.

#### Campos del nuevo registro:

| Campo | Comportamiento |
|---|---|
| `amount` | Heredado |
| `reason` | Heredado |
| `description` | Heredado |
| `type` | Heredado |
| `date` | Heredado — conserva la fecha real original del movimiento |
| `account_id` | Nuevo — UUID de la cuenta destino |
| `payment_method` | Derivado automáticamente del tipo de cuenta destino (`cash` si es cash, `transfer` si es bank) |
| `created_at` | Timestamp actual — momento en que se ejecuta el traslado |
| `updated_at` | Igual a `created_at` al momento de creación |

#### Traslado desde una cuenta desactivada hacia una activa (Regla 16):
Cuando se traslada un registro perteneciente a una cuenta desactivada (cuyo motivo original era `deletion_reason: 'cascade_account_deactivation'`):
1. El nuevo registro creado en la cuenta destino nace como **activo** (`deleted_at = null`), por lo que **sí afecta y actualiza de inmediato el saldo de la cuenta destino**.
2. El registro original en la cuenta desactivada permanece desactivado y conserva su `deletion_reason = 'cascade_account_deactivation'` intacto para no destruir la auditoría de cascada, anexando la trazabilidad del traslado en su campo `description`:
   ```
   [Trasladado a Cuenta Destino el dd mmm yyyy: motivo del usuario]
   ```
3. El saldo de la cuenta origen desactivada permanece sin alteraciones (ya estaba excluido).

### 4.7 Sin Límite de Movimientos

No existe ningún límite de movimientos en ningún nivel del plan. Esta restricción no existe en el sistema y no debe implementarse ni comunicarse al usuario.

---

## 5. Dashboard y Reportes

### 5.1 Vista Principal (Dashboard)

| Elemento | Definición |
|---|---|
| **Patrimonio Total** | Suma de los saldos actuales de todas las cuentas activas del usuario. |
| **Ingresos del mes** | Suma de todos los movimientos activos de tipo `income` dentro del mes calendario actual. |
| **Gastos del mes** | Suma de todos los movimientos activos de tipo `expense` dentro del mes calendario actual. |
| **Balance neto del mes** | Ingresos del mes − Gastos del mes. |
| **Movimientos recientes** | Los últimos 8 movimientos de todas las cuentas, ordenados por `date` descendente. |

### 5.2 Vista Detalle de Cuenta

- Muestra el saldo actual de esa cuenta.
- Los movimientos se presentan con tres pestañas: **Todos**, **Ingresos**, **Gastos**.
- Por defecto, solo se muestran movimientos activos.
- Un toggle permite al usuario ver también los movimientos desactivados (en estilo visual atenuado, claramente diferenciado).

### 5.3 Corte de Historial (Plan Free)

- La API retorna únicamente movimientos de los últimos 6 meses para usuarios Free.
- Los movimientos más antiguos existen en el servidor pero la API no los devuelve.
- Al hacer upgrade a Premium, el historial completo está disponible en la siguiente sincronización. No se pierde ningún dato.

---

## 6. Ciclo de Vida del Dato

Esta es la sección más importante para entender el comportamiento del sistema. Existen dos operaciones de borrado completamente distintas.

### 6.1 Desactivar (Soft Delete) — Acción primaria de borrado

Presionar "eliminar" en un movimiento o cuenta ejecuta una **desactivación**, no un borrado físico.

| Propiedad | Comportamiento |
|---|---|
| **Base de datos** | El registro permanece. Se establece `deleted_at` con el timestamp actual. |
| **Saldo** | El movimiento queda excluido de todos los cálculos de saldo. |
| **Slot (solo cuentas)** | La cuenta libera su slot inmediatamente. |
| **Reversible** | Sí — puede reactivarse. |
| **Visual** | El registro aparece atenuado (gris), con estilo claramente deshabilitado. |

**Cascada al desactivar una cuenta (Regla 18):**
Desactivar una cuenta **desactiva automáticamente todos sus movimientos**. Todos los movimientos afectados registran obligatoriamente en base de datos:
```typescript
deletion_reason: 'cascade_account_deactivation'
```
Esto permite auditar e identificar en cualquier momento que dichos registros no fueron desactivados individualmente por el usuario sino como consecuencia directa de la desactivación de su cuenta.

**Sin cascada al reactivar una cuenta:**
Reactivar una cuenta **no reactiva automáticamente sus movimientos**. Cada movimiento debe reactivarse de forma individual para prevenir desajustes involuntarios en saldos.

### 6.2 Eliminar Permanentemente (Hard Delete) — Acción destructiva secundaria

El hard delete elimina físicamente el registro de la base de datos. Es irreversible.

**El hard delete nunca es la acción primaria.** Solo es accesible desde un menú secundario o de confirmación, posterior a una desactivación (salvo la excepción autorizada en el flujo de downgrade).

| Alcance | Punto de acceso | Qué se elimina |
|---|---|---|
| **Movimiento individual** | Menú de acción sobre un movimiento **desactivado** | Solo ese movimiento |
| **Todos los movimientos de una cuenta** | Configuración de la cuenta | Todos los movimientos de esa cuenta. La cuenta en sí no se elimina. |
| **Todo del usuario (global)** | Perfil / Configuración del usuario | Todas las cuentas y todos los movimientos del usuario |
| **Cuenta excedente en Downgrade** | Modal de resolución de exceso de cuentas (Regla 20) | La cuenta y todos sus registros. **Excepción autorizada** al flujo general de desactivación previa para no obligar a un doble paso dentro del bloqueo. |

> **Regla general:** Un movimiento activo **no puede** eliminarse permanentemente en un solo paso. El flujo obligatorio regular es: desactivar → luego eliminar permanentemente.

**Todo hard delete debe mostrar un modal de confirmación** con:
- Mensaje claro: *"Esta acción es permanente y no se puede deshacer. El registro será eliminado de la base de datos."*
- Dos botones: **Cancelar** (foco por defecto) y **Eliminar permanentemente** (estilo destructivo).

### 6.3 Reactivación

| Entidad | ¿Se puede reactivar? | Condición |
|---|---|---|
| Movimiento | Sí | Requiere que la cuenta a la que pertenece esté **activa** (`deleted_at = null`). Si la cuenta padre está desactivada, la cuenta debe reactivarse primero (Regla 6). |
| Cuenta | Sí | Solo si el usuario tiene un slot libre en su plan. Restablece `deleted_at = null` y `deactivation_reason = null`. Sus movimientos permanecen desactivados con `deletion_reason = 'cascade_account_deactivation'`. |
| Cuenta "Efectivo" | N/A | No puede desactivarse. |

#### Advertencia al reactivar un registro trasladado (Regla 9)
Cuando el usuario intenta reactivar un registro que fue origen de un traslado, el sistema muestra un aviso obligatorio antes de confirmar:

> *"Este registro fue trasladado a [Cuenta Destino] el [dd mmm yyyy, ej. 10 oct 2026]. Reactivarlo lo contabilizará nuevamente en esta cuenta, duplicando el movimiento."*

- El sistema **no bloquea la reactivación** — solo informa.
- El usuario decide si cancela o continúa con la reactivación.

### 6.4 Mutación en Cascada por Cambio de Tipo de Cuenta (Regla 5)

A diferencia de las operaciones de borrado que alteran el ciclo de vida (`deleted_at`), el cambio de tipo de una cuenta con movimientos ejecuta una mutación en cascada de atributos relacionales:
- `cash → bank`: Todos los movimientos asociados a la cuenta (tanto activos como desactivados) actualizan su `payment_method` a `transfer`.
- `bank → cash`: Todos los movimientos asociados a la cuenta (tanto activos como desactivados) actualizan su `payment_method` a `cash`.
- Requiere confirmación previa en modal de advertencia y se procesa de forma atómica en el almacenamiento local y en el backend.

### 6.5 Traslado de Registros en el Ciclo de Vida del Dato (Regla 7 y Regla 16)

El traslado de un registro entre cuentas es una operación de corrección histórica con trazabilidad completa:
- **En la cuenta origen:** El registro original se desactiva (Soft Delete). Si la cuenta ya estaba desactivada por cascada, se conserva `deletion_reason = 'cascade_account_deactivation'` y se anexa la nota en `description`. Si estaba activa, el motivo se almacena en `deletion_reason`.
- **En la cuenta destino:** Se crea un nuevo registro idéntico que hereda `amount`, `reason`, `description`, `type` y `date`, asignando la nueva `account_id` y derivando automáticamente el `payment_method` según el tipo de cuenta destino. Nace como **activo** (`deleted_at = null`), sumando o restando inmediatamente al saldo de la cuenta destino.
- Garantiza que los saldos reflejen la corrección sin perder la auditoría histórica del movimiento original.

---

## 7. Sincronización Offline

### 7.1 Principio

Todas las lecturas y escrituras operan primero sobre la **base de datos local del dispositivo**. La app es completamente funcional sin conexión a internet.

### 7.2 Patrón Outbox

Los cambios realizados sin conexión se encolan en una Bandeja de Salida (Outbox) interna, en el orden exacto en que se realizaron. Cuando se detecta conectividad, el motor de sync envía cada operación al servidor en orden y la marca como sincronizada al recibir confirmación.

### 7.3 Dead Letter Queue (DLQ) — Bandeja de Errores

Si el servidor rechaza permanentemente una operación (ej. error HTTP 422 de validación o 403 de permisos), la operación **no se descarta silenciosamente**. Se mueve a la Dead Letter Queue, una bandeja de errores visible en la app donde el usuario puede:

- Revisar la operación fallida y el motivo del error.
- Corregir el dato y reintentarla.
- Descartarla manualmente.

Ninguna operación falla sin que el usuario sea informado.

#### Gestión Jerárquica de Operaciones en la DLQ:
- **Relación Cuenta-Movimiento:** Si la creación de una cuenta es rechazada por el servidor (ej. exceso de slots al sincronizar tras un downgrade), la cuenta y todos los movimientos dependientes de ella van a la DLQ.
- **Descarte en Cascada:** Si el usuario descarta la cuenta rechazada en la DLQ, el sistema descarta automáticamente en cascada todos sus movimientos dependientes para prevenir registros huérfanos corruptos. Requiere confirmación con el mensaje:
  > *"Descartar la [Cuenta] también eliminará los X movimientos asociados que están pendientes de sincronización."*
- **Reintento Secuencial Garantizado:** Si el usuario recupera capacidad de slots (ej. upgrade a Premium) y reintenta la cuenta desde la DLQ, el motor de sincronización garantiza que la cuenta se confirma en el servidor antes de reintentar sus movimientos asociados. Si la cuenta falla, los movimientos no se reintentan.
- **Persistencia en MVP:** Las operaciones fallidas en la DLQ residen indefinidamente sin límite de tiempo ni purga automática, hasta que el usuario actúe explícitamente sobre ellas.

### 7.4 Alcance de la Sincronización

Solo los usuarios registrados (Free y Premium) sincronizan datos con la nube. Los datos del Invitado **nunca se envían al servidor**.

---

## 8. Flujo de Upgrade a Premium

### 8.1 Solicitud del Usuario (Pago por Transferencia)

1. El usuario abre la pantalla de upgrade y presiona **"Mejorar a Premium"**.
2. El usuario completa:
   - `origin_bank`: nombre de su banco.
   - `transfer_receipt`: número del comprobante de transferencia.
3. La solicitud se guarda con `status = pending_verification`.
4. La app muestra: *"Tu solicitud fue recibida. La revisaremos en un plazo máximo de 24 horas."*

**Durante `pending_verification`:**
- El usuario conserva los límites de su plan actual (Free).
- No ocurre ninguna acción automática, sin importar el tiempo transcurrido.
- No se otorga ningún beneficio provisional.
- La solicitud permanece abierta hasta que un admin la gestione manualmente.

### 8.2 Admin: Aprobar Solicitud

1. El admin selecciona la solicitud pendiente y hace clic en **Aprobar**.
2. El plan del usuario cambia a `premium` de inmediato.
3. El servidor **invalida el refresh token activo del usuario** (Regla 15) para forzar la renovación transparente y reflejar el plan `premium` con sus nuevos entitlements.
4. El sistema envía un **email de activación** al usuario (con fechas formateadas en estándar `dd mmm yyyy`, Regla 11).
5. Se registran: `payment_method = transfer`, `payment_verified_by` (ID del admin), `verified_at`.

### 8.3 Admin: Rechazar Solicitud

1. El admin selecciona la solicitud pendiente y hace clic en **Rechazar**.
2. El admin debe completar el campo `rejection_reason` (obligatorio).
3. El servidor **invalida el refresh token activo del usuario** (Regla 15) para reflejar la resolución final de la solicitud.
4. El sistema envía un **email de rechazo** al usuario con el motivo y las instrucciones para reenviar (fechas en estándar `dd mmm yyyy`, Regla 11).
5. El plan del usuario permanece en `free`.
6. Se registran: `rejection_reason`, `payment_verified_by`, `verified_at`.

### 8.4 Admin: Pago en Efectivo (Presencial)

Cuando un usuario paga en persona con efectivo:

1. El admin busca al usuario en el panel y crea el upgrade manualmente.
2. El admin completa `payment_notes` (texto libre, ej. *"Pagó en oficina el 10 oct 2026"*, respetando la Regla 11).
3. El plan del usuario cambia a `premium` de inmediato.
4. El servidor **invalida el refresh token activo del usuario** (Regla 15) para forzar la emisión del token con plan `premium`.
5. El sistema envía el mismo **email de activación** al usuario.
6. Se registran: `payment_method = cash`, `payment_notes`, `payment_verified_by`, `verified_at`.

---

## 9. Manejo de Límites y Colisiones

### 9.1 Invitado Inicia Sesión en Cuenta Existente (Merge)

Cuando un Invitado inicia sesión en una cuenta registrada, el sistema evalúa la fusión antes de completar el login:

```
total_cuentas_activas = cuentas_activas_locales + cuentas_activas_en_nube
```

| Condición | Resultado |
|---|---|
| `total ≤ límite_del_plan` | Merge automático. Los datos locales se suben a la nube. El usuario queda logueado. |
| `total > límite_del_plan` | El merge se bloquea. Se muestra el modal de colisión. |

**Opciones del Modal de Colisión:**

| Opción | Qué ocurre |
|---|---|
| **Descartar datos locales** | Todos los datos locales del Invitado se eliminan permanentemente. El usuario inicia sesión con los datos de la nube únicamente. |
| **Mejorar a Premium** | El usuario envía su comprobante de pago. Permanece como Invitado con todos sus datos locales intactos mientras la verificación está pendiente. |
| **Cancelar** | El modal se cierra. Nada cambia. El usuario sigue como Invitado. |

> Si el usuario cierra la app sin seleccionar una opción: los datos locales se preservan y no ocurre el login.

### 9.2 Invitado Registra una Cuenta Nueva

Actualmente un Invitado tiene solo 1 cuenta (Efectivo), por lo que la migración al registrarse es siempre automática. Si en el futuro el límite del Invitado cambia y hay colisión, aplica el mismo modal del punto 9.1.

### 9.3 Intentar Exceder el Límite de Cuentas

| Disparador | Comportamiento |
|---|---|
| Usuario Free intenta crear una 4ta cuenta activa | Bloqueado. Banner: *"Alcanzaste el límite de 3 cuentas. Desactiva una cuenta o mejora a Premium."* |
| Usuario Free intenta reactivar una cuenta sin slots libres | Bloqueado. Mismo banner. |
| Invitado intenta crear cualquier cuenta adicional | Bloqueado. Banner: *"Crea una cuenta gratuita para agregar más cuentas y respaldar tus datos en la nube."* Dirige al registro, no directamente a Premium. |

### 9.4 Admin Revoca el Plan Premium (Downgrade y Resolución de Exceso de Cuentas)

Cuando un admin degrada manualmente a un usuario Premium a Free:

1. El plan se establece en `free` en el servidor de inmediato.
2. El servidor **invalida todos los refresh tokens activos** del usuario en todos los dispositivos conectados (Regla 15).
3. Los dispositivos conectados reciben HTTP `401`. El usuario puede iniciar sesión nuevamente pero sujeto a la restricción estricta de su nuevo plan: **exactamente 1 dispositivo activo** (Reglas 12 y 13).
4. El usuario recibe un email notificando el cambio de plan (con fecha en estándar `dd mmm yyyy`, Regla 11).
5. Las cuentas del usuario **no se desactivan automáticamente** para prevenir pérdida de datos o decisiones no deseadas sin su intervención.

#### 9.4.1 Modal de Exceso de Cuentas Bloqueante y sin Cierre (Regla 19)
Cuando el usuario abre la app con más cuentas activas que las permitidas por su plan (`cuentas_activas.length > 3` en Free o `> 1` en Invitado), aparece un modal obligatorio de resolución con las siguientes características:

- **Sin cierre:** No tiene botón de cerrar (X), backdrop click descartable ni opción de "recordarme después".
- **Persistente:** Si el usuario minimiza la app o la pasa a segundo plano y vuelve, el modal reaparece de inmediato.
- **Infranqueable:** No existe ninguna forma de navegar a la app sin resolver el exceso primero.
- **Reactivo:** El contador de cuentas a desactivar se actualiza en tiempo real conforme el usuario va actuando.
- **Auto-cierre:** El modal se cierra automáticamente en cuanto el número de cuentas activas llega al límite del plan (`cuentas_activas.length <= 3`).

#### 9.4.2 Contenido del Modal y Acciones por Cuenta Excedente (Regla 20)
El modal muestra un mensaje claro con el estado actual:

> *"Tienes X cuentas activas. Tu plan Free permite 3. Debes desactivar o eliminar Y cuentas para continuar."*

Presenta el listado de todas las cuentas activas elegibles (excluyendo la cuenta por defecto "Efectivo", que es permanente e inmutable). Por cada cuenta excedente el usuario tiene dos acciones disponibles:

| Acción | Resultado |
|---|---|
| **Desactivar** | Libera el slot de inmediato. La cuenta queda en el historial con `deactivation_reason = 'plan_downgrade'` (Regla 17) y todos sus movimientos registran `deletion_reason = 'cascade_account_deactivation'` (Regla 18). |
| **Eliminar permanentemente** | Libera el slot de inmediato. Borra físicamente la cuenta y todos sus registros de forma irreversible. Constituye una **excepción autorizada** al flujo general de desactivación previa (Regla 6.2). Requiere confirmación con modal de hard delete estándar. |

#### 9.4.3 Acciones de Salida Disponibles desde el Modal Bloqueado (Regla 21)
Independientemente del bloqueo, el usuario siempre puede acceder a las siguientes acciones de salida desde el modal:

| Acción | Disponible | Motivo / Comportamiento |
|---|---|---|
| **Cerrar sesión** | ✅ | Derecho básico del usuario. Limpia tokens del dispositivo. |
| **Eliminar cuenta permanentemente** | ✅ | Normativa de privacidad (GDPR). Borra físicamente todos los datos del usuario en cliente y servidor. |
| **Mejorar a Premium** | ✅ | Resuelve el exceso sin perder datos. El usuario completa banco y número de comprobante y envía su solicitud. |
| **Borrar datos locales** (solo Invitado) | ✅ | Equivale a eliminación total de cuenta local. |

**Estado de espera informativa ante solicitud de Upgrade:**  
Como el sistema no otorga beneficios provisionales durante `pending_verification` (Sección 8.1), el modal de exceso no se desbloquea; en su lugar, adopta un estado de espera informativo:
> *"Tu solicitud está en revisión (máx. 24h). Puedes esperar o desactivar cuentas para continuar en plan Free ahora."*

El usuario puede aguardar la aprobación del admin (que restablecerá slots ilimitados) o desactivar cuentas en ese momento para desbloquear el uso de la app de inmediato en Free.

#### 9.4.4 Operaciones Bloqueadas mientras el Exceso Persista (Regla 22)
Mientras el modal de exceso esté activo, el usuario no puede realizar ninguna operación normal de la app:

| Acción | Estado |
|---|---|
| Ver dashboard y balances | ❌ Bloqueado |
| Crear movimientos | ❌ Bloqueado |
| Editar movimientos | ❌ Bloqueado |
| Crear cuentas | ❌ Bloqueado |
| Cualquier navegación dentro de la app | ❌ Bloqueado |

#### 9.4.5 Detección en Escenarios Offline y Prioridad sobre la DLQ:
Si el usuario operaba offline con plan Premium y creó cuentas adicionales que se encolaron en la Outbox, al reconectarse el servidor detecta el plan Free, rechaza las creaciones excedentes y las traslada a la DLQ.
- **Prioridad absoluta:** Las notificaciones y avisos de la DLQ se **suprimen** mientras el modal de exceso esté activo para evitar sobrecargar al usuario.
- **Resolución posterior:** Una vez resuelto el exceso y desbloqueada la app, la DLQ presenta el mensaje explícito:
  > *"Estas operaciones fueron rechazadas porque tu plan cambió a Free mientras estabas sin conexión."*

---

## 10. Autenticación, Sesiones y Gestión de Cuenta

### 10.1 Ciclo de Vida del Token de Autenticación (Regla 14)

El sistema maneja dos tokens por sesión para garantizar seguridad y persistencia sin fricción:

| Token | Duración | Propósito |
|---|---|---|
| **Access token** | 60 minutos | Autoriza cada request a la API en el header `Authorization: Bearer <access_token>`. |
| **Refresh token** | 30 días con renovación automática | Obtiene un nuevo access token de forma transparente sin requerir re-login. |

- **Refresco transparente:** El frontend renueva el access token automáticamente en segundo plano antes de su expiración o reactivamente ante un `401 TOKEN_EXPIRED`. El usuario nunca percibe la expiración del access token.
- **Re-login forzado:** El usuario únicamente ve un re-login forzado cuando el refresh token expira (30 días de inactividad) o es invalidado por el servidor.

### 10.2 Sesiones Simultáneas por Plan (Regla 12)

Un dispositivo activo equivale exactamente a un refresh token válido registrado en la base de datos del servidor:

| Plan | Dispositivos simultáneos permitidos |
|---|---|
| **Invitado** | 1 (sin cuenta, sin sync, sin sesión remota en servidor) |
| **Free** | 1 dispositivo activo |
| **Premium** | Ilimitados |

### 10.3 Control de Concurrencia en Free y Bloqueo en Segundo Dispositivo (Regla 13)

Cuando un usuario Free intenta iniciar sesión en un segundo dispositivo teniendo ya una sesión activa en otro:

1. **El login es rechazado de inmediato por el servidor.** No se desplaza silenciosamente la sesión anterior bajo ninguna circunstancia.
2. El servidor responde con error HTTP **`409 Conflict`** (`code: "SESSION_LIMIT_REACHED"`).
3. El frontend muestra el diálogo obligatorio:
   > *"Ya tienes una sesión activa en otro dispositivo. Cierra esa sesión para continuar aquí, o mejora a Premium para usar Rastro en todos tus dispositivos."*

El usuario dispone de dos acciones:
- **Cerrar sesión en el otro dispositivo:** Invalida el refresh token del dispositivo anterior en el servidor (evento de la Regla 15) y autoriza la emisión de la nueva sesión en el dispositivo actual. Muestra advertencia previa: *"Al iniciar sesión aquí se cerrará tu sesión en el otro dispositivo activo."*
- **Mejorar a Premium:** Redirige al flujo de upgrade para autorizar múltiples dispositivos simultáneos.

### 10.4 Experiencia en Dispositivo Revocado y Protección de Datos Locales

Cuando un dispositivo (Dispositivo A) ve su sesión invalidada remotamente porque el usuario confirmó el ingreso en otro dispositivo (Dispositivo B):

1. **Diferenciación de errores en Backend:** El servidor responde a peticiones subsecuentes del Dispositivo A con código HTTP `401 Unauthorized` diferenciado:
   ```json
   { "code": "SESSION_REVOKED_REMOTE", "message": "Sesión cerrada desde otro dispositivo." }
   ```
2. **Modal Explicativo Frontend:** El cliente intercepta el código y muestra un modal específico en lugar de un error genérico:
   > *"Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Vuelve a iniciar sesión para continuar aquí."*
   
   Acciones disponibles:
   - **Iniciar sesión:** Redirige a la pantalla de login (advirtiendo que cerrará la sesión en el otro dispositivo si sigue en Free).
   - **Eliminar cuenta:** Disponible en todo momento por normativa de privacidad.

3. **Preservación Estricta de Datos Locales (Principio Offline-First):**  
   Recibir un error `401 SESSION_REVOKED_REMOTE` **NUNCA debe purgar la base de datos local ni ejecutar `clearAllLocalData`**.
   - La sincronización con la nube se congela inmediatamente (el Outbox detiene envíos).
   - Todos los movimientos, cuentas y operaciones pendientes registrados offline en IndexedDB (Dexie) **se preservan intactos**.
   - Al volver a iniciar sesión en este dispositivo, se activa el flujo de Merge (Sección 9.1), asegurando que ningún cambio offline se pierda.

### 10.5 Matriz de Eventos que Invalidan el Refresh Token (Regla 15)

El servidor invalida el refresh token del usuario en los siguientes eventos, forzando un nuevo login o renovación de credenciales:

| Evento | Motivo |
|---|---|
| **Admin aprueba o rechaza plan Premium** | El token debe reflejar el nuevo plan y actualizar los claims de entitlements. |
| **Admin revoca plan Premium manualmente** | El usuario pierde beneficios Premium; sesiones previas se invalidan y al re-autenticarse rige el límite de 1 dispositivo. |
| **El usuario cierra sesión manualmente** | Fin de sesión intencional en ese dispositivo. |
| **Usuario Free confirma sesión en segundo dispositivo** | El token del dispositivo anterior se invalida para permitir el nuevo login exclusivo. |
| **El usuario elimina su cuenta** | Fin de cuenta definitivo y destrucción de todas las sesiones asociadas. |

### 10.6 Perfil y Gestión de Cuenta

#### 10.6.1 Usuario Invitado

| Acción | Resultado |
|---|---|
| **Eliminar datos locales** | Destruye el ID temporal local y toda la base de datos del dispositivo. Irreversible. Equivale a una eliminación total de cuenta. Requiere modal de confirmación estándar. |

#### 10.6.2 Usuario Registrado (Free o Premium)

| Acción | Resultado |
|---|---|
| **Cerrar sesión** | Invalida el refresh token en el servidor y limpia la sesión local del dispositivo. Los datos en la nube permanecen íntegros y seguros. |
| **Eliminar cuenta** | Llama a la API para eliminar físicamente todos los datos del usuario del dispositivo y del servidor, invalidando todos sus tokens. Requiere confirmación en dos pasos (confirmar intención + escribir frase de confirmación, ej. "ELIMINAR"). Cumple normativas GDPR/privacidad. |

---

## 11. Panel de Administración

**Acceso:** Portal web separado, con autenticación exclusiva para administradores. No es accesible desde la app móvil.

### 11.1 Funcionalidades

| Funcionalidad | Descripción |
|---|---|
| **Lista de usuarios** | Todos los usuarios registrados con email, fecha de registro y plan actual. |
| **Cola de solicitudes Premium** | Todas las solicitudes en `pending_verification`, ordenadas por fecha, mostrando banco, número de comprobante y tiempo transcurrido desde la solicitud. |
| **Aprobar solicitud** | Cambia el plan a Premium, dispara el email de activación. Registra `payment_verified_by` y `verified_at`. |
| **Rechazar solicitud** | Requiere ingresar `rejection_reason`. Dispara email de rechazo con el motivo. El usuario permanece en Free. |
| **Toggle de plan manual** | Upgrade o downgrade del plan de cualquier usuario directamente (para correcciones o política interna). |
| **Registro de pago en efectivo** | Crear un upgrade Premium para un usuario que pagó presencialmente, con notas libres de pago. |

---

## 12. Modelos de Datos

```typescript
type PlanType = 'guest' | 'free' | 'premium';
type AccountType = 'cash' | 'bank';
type TransactionType = 'income' | 'expense';
type PaymentMethod = 'cash' | 'transfer';
type PremiumRequestStatus = 'pending_verification' | 'approved' | 'rejected';
type OutboxOperation = 'CREATE' | 'UPDATE' | 'DELETE';
type OutboxEntity = 'account' | 'transaction';
type OutboxStatus = 'pending' | 'synced' | 'failed';
type DeactivationReason = 'user_action' | 'plan_downgrade' | null;
type MovementDeletionReason = 'cascade_account_deactivation' | string | null;

interface User {
  id: string;                         // UUIDv7
  email: string | null;               // null para usuarios Invitados
  alias: string | null;               // nombre visible en la app
  plan: PlanType;
  subscription_expires_at: string | null; // ISO8601 — reservado para facturación periódica futura
  created_at: string;                 // ISO8601
  updated_at: string;                 // ISO8601
}

interface Account {
  id: string;                         // UUIDv7
  user_id: string;
  name: string;                       // único por usuario
  type: AccountType;                  // editable con confirmación y cascada (inmutable solo para is_default = true)
  initial_balance: number;            // debe ser ≥ 0
  description: string | null;
  currency: string;                   // reservado para uso futuro — almacenar como "USD"
  is_default: boolean;                // true únicamente para la cuenta "Efectivo" auto-creada
  deactivation_reason: DeactivationReason; // null = activa | 'user_action' | 'plan_downgrade' (Regla 17)
  deleted_at: string | null;          // null = activa | ISO8601 = desactivada
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;                         // UUIDv7
  account_id: string;                 // debe ser cuenta activa y de tipo coincidente con payment_method
  user_id: string;
  amount: number;                     // siempre > 0; el campo type determina su efecto en el saldo
  reason: string;                     // título corto
  description: string | null;         // notas adicionales o trazabilidad de traslados desde cuentas desactivadas
  payment_method: PaymentMethod;      // 'cash' (para cuentas cash) | 'transfer' (para cuentas bank)
  type: TransactionType;
  date: string;                       // 'YYYY-MM-DD' visible y editable; backend asigna hora del servidor (Regla 8)
  category: string | null;            // reservado para uso futuro — almacenar como null
  tags: string[];                     // reservado para uso futuro — almacenar como []
  transfer_id: string | null;         // null = movimiento normal | UUID = transferencias entre cuentas propias (Backlog)
  deleted_at: string | null;          // null = activo | ISO8601 = desactivado
  deletion_reason: MovementDeletionReason; // nota opcional al desactivar, motivo de traslado o 'cascade_account_deactivation' (Regla 18)
  created_at: string;                 // ISO8601 — timestamp inmutable de creación en BD (Regla 8)
  updated_at: string;                 // ISO8601 — timestamp de última modificación del sistema (Regla 8)
}

interface OutboxEntry {
  id: string;                         // UUIDv7
  user_id: string;
  operation: OutboxOperation;
  entity: OutboxEntity;
  payload: Record<string, unknown>;   // snapshot completo de la entidad al momento de la operación
  status: OutboxStatus;
  failure_reason: string | null;
  created_at: string;                 // determina el orden de procesamiento
  synced_at: string | null;
}

interface PremiumRequest {
  id: string;                         // UUIDv7
  user_id: string;
  status: PremiumRequestStatus;
  payment_method: PaymentMethod;
  origin_bank: string | null;         // completado por el usuario (solo pagos por transferencia)
  transfer_receipt: string | null;    // completado por el usuario (solo pagos por transferencia)
  payment_notes: string | null;       // completado por el admin (solo pagos en efectivo, ej. fecha en dd mmm yyyy)
  rejection_reason: string | null;    // completado por el admin al rechazar
  payment_verified_by: string | null; // ID del admin que procesó la solicitud
  verified_at: string | null;         // ISO8601 — timestamp de la decisión del admin
  created_at: string;
  updated_at: string;
}

interface AuthTokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;                 // 3600 segundos (60 minutos) (Regla 14)
}

interface UserSession {
  id: string;                         // UUIDv7
  user_id: string;
  device_name: string | null;         // User-Agent o identificador de dispositivo
  refresh_token_hash: string;
  ip_address: string | null;
  expires_at: string;                 // ISO8601 (30 días desde emisión) (Regla 14)
  created_at: string;
  updated_at: string;
}
```

---

## 13. Referencia Rápida de Reglas de Negocio

| Regla | Definición |
|---|---|
| **Cuenta por defecto** | "Efectivo" se crea automáticamente para todo usuario. Es inmutable, permanente y siempre ocupa 1 slot activo. |
| **Unicidad de nombre de cuenta** | Dos cuentas del mismo usuario no pueden tener el mismo nombre. |
| **Edición de tipo de cuenta (Regla 4)** | Sin movimientos: cambio libre. Con movimientos (activos o desactivados): permitido previa confirmación explícita. Cuenta "Efectivo" permanece inmutable. |
| **Cascada por cambio de tipo (Regla 5)** | Cambiar tipo de cuenta actualiza en cascada el `payment_method` de todos sus movimientos: `cash → bank` pasa a `transfer`; `bank → cash` pasa a `cash`. |
| **Filtrado por método de pago (Regla 1)** | Al crear/editar movimiento, `payment_method` filtra cuentas en el selector (`cash` → tipo `cash`, `transfer` → tipo `bank`). Si la lista queda vacía, no se puede continuar. |
| **Mensaje en listado de cuentas vacío (Regla 2)** | Selector vacío muestra mensaje de conversión contextual según plan (`/register` para Invitado con transfer, `/accounts` para Free/Premium). Nunca lista vacía sin explicación. |
| **Invitado cash-only por modelo (Regla 3)** | Consecuencia del límite de slots (1 slot ocupado por "Efectivo"), no por regla directa. Sin validación artificial de método por plan en backend. |
| **Asociación cuenta-movimiento (Regla 6)** | Todo movimiento debe asociarse a una cuenta **activa** (`deleted_at = null`) y de tipo coincidente (`cash` ↔ `cash`, `transfer` ↔ `bank`). Violación retorna HTTP `403`. |
| **Traslado de un registro (Regla 7)** | Corrección histórica con trazabilidad: original se desactiva en cuenta origen y se crea nuevo registro idéntico en cuenta destino heredando fecha real `date`. |
| **Manejo de fechas (Regla 8)** | Tres fechas por registro: `date` (visible y editable; fecha de la transacción), `created_at` (inmutable; asignado por servidor), `updated_at` (actualizado por el sistema). |
| **Advertencia al reactivar traslado (Regla 9)** | Al reactivar un registro origen de traslado, se advierte potencial duplicación con fecha y cuenta destino. No se bloquea; queda a discreción del usuario. |
| **Bloqueo sin cuenta destino en traslado (Regla 10)** | Condición estricta: `cuentas_activas_del_tipo_destino_excluyendo_cuenta_origen.length === 0`. El modal **no se abre**; muestra banner con CTA hacia `/register` (Invitado) o `/accounts` (Free/Premium). |
| **Formato de fecha global (Regla 11)** | Formato universal `dd mmm yyyy` (ej. `10 oct 2026`). Prohibido formato numérico puro en toda la UI, modales, admin y correos electrónicos. |
| **Sesiones simultáneas por plan (Regla 12)** | 1 dispositivo activo = 1 refresh token válido en servidor. Invitado: 1 local. Free: 1 en servidor. Premium: Ilimitados. |
| **Bloqueo en segundo dispositivo para Free (Regla 13)** | Rechazo no silencioso con HTTP `409`. Frontend ofrece: cerrar sesión remota (invalida token anterior y abre nueva) o mejorar a Premium. |
| **Ciclo de vida dual-token (Regla 14)** | Access token (60 min) + Refresh token (30 días renovable). Refresco transparente e imperceptible para el usuario. |
| **Invalidación de refresh token (Regla 15)** | Servidor invalida refresh token ante 5 eventos: upgrade aprobado/rechazado, downgrade revocado, logout manual, login en 2do dispositivo Free, y eliminación de cuenta. |
| **Comportamiento universal de cuenta desactivada (Regla 16)** | Comportamiento idéntico sin importar origen: cascada a registros, fuera de selectores, registros no editables ni reactivables individualmente, pero registros **sí trasladables a cuentas activas**. |
| **Razón de desactivación en cuentas (Regla 17)** | Campo `deactivation_reason: 'user_action' \| 'plan_downgrade' \| null`. Controla copy en UI y trazabilidad. Se resetea a `null` al reactivar. |
| **Razón de desactivación en registros (Regla 18)** | Movimientos desactivados por cascada registran `deletion_reason: 'cascade_account_deactivation'`. |
| **Modal de exceso sin cierre (Regla 19)** | Infranqueable y sin botón de cierre. Persistente tras background. Contador reactivo y auto-cierre cuando activas <= límite. |
| **Contenido del modal de exceso (Regla 20)** | Muestra X activas e Y excedentes. Acciones por cuenta: Desactivar (`plan_downgrade`) o Eliminar permanentemente (excepción autorizada a desactivación previa). |
| **Salidas desde modal bloqueado (Regla 21)** | Cerrar sesión, Eliminar cuenta permanentemente, Mejorar a Premium (estado de espera informativa sin beneficio provisional), Borrar datos locales (Invitado). |
| **Acciones bloqueadas ante exceso (Regla 22)** | Bloqueo absoluto de dashboard, creación/edición de movimientos, creación de cuentas y navegación general. |
| **Saldo inicial** | Debe ser ≥ 0. No se permiten saldos iniciales negativos. |
| **Monto de movimiento** | Debe ser > 0. Siempre positivo. El campo `type` determina si suma o resta al saldo. |
| **Fórmula de saldo** | `saldo_inicial + SUMA(ingresos activos) − SUMA(gastos activos)`. |
| **Cascada al desactivar cuenta** | Desactivar cuenta desactiva todos sus movimientos en cascada con `deletion_reason = 'cascade_account_deactivation'`. |
| **Sin cascada al reactivar cuenta** | Reactivar cuenta no reactiva sus movimientos. Deben reactivarse individualmente. |
| **Slot al desactivar/reactivar cuenta** | Desactivar libera slot de inmediato; reactivar ocupa slot (bloqueado si no hay slots libres). |
| **Hard delete requiere desactivación previa** | Flujo regular obligatorio: desactivar → luego hard delete (salvo excepción autorizada en modal de downgrade). |
| **Sin límite de movimientos** | Ilimitados en todos los planes. Sin contadores ni topes en la UI. |
| **Historial (Free)** | API devuelve solo últimos 6 meses. Datos antiguos existen archivados en el servidor. |
| **Estado pending_verification** | Mantiene límites Free. Sin timeout. Sin beneficio provisional. SLA: 24 horas. |

---

## 14. Preguntas Abiertas y Casos Borde Resueltos

| # | Tema / Pregunta | Estado / Definición |
|---|---|---|
| 1 | **Fusión de cuentas "Efectivo" en login:** ¿Cómo se combinan las cuentas Efectivo local y en la nube? | **Resuelto:** En el endpoint `/api/auth/register-sync` o proceso de merge, la cuenta local se asocia con la cuenta `is_default: true` de la nube, sumando saldos a través de los movimientos locales reasignados. |
| 2 | **Contenido de emails:** Formato de correos de activación y rechazo. | **Resuelto:** Implementados en backend mediante Mailable templates con formato `dd mmm yyyy` (`PremiumActivatedMail`, `PremiumRejectedMail`, `PlanDowngradedMail`). |
| 3 | **Corte de historial en downgrade:** ¿Hay período de gracia al bajar a Free? | **Resuelto:** Por especificación técnica, la API aplica el filtro de 6 meses de inmediato (`date >= now()->subMonths(6)`). |
| 4 | **Límite técnico de infraestructura:** ¿Existe un tope de resguardo? | Pendiente de monitoreo en producción; actualmente la arquitectura soporta registros ilimitados. |
| 5 | **Cambio de método de pago durante edición:** ¿Qué ocurre con la cuenta seleccionada? | **Resuelto:** El selector filtra según el nuevo método. Si la cuenta anterior es incompatible, se desasocia y el usuario debe elegir una cuenta válida del nuevo tipo para poder guardar. |
| 6 | **Reactivación de movimientos en cuentas desactivadas:** | **Resuelto:** Bloqueado (retorna 403 / 422). Para reactivar un movimiento, la cuenta asociada debe estar activa primero (exige slot libre). |
| 7 | **Consistencia en Sync Offline ante cambio de tipo de cuenta:** | **Resuelto:** Las mutaciones en cascada sobre movimientos se ejecutan en Dexie localmente y se transmiten al backend en lote protegido por transacción de base de datos (`DB::transaction`). |
| 8 | **Diferencia entre Traslado y Transferencia entre cuentas propias:** | **Resuelto:** El **Traslado (Regla 7)** es una *corrección histórica* (1 movimiento desactivado en origen con `deletion_reason` + 1 nuevo movimiento creado en destino con nueva fecha de creación pero misma fecha de transacción). La **Transferencia real (Backlog)** es una *operación financiera en curso* (2 movimientos activos simultáneos: egreso en origen e ingreso en destino, vinculados por `transfer_id`). |
| 9 | **Reactivación de registro trasladado:** ¿Qué advertencia recibe el usuario al reactivar un registro que fue trasladado? | **Resuelto (Regla 9):** El sistema muestra modal informativo indicando la fecha en formato `dd mmm yyyy` y cuenta destino del traslado previo, alertando que reactivarlo duplicará el monto. La acción no se bloquea; queda a discreción del usuario. |
| 10 | **Modal de exceso + pending_verification:** ¿Se otorgan 24h provisionales al enviar comprobante desde el modal de downgrade? | **Resuelto:** **Sin acceso provisional.** Otorgar acceso destruiría el modelo freemium. El modal adopta un estado de espera informativo: *"Tu solicitud está en revisión (máx. 24h). Puedes esperar o desactivar cuentas para continuar en plan Free ahora."* El usuario puede esperar la revisión del admin o actuar para usar la app de inmediato. |
| 11 | **Traslado desde cuenta desactivada hacia activa (Regla 16):** ¿Qué ocurre con saldos y trazabilidad? | **Resuelto:** El nuevo registro en destino nace **activo** (`deleted_at = null`), sumando/restando de inmediato al saldo de la cuenta destino. El registro original desactivado conserva su `deletion_reason: 'cascade_account_deactivation'` intacto y anexa la nota en su campo `description: "[Trasladado a Cuenta Destino el dd mmm yyyy: motivo]"`. |
| 12 | **Hard delete directo en modal de exceso:** ¿Debe desactivarse primero? | **Resuelto:** Se autoriza como **excepción oficial al flujo regular** en las secciones 6.2 y 9.4 para agilizar la resolución del bloqueo sin imponer un engorroso flujo de dos pasos, manteniendo la seguridad mediante el modal de confirmación estándar. |
| 13 | **Reactivación de cuenta desactivada por downgrade:** | **Resuelto:** `deleted_at → null`, `deactivation_reason → null`. Sus movimientos permanecen desactivados con `deletion_reason: 'cascade_account_deactivation'` (no hay reactivación automática en cascada). |
| 14 | **Detección de downgrade en escenarios offline y prioridad sobre DLQ:** | **Resuelto:** El modal de exceso tiene **prioridad absoluta**. Las notificaciones de la DLQ se suprimen mientras el modal de exceso esté activo. Tras resolver el exceso, la DLQ muestra: *"Estas operaciones fueron rechazadas porque tu plan cambió a Free mientras estabas sin conexión."* |
| 15 | **Diferenciación de error 401 en frontend ante cierre de sesión remoto:** | **Resuelto:** El servidor distingue en el cuerpo `{ "code": "SESSION_REVOKED_REMOTE" }` frente a `{ "code": "TOKEN_EXPIRED" }`. Ante revocación remota se despliega un modal específico: *"Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Vuelve a iniciar sesión para continuar aquí."* con botones [Iniciar sesión] (con advertencia de que cerrará la otra sesión) y [Eliminar cuenta]. |
| 16 | **Protección de datos locales ante cierre remoto (Offline-First):** | **Resuelto:** Recibir un 401 por revocación remota **nunca debe purgar la base local de Dexie**. La sync se congela pero los datos y la Outbox permanecen intactos para fusionarse al re-iniciar sesión mediante Merge (Sección 9.1). |
| 17 | **Gestión jerárquica de operaciones en la DLQ:** | **Resuelto:** Si se descarta una cuenta rechazada, sus movimientos dependientes se descartan en cascada con confirmación explícita. Si se reintenta tras recuperar Premium, la cuenta se procesa en el servidor antes de los movimientos dependientes. Las operaciones persisten indefinidamente sin purga automática en MVP. |

---

## 15. Fuera de Scope (MVP) y Backlog

### Backlog — Transferencia real entre cuentas propias

> **Estado:** Fuera de scope en MVP. Las bases de datos están preparadas para implementarla sin migraciones.

**Qué es:** Operación que representa dinero que se movió físicamente de una cuenta a otra en el mundo real (ej. retirar del banco al bolsillo, transferir entre dos bancos propios).

**Diferencia clave con el traslado:**

| Criterio | Traslado (Regla 7) | Transferencia entre cuentas propias (Backlog) |
|---|---|---|
| Qué representa | Una corrección: el registro se guardó en la cuenta equivocada | Un movimiento de dinero real entre dos cuentas del usuario |
| Registro original | Se desactiva con motivo obligatorio (`deletion_reason`) | Permanece activo como egreso en la cuenta origen |
| Nuevo registro | Se crea como duplicado corregido en la cuenta destino | Se crea como ingreso en la cuenta destino |
| Total de registros | 1 activo (en destino) + 1 desactivado (en origen) | 2 activos simultáneamente |
| Impacto en patrimonio | Neutro | Neutro |

**Comportamiento previsto:**

- Requiere al menos 2 cuentas activas.
- El usuario selecciona: cuenta origen, cuenta destino, monto, fecha, motivo y descripción.
- La confirmación genera **dos registros enlazados**:
  - Un gasto (`expense`) en la cuenta origen con el `payment_method` de esa cuenta (`cash` o `transfer`).
  - Un ingreso (`income`) en la cuenta destino con el `payment_method` de esa cuenta (`cash` o `transfer`).
- Ambos registros comparten un identificador común: `transfer_id: UUIDv7`.
- `transfer_id` es `null` en todos los movimientos normales del sistema.
- El campo `transfer_id` queda reservado en el modelo de datos desde el MVP para no requerir migraciones futuras.

---

### Funcionalidades fuera de scope (MVP)

- Transferencias reales entre cuentas propias (diseñadas en Backlog con `transfer_id` reservado)
- Pasarelas de pago (Stripe, PayPhone, PlacetoPay, etc.)
- Notificaciones push — solo notificaciones por email están en scope
- Soporte multi-moneda (campo `currency` reservado en el modelo Account para uso futuro)
- UI de categorías de movimientos (campo `category` reservado en el modelo Transaction)
- Tags y filtrado por tags (campo `tags` reservado)
- Presupuestos o alertas de límite de gasto
- Movimientos recurrentes
- Gráficas y analítica avanzada
- Resolución de conflictos en sync multi-dispositivo más allá del orden secuencial del Outbox
- Cuentas compartidas o colaborativas

---

## 16. Glosario

| Término | Definición |
|---|---|
| **Offline-First** | Paradigma de diseño donde la app lee y escribe primero en una base de datos local del dispositivo. La sync con la nube ocurre de forma asíncrona cuando hay conexión. La app funciona completamente sin internet. |
| **Soft Delete / Desactivar** | Marcar un registro con un timestamp `deleted_at` en lugar de eliminarlo físicamente. El registro permanece en la base de datos pero queda oculto de los flujos normales y es recuperable. |
| **Hard Delete / Eliminar permanentemente** | Eliminar físicamente un registro de la base de datos. La acción es irreversible y el dato no puede recuperarse. |
| **Outbox Pattern (Bandeja de Salida)** | Cola local de operaciones pendientes. Cuando se restaura la conectividad, las operaciones se envían al servidor en el orden en que fueron creadas. |
| **Dead Letter Queue (DLQ) — Bandeja de Errores** | Repositorio visible al usuario donde se almacenan las operaciones que fallaron permanentemente durante la sincronización. El usuario puede revisarlas, corregirlas, reintentarlas o descartarlas manualmente. |
| **Patrimonio Total** | La suma consolidada de los saldos actuales de todas las cuentas activas de un usuario. |
| **Slot** | Una unidad de capacidad de cuenta dentro del plan del usuario. Lo ocupa una cuenta activa; lo libera una cuenta desactivada o eliminada. |
| **Entitlements** | El conjunto de permisos, límites y funcionalidades a los que tiene acceso un usuario según su plan. |
| **Pending Verification** | Estado de una solicitud de upgrade a Premium mientras espera revisión manual del admin. |
| **Merge (Fusión)** | Proceso de combinar los datos locales de un Invitado con los datos en la nube de una cuenta registrada, al momento del login. |
| **Cascade** | Propagación automática de una operación a registros relacionados. Ejemplo: desactivar una cuenta cascadea la desactivación a todos sus movimientos. |
| **Traslado de registro** | Operación de corrección donde un movimiento existente se desactiva en su cuenta original (con motivo registrado en `deletion_reason`) y se crea un nuevo movimiento equivalente en la cuenta destino conservando la fecha de transacción original (`date`). |
| **Transferencia entre cuentas propias** | Operación financiera donde el dinero se mueve entre dos cuentas del mismo usuario, generando dos registros activos vinculados (un egreso en origen y un ingreso en destino) mediante un `transfer_id` común. |