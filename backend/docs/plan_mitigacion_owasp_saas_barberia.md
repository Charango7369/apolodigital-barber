# Plan de Mitigación y Ejecución de Seguridad OWASP
**Sistema:** ApoloDigital Barber (SaaS Multi-Tenant)  
**Alcance:** Aislamiento de Organizaciones, RBAC, JWT, Segregación de Funciones (SoD), Caja Blindada y QR Simple  
**Referencia:** Auditoría de Seguridad OWASP SaaS Barbería (2 de Noviembre de 2026)  
**Objetivo:** Transformar el prototipo operativo en una arquitectura defensiva comercial lista para producción en Railway/Cloudflare.

---

## 1. Estructura del Plan por Fases de Mitigación

```mermaid
flowchart TD
    subgraph Fase 1: Perímetro y Tenancy
        F1_1["1.1 Esquema multi-tenant (organizations, users, tenant_id)"] --> F1_2["1.2 Módulo Criptográfico JWT + Hashing PBKDF2-SHA256"]
        F1_2 --> F1_3["1.3 Endpoints /api/auth (login, me) y Middleware TenantContext"]
    end

    subgraph Fase 2: RBAC y Segregación SoD
        F2_1["2.1 Inyección de dependencias RequireRole en FastAPI"] --> F2_2["2.2 Aislamiento de Agenda por Barbero (Solo sus citas)"]
        F2_2 --> F2_3["2.3 Blindaje de endpoints administrativos y sanitización pública"]
    end

    subgraph Fase 3: Integridad de Caja y Arqueo Ciego
        F3_1["3.1 Entidad cash_shifts (Turnos de caja)"] --> F3_2["3.2 Endpoints apertura, estado y cierre ciego de caja"]
        F3_2 --> F3_3["3.3 Bloqueo de cobros si caja cerrada + Restricción SoD a barberos"]
    end

    subgraph Fase 4: Validación QR Simple y Anti-Fraude
        F4_1["4.1 Campo qr_reference_code obligatorio"] --> F4_2["4.2 Control de colisión y unicidad por tenant y fecha"]
    end

    subgraph Fase 5: Validación Automatizada
        F5_1["5.1 Suite de pruebas de penetración defensiva"]
    end

    F1_3 --> Fase 2
    F2_3 --> Fase 3
    F3_3 --> Fase 4
    F4_2 --> Fase 5
```

---

## 2. Detalle de Tareas Técnicas por Fase

### Fase 1: Aislamiento Multi-Tenant & Autenticación JWT
- [x] **Tarea 1.1:** Crear tabla `organizations` y tabla `users` con roles `owner`, `admin`, `barber`, `client`.
- [x] **Tarea 1.2:** Agregar migración de columna `tenant_id` en todas las tablas (`services`, `barbers`, `clients`, `appointments`, `sales`).
- [x] **Tarea 1.3:** Sembrar organización demo (`org_apolo_sopocachi`) y usuarios de prueba para cada rol.
- [x] **Tarea 1.4:** Crear `backend/app/auth.py` para hashing con sal (PBKDF2-SHA256) y generación/validación de JWT (HS256).
- [x] **Tarea 1.5:** Exponer router `/api/auth/login` y `/api/auth/me`.

### Fase 2: RBAC y Segregación de Funciones (SoD)
- [x] **Tarea 2.1:** Implementar dependency guard `RequireRole(["owner", "admin"])`.
- [x] **Tarea 2.2:** Restringir `GET /api/appointments`: el barbero solo puede ver las citas donde `barber_id == current_user.barber_id`.
- [x] **Tarea 2.3:** Excluir al rol `barber` de la creación, actualización y eliminación de servicios y comisiones.
- [x] **Tarea 2.4:** Sanitizar el endpoint público `/api/appointments/availability` para no exponer teléfonos ni datos PII.

### Fase 3: Integridad de Caja y Cierre Ciego (`cash_shifts`)
- [x] **Tarea 3.1:** Crear tabla `cash_shifts` con control de apertura (`initial_cash`), cierre ciego (`actual_cash_counted`) y discrepancia (`difference`).
- [x] **Tarea 3.2:** Endpoints `/api/cash/open`, `/api/cash/current` y `/api/cash/close`.
- [x] **Tarea 3.3:** Vincular cada venta en `checkout.py` a la sesión de caja activa (`cash_shift_id`). Si la caja no está abierta, denegar transacción.
- [x] **Tarea 3.4:** Regla SoD en `checkout.py`: El rol `barber` tiene terminantemente prohibido ejecutar cobros.

### Fase 4: Comprobantes QR Simple y Anti-Fraude
- [x] **Tarea 4.1:** Exigir `qr_reference_code` (código de autorización de la banca móvil) en pagos de tipo `qr_simple`.
- [x] **Tarea 4.2:** Validar en base de datos que el código QR no haya sido utilizado en el mismo tenant para evitar estafas por capturas de pantalla reutilizadas.

### Fase 5: Suite de Verificación Defensiva
- [x] **Tarea 5.1:** Ejecutar tests automatizados que simulen ataques BOLA, violaciones SoD y reutilización de códigos QR.
