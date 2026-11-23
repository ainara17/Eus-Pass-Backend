# Eus-Pass — Memoria técnica 
---

## 1. Descripción del proyecto

**Eus-Pass** es una API REST para una aplicación de gamificación cultural. Su objetivo es incentivar la asistencia a eventos culturales mediante misiones y recompensas digitales (badges).

La aplicación obtiene información de eventos culturales de Kulturklik. Los usuarios pueden consultar los eventos y participar en misiones que consisten en asistir a uno o varios eventos. Cuando cumplen los requisitos de una misión, esta se marca como completada y reciben la recompensa correspondiente.

La entrega se centra en el **backend**. No es necesario desarrollar una interfaz gráfica ni un panel de administración.

### Objetivos de la versión mínima

1. Consultar eventos culturales almacenados en nuestra base de datos.
2. Permitir que los usuarios se registren e inicien sesión.
3. Permitir consultar misiones disponibles.
4. Permitir registrar la asistencia de un usuario a un evento.
5. Actualizar el progreso de las misiones y conceder una recompensa cuando se cumplan sus requisitos.
6. Permitir que un administrador cree y gestione misiones.
7. Sincronizar los eventos con Kulturklik.

---

## 2. Alcance: qué se hará y qué se pospone

El plazo es corto, así que se prioriza un flujo completo y funcional antes que muchas funcionalidades a medio hacer.

### Imprescindible para la primera versión

- MongoDB y Mongoose.
- Modelos con validaciones.
- Registro y login con bcrypt y JWT.
- Roles `user` y `admin`.
- Middleware de autenticación y autorización.
- Consultar eventos y misiones.
- Crear misiones como administrador.
- Registrar asistencia mediante un endpoint autenticado.
- Actualizar el progreso de las misiones.
- Conceder automáticamente el badge al completar una misión.
- Gestión centralizada de errores.
- Al menos cuatro tests unitarios sin conexión a MongoDB.
- README, `.env.example` y esta memoria.

### Simplificaciones decididas para llegar al plazo

| Funcionalidad inicialmente planteada | Decisión para la primera versión |
|---|---|
| Validación de asistencia mediante QR | **Se pospone.** La asistencia se registra mediante un endpoint protegido que recibe el ID del evento. |
| Badges especiales por grupos o categorías | Se posponen. Una misión completada concede una recompensa. |
| Varios tipos de misiones complejas | Una misión se completa asistiendo a un número determinado de eventos asociados. |
| Subcategorías temáticas avanzadas | Se pueden mantener como texto opcional o eliminar si no son necesarias. |
| Panel de administración | No se desarrolla; se gestionan los recursos mediante endpoints protegidos. |
| Funcionalidades sociales, rankings o recomendaciones | Fuera del alcance de la primera versión. |
| Subida de imágenes | No se implementa. Se almacenan URLs de imágenes. |

### Decisión importante sobre QR

El QR no forma parte del mínimo funcional. La alternativa sencilla es:

`POST /api/events/:eventId/attend`

El usuario autenticado solicita registrar su asistencia al evento. El backend comprueba que el evento existe y actualiza su progreso. Esto permite demostrar el flujo de gamificación sin implementar generación, caducidad y validación de tokens QR.

Esta alternativa es una simplificación académica: no demuestra que la persona haya estado físicamente en el evento.

---

## 3. Modelo de datos

### 3.1. Decisión para el plazo

Como los cuatro modelos (`User`, `Event`, `Mission` y `Reward`) ya están preparados, **no recomiendo cambiar ahora el diseño de datos para eliminar la colección `rewards`**. Una refactorización a estas alturas puede generar más trabajo y errores que mantenerla.

Se conservan, por tanto, cuatro colecciones:

1. `users`
2. `events`
3. `missions`
4. `rewards`

La simplificación se hará en las funcionalidades: no hace falta construir un CRUD completo e independiente para recompensas. Basta con disponer de badges que puedan asociarse a misiones y concederse al completar sus requisitos. Si hace falta, se pueden crear unos pocos badges iniciales mediante datos de prueba o un seed.

El progreso del usuario y la lista de recompensas obtenidas permanecen embebidos en `User`.

### 3.2. User

Representa a una persona registrada.

Campos principales:

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | String | Nombre visible del usuario. |
| `email` | String | Correo único utilizado para iniciar sesión. |
| `password` | String | Contraseña almacenada como hash bcrypt, nunca en texto plano. |
| `role` | String | Rol `user` o `admin`. Por defecto `user`. |
| `avatar` | String | URL opcional de avatar. |
| `interests` | [String] | Intereses del usuario; opcional en el MVP. |
| `missionProgress` | [Subdocumento] | Progreso del usuario en las misiones. |
| `rewards` | [Subdocumento] | Recompensas obtenidas, si se mantiene esta estructura. |
| `createdAt`, `updatedAt` | Date | Fechas automáticas mediante `timestamps`. |

#### Subdocumento `missionProgress`

Guarda el progreso de un usuario en una misión:

- `missionId`: referencia a `Mission`.
- `attendedEvents`: array de referencias a `Event`.
- `status`: `in_progress` o `completed`.
- `completedAt`: fecha de finalización, inicialmente `null`.

No necesita una colección independiente: forma parte del documento del usuario.

#### Subdocumento de recompensa obtenida

Si se mantiene el array `rewards` en User:

- `rewardId`: referencia a la recompensa o badge.
- `obtainedAt`: fecha en la que se obtuvo.

Los subdocumentos embebidos pueden llevar `{ _id: false }` si no necesitan identificador propio.

### 3.3. Event

Representa un evento cultural recibido de Kulturklik.

Campos principales:

| Campo | Tipo | Descripción |
|---|---|---|
| `externalId` | String | Identificador original de Kulturklik; único. |
| `nameEs`, `nameEu` | String | Nombre en castellano y euskera. |
| `descriptionEs`, `descriptionEu` | String | Descripciones. |
| `startDate` | Date | Fecha de inicio. |
| `endDate` | Date | Fecha de fin, si existe. |
| `type` | Number | Identificador de tipo de Kulturklik, si está disponible. |
| `typeEs`, `typeEu` | String | Tipo traducido. |
| `municipalityEs`, `municipalityEu` | String | Municipio. |
| `placeEs`, `placeEu` | String | Lugar. |
| `image` | String | URL de imagen. |
| `urlEventEs`, `urlEventEu` | String | Enlaces al evento. |
| `status` | String | `active` o `inactive`. |

Se conserva `externalId` para reconocer un evento en sincronizaciones posteriores y evitar duplicados.

### 3.4. Mission

Representa un reto creado por un administrador.

Campos principales:

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | String | Título de la misión. |
| `description` | String | Explicación del reto. |
| `category` | String | Categoría general. |
| `subcategory` | String | Subcategoría opcional. |
| `events` | [ObjectId] | Referencias a los eventos que cuentan para la misión. |
| `requiredEvents` | Number | Número de eventos que hay que completar. |
| `reward` o `rewardId` | Subdocumento o referencia | Badge que se concede al completar la misión. |
| `startDate`, `endDate` | Date | Periodo de validez. |
| `status` | String | `draft`, `active` o `inactive`. |
| `createdBy` | ObjectId | Referencia al usuario administrador que creó la misión. |
| `createdAt`, `updatedAt` | Date | Fechas automáticas. |

`createdBy` permite conservar la autoría de la misión aunque solo los administradores puedan crearla.

### 3.5. Relaciones

```text
USER
 ├── missionProgress[]
 │    ├── missionId ───────────────► MISSION
 │    └── attendedEvents[] ────────► EVENT
 │
 └── rewards[] (si se mantiene)
      └── rewardId ────────────────► REWARD

MISSION
 ├── events[] ────────────────────► EVENT
 └── reward / rewardId ───────────► BADGE
```

En MongoDB se utilizan referencias `ObjectId` cuando los documentos existen de forma independiente y subdocumentos embebidos para información que se consulta junto con el documento principal.

---

## 4. Reglas de negocio

### 4.1. Usuarios y roles

- Una persona puede registrarse como `user`.
- El registro público **nunca debe aceptar el rol enviado por el cliente**.
- El primer usuario administrador se crea mediante un mecanismo controlado (por ejemplo, un seed) o se configura manualmente.
- Las rutas protegidas requieren un JWT válido.
- Las rutas de administración requieren además el rol `admin`.

### 4.2. Misiones

- Solo un administrador puede crear, modificar o desactivar misiones.
- Una misión debe tener al menos un evento asociado.
- `requiredEvents` no puede ser mayor que el número de eventos asociados.
- La fecha de inicio no puede ser posterior a la fecha de fin.
- Las misiones públicas deben estar activas y dentro de su periodo de validez.

### 4.3. Registro de asistencia y progreso

Flujo simplificado:

```text
Usuario autenticado
       |
       v
POST /api/events/:eventId/attend
       |
       v
Comprobar que existe el evento
       |
       v
Buscar misiones activas que incluyan ese evento
       |
       v
Añadir el evento al progreso del usuario
       |
       v
Comprobar los eventos completados
       |
       v
¿Ha alcanzado requiredEvents?
       |
   ┌───┴────┐
   |        |
  NO       SÍ
   |        |
   v        v
Sigue en   Marcar misión
progreso   completed
             |
             v
       Conceder badge
```

Reglas:

- Un usuario no puede registrar dos veces la asistencia al mismo evento para la misma misión.
- Solo cuentan eventos asociados a la misión.
- La misión se completa cuando el número de eventos distintos registrados alcanza `requiredEvents`.
- La recompensa se concede una sola vez.
- El backend determina el progreso; el cliente no debe poder enviar directamente `completed: true` ni concederse un badge a sí mismo.

**Limitación conocida:** en el MVP, el endpoint registra la asistencia a petición del usuario autenticado. No se verifica físicamente su presencia mediante QR.

---

## 5. Integración con Kulturklik

### 5.1. Objetivo

Los eventos se obtienen de la API de Kulturklik y se almacenan en MongoDB. La aplicación consulta nuestra base de datos, no Kulturklik cada vez que un usuario abre la lista de eventos.

### 5.2. Sincronización diaria

Se quiere ejecutar una sincronización automática una vez al día:

```text
Cada día a la hora programada
              |
              v
      kulturklikJob
              |
              v
   kulturklikService
              |
              v
   Petición HTTP a Kulturklik
              |
              v
       Recibir JSON
              |
              v
 Adaptar los campos al modelo Event
              |
              v
       eventRepository
              |
              v
 Crear eventos nuevos y actualizar
 los que ya existen por externalId
              |
              v
          MongoDB
```

Responsabilidades:

- `kulturklikService.js`: realiza la petición HTTP y procesa la respuesta externa.
- `kulturklikJob.js`: programa la ejecución diaria, por ejemplo con `node-cron`.
- `eventRepository.js`: guarda o actualiza los eventos en MongoDB.
- `Event.js`: define el esquema de los eventos.

La URL de la API debe configurarse mediante una variable de entorno, por ejemplo `KULTURKLIK_API_URL`, y no repetirse por el código.

### 5.3. Consideraciones

- La ruta exacta, los parámetros y la paginación deben comprobarse con la documentación vigente de Kulturklik antes de dar la sincronización por terminada.
- Hay que revisar si la respuesta contiene todos los eventos esperados o si hay que recorrer páginas.
- Se utiliza `externalId` como identificador para evitar duplicados.
- Si un evento deja de aparecer en una respuesta, no se debe borrar automáticamente: podría seguir siendo necesario para el historial de asistencias o misiones.
- El servicio debe comprobar `response.ok` y gestionar errores de red y respuestas no válidas.
- `node-cron` ejecuta la tarea mientras el proceso Node está activo. Si el servidor está apagado a la hora programada, no ejecutará esa actualización pendiente automáticamente.
- Para la demostración se puede permitir también una sincronización manual protegida para administradores, si hay tiempo.

---

## 6. Arquitectura del backend

Flujo general:

```text
Cliente
  |
  v
ROUTE
  |
  v
MIDDLEWARES
  |
  v
CONTROLLER
  |
  v
REPOSITORY
  |
  v
MODEL (Mongoose)
  |
  v
MongoDB
```

La integración externa tiene un flujo específico:

```text
JOB / CONTROLLER
       |
       v
KULTURKLIK SERVICE
       |
       v
API EXTERNA
       |
       v
EVENT REPOSITORY
       |
       v
MONGODB
```

### Responsabilidades

| Capa | Responsabilidad |
|---|---|
| `models/` | Esquemas Mongoose, tipos y validaciones de los documentos. |
| `repositories/` | Consultas y operaciones de persistencia con Mongoose. |
| `controllers/` | Recibir la petición, coordinar la operación y responder con HTTP. |
| `routes/` | Asociar métodos y URLs con middlewares y controladores. |
| `middlewares/` | Autenticación, autorización, 404 y gestión centralizada de errores. |
| `services/` | Lógica reutilizable o comunicación con servicios externos, como Kulturklik. |
| `jobs/` | Tareas programadas, como la sincronización diaria. |
| `tests/` | Pruebas unitarias aisladas, sin conexión a MongoDB. |
| `config/` | Configuración de la aplicación y conexión a la base de datos. |

Los repositories son una decisión de organización para separar las consultas a MongoDB. Si la estructura que enseña el profesor es distinta, se puede adaptar sin cambiar las reglas de negocio.

### Estructura de carpetas propuesta

```text
src/
├── app.js
├── index.js
├── config/
│   └── db.js
├── models/
│   ├── User.js
│   ├── Event.js
│   ├── Mission.js
│   └── index.js
├── repositories/
│   ├── userRepository.js
│   ├── eventRepository.js
│   └── missionRepository.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── eventController.js
│   └── missionController.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── eventRoutes.js
│   └── missionRoutes.js
├── middlewares/
│   ├── authMiddleware.js
│   ├── notFoundMiddleware.js
│   └── errorMiddleware.js
├── services/
│   └── kulturklikService.js
├── jobs/
│   └── kulturklikJob.js
└── utils/
    └── errors.js

tests/
├── helpers/
└── unit/
    ├── authMiddleware.test.js
    ├── mission.test.js
    ├── reward.test.js
    └── kulturklik.test.js
```

La estructura es orientativa. No es necesario crear archivos vacíos para todas las carpetas desde el primer día.

---

## 7. Seguridad y autenticación

### 7.1. Registro

- Recibe nombre, email y contraseña.
- Valida los datos.
- Comprueba que el email no esté registrado.
- Guarda la contraseña mediante bcrypt.
- Asigna `role: user` en el servidor.
- Devuelve el usuario sin la contraseña y un JWT, si se sigue ese flujo.

### 7.2. Login

- Busca el usuario por email.
- Compara la contraseña enviada con el hash mediante bcrypt.
- Si coincide, genera un JWT.
- Si no coincide, responde con `401`.

### 7.3. Middleware de autenticación

`verifyToken` comprueba que exista una cabecera `Authorization: Bearer <token>`, valida el JWT y añade la información del usuario a `req`.

### 7.4. Middleware de autorización

`requireRole("admin")` comprueba que el usuario autenticado tenga el rol permitido.

Diferencia:

- **401 Unauthorized:** no está autenticado o el token no es válido.
- **403 Forbidden:** está autenticado, pero no tiene permiso.

### 7.5. Protección de datos

- Nunca devolver contraseñas ni hashes en las respuestas.
- No aceptar `role`, progreso completado o recompensas desde el body de un usuario normal.
- Validar los IDs recibidos.
- Comprobar permisos antes de modificar recursos.
- Guardar secretos y credenciales en `.env`, nunca en Git.

---

## 8. Endpoints mínimos propuestos

La lista definitiva se ajustará a lo que se implemente y pruebe realmente. No se debe documentar como funcional un endpoint que todavía no existe.

| Método | Endpoint | Acceso | Función |
|---|---|---|---|
| `GET` | `/api/events` | Público | Consultar eventos activos. |
| `GET` | `/api/events/:id` | Público | Consultar un evento. |
| `POST` | `/api/events/:eventId/attend` | Autenticado | Registrar asistencia y actualizar progreso. |
| `GET` | `/api/missions` | Público | Consultar misiones activas. |
| `GET` | `/api/missions/:id` | Público | Consultar detalle de misión. |
| `POST` | `/api/missions` | Admin | Crear una misión asociada a una recompensa existente. |
| `PATCH` | `/api/missions/:id` | Admin | Modificar una misión. |
| `POST` | `/api/events/sync` | Admin | Solicitar sincronización manual, si se implementa. |
| `POST` | `/api/auth/register` | Público | Registrar usuario. |
| `POST` | `/api/auth/login` | Público | Iniciar sesión. |
| `GET` | `/api/auth/me` | Autenticado | Consultar usuario actual. |

La ruta de sincronización debe declararse antes de `/api/events/:id` para evitar que `sync` se interprete como un ID.

### Códigos HTTP

| Código | Uso |
|---|---|
| `200 OK` | Consulta o modificación correcta. |
| `201 Created` | Recurso creado correctamente. |
| `400 Bad Request` | Datos inválidos o ID mal formado. |
| `401 Unauthorized` | Falta autenticación o el token no es válido. |
| `403 Forbidden` | El usuario no tiene permisos. |
| `404 Not Found` | El recurso o la ruta no existe. |
| `409 Conflict` | Conflicto, por ejemplo email duplicado. |
| `500 Internal Server Error` | Error inesperado del servidor. |

---

## 9. Testing

Los tests unitarios deben ejecutarse sin conectarse a MongoDB. Se pueden utilizar Jest o Vitest, siguiendo la herramienta y configuración que indique el profesor.

### Cuatro pruebas prioritarias

| Test | Qué comprueba |
|---|---|
| `authMiddleware.test.js` | Que `requireRole` permita al admin, rechace a un user con `403` y rechace una petición sin usuario con `401`, usando `req`, `res` y `next` simulados. |
| `mission.test.js` | Que una misión no acepte un número de eventos requeridos superior a los eventos asociados. |
| `reward.test.js` | Que solo se conceda una recompensa cuando se cumplen los requisitos y que no se conceda dos veces. |
| `kulturklik.test.js` | Que los datos externos se transformen al formato esperado y se gestionen respuestas o errores no válidos. |

Los tests deben probar funciones aisladas. Para simular una llamada HTTP se puede utilizar un `fetch` simulado (*mock*). No es necesario llamar a Kulturklik desde un test unitario.

Si la lógica de validación o recompensa todavía no está separada en funciones comprobables, primero habrá que extraerla o diseñarla para poder probarla.

### Pruebas manuales / integración

Además de los tests unitarios, se comprobará con Postman o una herramienta equivalente:

1. Registro y login.
2. Consulta pública de eventos.
3. Consulta pública de misiones.
4. Creación de misión con usuario admin.
5. Intento de creación de misión con usuario normal.
6. Registro de asistencia.
7. Actualización del progreso y concesión del badge.

Estas pruebas contra la API y MongoDB no sustituyen a los cuatro tests unitarios sin base de datos.

---

## 10. Plan de trabajo hasta el viernes

Orden recomendado, adaptándolo a lo que se aprenda en clase:

### Prioridad 1 — Base técnica
- Revisar estructura y dependencias.
- Conectar MongoDB.
- Comprobar que Express arranca.
- Mantener los modelos y ajustar el alcance mínimo.

### Prioridad 2 — Tests
- Preparar configuración de Vitest o Jest según el profesor.
- Crear helpers para simular `req`, `res` y `next`.
- Escribir los cuatro tests prioritarios.
- Implementar la lógica necesaria para que pasen.

### Prioridad 3 — API mínima
- Repositories necesarios.
- Registro y login.
- Middleware JWT y roles.
- Consultar eventos y misiones.
- Crear misión como admin.
- Registrar asistencia y actualizar progreso.

### Prioridad 4 — Kulturklik
- Confirmar endpoint, parámetros y paginación.
- Obtener los eventos desde el servicio.
- Adaptar los campos al modelo.
- Guardar o actualizar por `externalId`.
- Programar la tarea diaria si el despliegue permite mantener el proceso activo.

### Prioridad 5 — Entrega
- Probar los endpoints con Postman.
- Corregir errores y códigos HTTP.
- Completar README y `.env.example`.
- Actualizar esta memoria para que describa exactamente lo implementado.

### Regla para controlar el alcance

Si falta tiempo, priorizar en este orden:

1. API arranca y conecta con MongoDB.
2. Autenticación y roles.
3. Endpoints funcionales suficientes.
4. Registro de asistencia y progreso básico.
5. Cuatro tests unitarios.
6. Sincronización de Kulturklik.
7. Automatización diaria.
8. QR y funcionalidades extra (pospuestas).

No sacrificar los requisitos obligatorios del profesor por implementar QR o funcionalidades avanzadas.

---

## 11. Retos y decisiones técnicas

### MongoDB frente a SQL

MongoDB almacena documentos BSON con estructura flexible. Mongoose permite definir esquemas, validaciones y referencias desde Node.js.

En Eus-Pass se utilizan:
- Colecciones para usuarios, eventos y misiones.
- Referencias `ObjectId` para relacionar documentos independientes.
- Subdocumentos embebidos para progreso y recompensas del usuario.
- `populate()` cuando se necesita recuperar información de un documento referenciado.

### Sincronización sin duplicados

Cada evento externo se identifica mediante `externalId`. Al sincronizar, se busca si ya existe:
- Si existe, se actualizan los campos recibidos.
- Si no existe, se crea un documento nuevo.

No se deben borrar automáticamente eventos ausentes en una respuesta parcial de Kulturklik.

### QR frente a asistencia sencilla

El QR añade generación de tokens, firma o hash, caducidad, validación y prevención de reutilización. Por el plazo, se pospone y se utiliza un endpoint autenticado. El QR puede añadirse como mejora futura sin cambiar el concepto de progreso de misiones.

---

## 12. Mejoras futuras

- Validación de asistencia mediante QR con token de un solo uso y caducidad.
- Badges especiales por completar varias misiones de una categoría.
- Misiones con reglas y categorías más específicas.
- Recomendaciones de eventos según intereses.
- Rankings y estadísticas de participación.
- Panel de administración.
- Historial y gestión avanzada de asistencia.
- Reintentos y monitorización de la sincronización diaria.
- Despliegue con un scheduler externo o un sistema de tareas persistente.

---

## 13. Correspondencia con los requisitos del profesor

Esta tabla sirve para revisar la entrega. La columna de estado debe actualizarse según lo que realmente esté implementado.

| Requisito recogido | Cómo se plantea en Eus-Pass | Estado |
|---|---|---|
| Node.js y Express | API REST | Pendiente de comprobar |
| MongoDB y Mongoose | Colecciones y esquemas descritos | Modelos preparados; conexión pendiente |
| Al menos 3 entidades y 2 colecciones | User, Event, Mission y Reward en cuatro colecciones | Modelos preparados |
| Validaciones | Esquemas Mongoose y validaciones de negocio | Parcial |
| bcrypt y JWT | Registro, login y middleware | Pendiente de clase |
| Roles user/admin | Campo `role` y `requireRole` | Modelo preparado; middleware JWT pendiente |
| Ownership | Un usuario solo modifica sus propios recursos; admin puede gestionar todos | Definir en endpoints que lo necesiten |
| Al menos 3 endpoints funcionales sin auth (además de registro/login, según el enunciado) | GET eventos, GET misiones y GET detalle | Pendiente |
| Al menos 2 operaciones que modifiquen BD | Crear misión y registrar asistencia; registro de usuario también escribe | Pendiente |
| Separación de rutas, controladores y modelos | Carpetas separadas | Preparación |
| Códigos HTTP requeridos | 200, 201, 400, 401, 403, 404 y gestión centralizada | Middlewares de errores preparados; revisar |
| Mínimo 4 tests unitarios sin BD | Cuatro pruebas de la sección 9 | Pendiente |
| README y `.env.example` | Documentación de instalación, configuración y ejecución | Pendiente |
| Memoria técnica | Este documento | Borrador |

> La memoria debe reflejar el resultado final. Antes de entregar, cambiar los estados y eliminar cualquier funcionalidad descrita que no se haya implementado.

---

## 14. Configuración y variables de entorno

Ejemplo orientativo de `.env.example`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/euspass
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
KULTURKLIK_API_URL=confirm-the-correct-kulturklik-endpoint
```

El `.env` real no debe subirse a GitHub. El `.env.example` sí se comparte, sin secretos reales.

---

## 15. Estado actual conocido del proyecto

- Modelos `User`, `Event`, `Mission` y `Reward` preparados en una primera versión.
- Mongoose instalado.
- `errorMiddleware` y `notFoundMiddleware` preparados.
- Autenticación JWT pendiente de trabajar con el profesor.
- Repositories todavía por implementar por la alumna.
- Servicio inicial `kulturklikService.js` planteado, pero hay que verificar la URL, respuesta, parámetros y paginación de la API.
- Job diario con `node-cron` planteado, todavía sin persistencia ni sincronización completa.
- QR pospuesto a favor de un endpoint autenticado de asistencia.
- Tests pendientes de aprender y configurar siguiendo el ejercicio del profesor.
