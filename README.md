# 💈 ApoloDigital Barber — Booksy Biz Edition

> **Tecnología para barberías desde la Bolivia real.**  
> Sistema integral de gestión de citas, sillones en tiempo real, catálogo de servicios, CRM de clientes con WhatsApp, caja con **QR Simple Bolivia** y portal de autoreserva online.  
> Diseñado e inspirado en **Booksy Biz** y potenciado con la identidad visual y esencia de **[apolodigital.lat](https://apolodigital.lat)**.

---

## 🌟 Características Principales (Booksy Biz Clone)

### 1. 📅 Agenda & Calendario Interactivo
- **Vista Multi-Barbero y Diaria:** Cuadrícula horaria de 08:00 a 20:30 organizada por columnas por cada estilista o en vista continua diaria.
- **Gestión de Estados en Vivo:** 
  - 🔵 **Confirmada:** Con recordatorio automático por WhatsApp listo para enviar.
  - 🟡 **En Sillón (En curso):** Con efecto pulsante para saber quién se está atendiendo en tiempo real.
  - 🟢 **Completada:** Lista para caja o con comprobante emitido.
  - 🔴 **Cancelada / No asistió:** Para control de ausencias.
- **Reserva Rápida en 1 Clic:** Haz clic en cualquier horario libre para abrir la ficha de cita con hora preseleccionada.

### 2. ✂️ Catálogo de Servicios & Tarifas
- Gestión completa de cortes y tratamientos organizados por categorías: *Cortes*, *Barba*, *Combos*, *Tratamientos*.
- Servicios precargados reales: *Degradado / Low & Mid Fade*, *Corte Clásico Ejecutivo*, *Arreglo de Barba con Toalla Caliente*, *Combo Apolo Master*, *Camuflaje de Canas / Platinado*, *Diseño Freestyle*, etc.
- Configuración de precios en **Bolivianos (Bs.)** y duraciones en sillón (15, 30, 45, 60 min).

### 3. 👥 Clientes & CRM con Integración WhatsApp
- Directorio de clientes con historial de visitas y consumo acumulado.
- **Ficha de Preferencia de Estilo:** Guarda las notas del cliente (ej. *"Fade en #1 bajo, navaja limpia en contornos, no cera pegajosa"*).
- **Botón Directo de WhatsApp:** Envía recordatorios personalizados con un solo clic a través de `https://wa.me/591...` sin necesidad de guardar números.

### 4. 💈 Equipo de Barberos & Comisiones
- Fichas individuales con foto de perfil, apodo (*"El Master"*, *"Don Barba"*, *"El Artista"*), teléfono y especialidad.
- Cálculo de comisiones por barbero (ej. 50%, 60%) para liquidación transparente.
- Indicador de estado activo / descanso en sillón.

### 5. 💳 Caja & Punto de Venta (POS)
- Cobro rápido de citas en curso o clientes directos sin reserva (*walk-in*).
- Cálculo de productos adicionales (ceras, pomadas, aceites de barba) y propinas para el barbero.
- **Métodos de pago adaptados a Bolivia:**
  - 📱 **QR Simple Bolivia:** Generación visual del código QR compatible con Banco Unión, BCP, BNB, Banco Sol, etc.
  - 💵 **Efectivo:** Calculadora automática de cambio / vuelto en Bs.
  - 💳 **Tarjeta / POS físico.**
- **Comprobante Digital de Barbería:** Ticket estilizado listo para imprimir o enviar. Celebración con lluvia de confeti al completar el cobro.

### 6. 📊 Métricas de Negocio & Reportes
- Tarjetas KPI: Ingresos de hoy (Bs.), propinas acumuladas, citas atendidas y tasa de ocupación de sillones (%).
- **Ranking de Barberos:** Tabla de rendimiento en tiempo real con mejores recaudaciones.
- **Servicios Estrella:** Gráfico de cortes más demandados.
- Historial detallado de todas las transacciones de caja.

### 7. 📱 Portal de Autoreserva para Clientes (Booksy Client App)
- Modo público interactivo conmutable desde la barra superior:
  - **Paso 1:** El cliente selecciona su servicio preferido.
  - **Paso 2:** Selecciona a su barbero favorito o la opción *"Cualquier barbero disponible"*.
  - **Paso 3:** Escoge el día y hora libre en la agenda.
  - **Paso 4:** Ingresa sus datos (Nombre y WhatsApp).
  - **Paso 5:** Confirmación instantánea con botón de envío de resumen por WhatsApp a la barbería.

---

## 🎨 El Sello de Apolodigital.lat

La aplicación fue construida respetando la estética oficial de **apolodigital.lat**:
- **Paleta de Colores:**
  - Azul Nocturno Profundo: `#0a1628`
  - Azul Superficie / Tarjetas: `#0d2347` & `#102a54`
  - Azul Eléctrico Apolo: `#1a4fd6` / `#3b82f6` / `#60a5fa`
  - Acento Dorado Barbería: `#f0b429` & `#fbbf24`
- **Tipografías Oficiales:**
  - `Syne` para logotipos, encabezados de impacto y números de precios.
  - `DM Sans` para el cuerpo, menús y formularios limpios.
- **Textura de Ruido Sutil y Glassmorphism:** Microtextura ambiental con bordes brillantes y desenfoque de cristal.
- **Isotipo Oficial:** Logo original de ApoloDigital incrustado como favicon y encabezado.

---

## 🚀 Cómo Ejecutar la Aplicación

### Método 1: Lanzador Rápido en Windows (Recomendado)
Simplemente haz doble clic en el archivo:
```bat
start_app.bat
```
Este script:
1. Inicia el servidor Backend FastAPI en `http://localhost:8000`.
2. Inicia el Frontend Vite en `http://localhost:5173`.
3. Abre tu navegador web predeterminado automáticamente.

---

### Método 2: Servidor Unificado de Producción (Python Directo)
El frontend ya se encuentra compilado en `frontend/dist`. Puedes correr toda la aplicación con un solo comando:
```bash
python main.py
```
Abre tu navegador en:
- **Aplicación completa:** [http://localhost:8000](http://localhost:8000)
- **Documentación Swagger API:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Método 3: Entorno de Desarrollo Separado

#### Backend (FastAPI):
```bash
start_backend.bat
# o manualmente:
python main.py
```

#### Frontend (React + Vite):
```bash
start_frontend.bat
# o manualmente:
cd frontend
npm run dev
```

---

### Método 4: Docker & Docker Compose
```bash
docker-compose up --build
```
La aplicación estará disponible en [http://localhost:8000](http://localhost:8000).

---

## 📁 Estructura del Proyecto

```
Apolodigital-Barber/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py         # Persistencia SQLite con seed inicial de datos
│   │   ├── models.py           # Modelos Pydantic (Citas, Servicios, Clientes, etc.)
│   │   ├── main.py             # Servidor FastAPI, CORS y montaje estático SPA
│   │   └── routes/
│   │       ├── appointments.py # Endpoints de agenda y citas
│   │       ├── barbers.py      # Endpoints de estilistas y comisiones
│   │       ├── checkout.py     # Endpoints de cobro y ventas
│   │       ├── clients.py      # Endpoints de clientes y notas
│   │       ├── services.py     # Endpoints de servicios y precios
│   │       └── stats.py        # Endpoints de métricas y dashboard
│   ├── barber.db               # Base de datos SQLite inicializada
│   └── requirements.txt        # Dependencias Python
├── frontend/
│   ├── public/
│   │   └── isotipo-apolo.png   # Isotipo oficial de apolodigital.lat
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgendaView.tsx          # Calendario y timeline Booksy Biz
│   │   │   ├── AppointmentModal.tsx    # Modal para nueva cita
│   │   │   ├── BarbersView.tsx         # Gestión del equipo
│   │   │   ├── ClientBookingView.tsx   # Portal público para clientes
│   │   │   ├── ClientsView.tsx         # CRM de clientes y WhatsApp
│   │   │   ├── Navbar.tsx              # Barra superior con selector de modo
│   │   │   ├── PosView.tsx             # Caja, QR Simple y comprobantes
│   │   │   ├── ServicesView.tsx        # Catálogo de servicios y precios
│   │   │   ├── Sidebar.tsx             # Menú lateral
│   │   │   └── StatsView.tsx           # Métricas del negocio
│   │   ├── services/
│   │   │   └── api.ts                  # Cliente fetch para la API
│   │   ├── types/
│   │   │   └── index.ts                # Tipos TypeScript
│   │   ├── App.tsx                     # Componente principal
│   │   ├── index.css                   # Estilos Tailwind + tema apolodigital.lat
│   │   └── main.tsx                    # Entrada React
│   ├── dist/                           # Bundle de producción compilado
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── main.py                     # Punto de entrada raíz de la aplicación
├── start_app.bat               # Lanzador unificado para Windows
├── start_backend.bat           # Lanzador backend
├── start_frontend.bat          # Lanzador frontend
├── Dockerfile                  # Docker multi-stage build
├── docker-compose.yml          # Orquestador Docker
└── README.md                   # Esta documentación
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend:** Python 3.14 / 3.11, FastAPI, Uvicorn, Pydantic, SQLite3.
- **Diseño & Marca:** [apolodigital.lat](https://apolodigital.lat) — Fuentes Google *Syne* y *DM Sans*, paleta azul nocturna y dorada.
- **Integraciones Locales:** Moneda en Bolivianos (Bs.), simulador de QR Simple interoperable boliviano y enlaces universales a WhatsApp.
