# TAREA: Compuerta de Autenticación y Separación de Rutas para ApoloDigital Barber

## Contexto y Planteamiento del Problema

Actualmente, la vista de reservas para clientes y el panel operativo de gestión de la barbería conviven dentro de la misma ruta (`/dashboard`). La alternancia entre la agenda operativa y el portal de clientes está expuesta mediante pestañas en la barra superior de navegación (`Panel Barbería` / `Portal Clientes`).

Esto representa una falla crítica de seguridad y de experiencia de usuario (UX):

1. Los usuarios no autenticados (clientes) tienen visibilidad y acceso potencial a datos operativos internos (horarios de barberos, resúmenes financieros, selector de usuario administrador).
2. Las opciones administrativas y de gestión están expuestas en interfaces públicas.

## Objetivo

Refactorizar la arquitectura de rutas, implementar una compuerta de autenticación (`/login`), configurar protectores de ruta (`ProtectedRoute`) y desacoplar de forma estricta el portal público de reservas del panel operativo/administrativo.

## Criterios de Aceptación

### 1. Desacoplamiento y Estructura de Rutas

* **Ruta Pública de Reservas (`/` o `/reservar`)**:
  * Muestra exclusivamente el flujo de reserva del cliente (Servicios $\rightarrow$ Barbero $\rightarrow$ Horario $\rightarrow$ Datos del Cliente).
  * Eliminar por completo la navegación operativa: retirar botones de `Panel Barbería`, selectores de perfil administrativo y métricas internas.
  * Incluir únicamente un enlace discreto (por ejemplo, en el pie de página o en la esquina superior derecha) titulado `"Acceso Personal"` o `"Acceso Barbería"` que dirija a `/login`.

* **Ruta de Autenticación (`/login`)**:
  * Página dedicada de inicio de sesión diseñada acorde a la línea gráfica actual.
  * Redirige a los usuarios autenticados directamente a `/dashboard`.

* **Ruta Operativa Protegida (`/dashboard` o `/admin/*`)**:
  * Restringida estrictamente detrás de la autenticación.
  * Si un usuario no autenticado intenta acceder, redirigir inmediatamente a `/login`, conservando el parámetro de destino previsto (`?redirect=...`).

### 2. Requerimientos de UI y UX para la Pantalla de Login (`LoginPage`)

* **Estética y Paleta de Colores**:
  * Fondo en modo oscuro alineado a la marca actual (`#070d1e` / slate-950).
  * Colores de acento: Dorado/Ámbar (`#d4af37` / `#f59e0b`) y azules/cian primarios.
  * Tipografía y cabecera: "ApoloDigital BARBER - Acceso Operativo".

* **Controles del Formulario**:
  * Identificador de usuario: Correo electrónico o Nombre de usuario con validación en tiempo real.
  * Campo de contraseña con selector para mostrar/ocultar texto.
  * Botón de envío "Iniciar Sesión" con estado de carga animado (spinner).
  * Enlace rápido de retorno: "← Volver al portal de reservas".

* **Manejo de Errores**:
  * Alertas visuales claras en caso de credenciales inválidas o fallas de servidor.
  * Limitación de intentos en cliente (deshabilitar temporalmente el botón tras varios intentos fallidos consecutivos).

### 3. Implementación de Estado y Seguridad

* **Store / Contexto de Autenticación**:
  * Estado centralizado (Zustand o React Context API) que gestione:
    * `user`: `{ id, name, email, role: 'ADMIN' | 'RECEPCION' | 'BARBERO' } | null`
    * `token`: Cadena JWT Bearer.
    * `isAuthenticated`: booleano.
    * `login(credentials)`: acción asíncrona.
    * `logout()`: acción asíncrona que limpie tokens e invalide el estado.

* **Componente de Guardia de Rutas (`ProtectedRoute`)**:
  * Evalúa el estado de autenticación antes de renderizar las rutas secundarias.
  * Muestra un indicador de carga mientras se verifica el token inicial.

* **Control de Acceso Basado en Roles (RBAC)**:
  * Validar roles antes de exponer pestañas operativas sensibles (`Caja & Checkout`, `Métricas de Negocio`).

* **Refactorización del Encabezado (`DashboardHeader`)**:
  * Reemplazar las pestañas dobles (`Panel Barbería` / `Portal Clientes`) por el indicador de perfil de usuario activo y una acción visible de `"Cerrar Sesión"`.

## Plan de Modificación de Archivos

1. **`src/context/AuthContext.jsx` (o `.tsx`)**:
   * Proveer el estado de autenticación, manejo de persistencia (`localStorage` o cookies) y controladores de inicio/cierre de sesión.

2. **`src/components/auth/ProtectedRoute.jsx`**:
   * Envolver las rutas privadas del panel operativo y gestionar redirecciones no autorizadas.

3. **`src/pages/LoginPage.jsx`**:
   * Construir la pantalla de inicio de sesión conforme a los requisitos visuales.

4. **`src/pages/CustomerBookingPage.jsx`**:
   * Aislar el flujo de reservas de clientes en su propia vista independiente, desacoplada del layout administrativo.

5. **`src/components/layout/DashboardHeader.jsx`**:
   * Limpiar la barra superior: eliminar la pestaña pública y añadir el botón de logout.

6. **`src/App.jsx` (o archivo de enrutamiento)**:
   * Reconfigurar las rutas:
     ```jsx
     <Routes>
       {/* Rutas Públicas */}
       <Route path="/" element={<CustomerBookingPage />} />
       <Route path="/login" element={<LoginPage />} />
     
       {/* Rutas Protegidas del Dashboard */}
       <Route element={<ProtectedRoute />}>
         <Route path="/dashboard" element={<DashboardLayout />}>
           <Route index element={<AgendaCalendarView />} />
           {/* Sub-rutas adicionales */}
         </Route>
       </Route>
     </Routes>
     ```

## Pasos de Verificación y Pruebas

1. Acceder a `/` sin autenticación: Verificar que únicamente se muestre el portal de reservas y que no exista ningún control operativo visible.
2. Intentar ingresar directamente a `/dashboard`: Confirmar la redirección inmediata a `/login`.
3. Ingresar credenciales inválidas en `/login`: Comprobar que aparezca el banner de error correspondiente sin limpiar datos innecesariamente.
4. Ingresar credenciales válidas: Asegurar la redirección a `/dashboard` y la correcta visualización del nombre y rol del usuario en el encabezado.
5. Hacer clic en `"Cerrar Sesión"`: Verificar la eliminación de la sesión y la redirección a `/login`.