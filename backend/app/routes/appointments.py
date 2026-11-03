from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
import uuid
from datetime import datetime, date as dt_date, timedelta
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import (
    AppointmentResponse,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentStatusUpdate,
    AvailabilityResponse
)
from ..auth import get_current_user_optional

router = APIRouter(prefix="/appointments", tags=["appointments"])

def time_to_minutes(time_str: str) -> int:
    try:
        parts = time_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        raise HTTPException(status_code=400, detail=f"Formato de hora inválido: '{time_str}'. Usar HH:MM.")

def minutes_to_time(minutes: int) -> str:
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

def validate_working_hours(start_time: str, duration_minutes: int, open_str="08:00", close_str="21:00"):
    start_m = time_to_minutes(start_time)
    end_m = start_m + duration_minutes
    open_m = time_to_minutes(open_str)
    close_m = time_to_minutes(close_str)

    if start_m < open_m or end_m > close_m:
        raise HTTPException(
            status_code=400,
            detail=f"Horario fuera de atención. La barbería atiende de {open_str} a {close_str} (el servicio dura {duration_minutes} min)."
        )

def validate_minimum_notice(date_str: str, time_str: str, min_minutes: int = 15):
    today_str = dt_date.today().isoformat()
    if date_str < today_str:
        raise HTTPException(status_code=400, detail="No se pueden agendar citas en fechas pasadas.")

    if date_str == today_str:
        now = datetime.now()
        now_minutes = now.hour * 60 + now.minute
        target_minutes = time_to_minutes(time_str)
        if target_minutes < now_minutes + min_minutes:
            raise HTTPException(
                status_code=400,
                detail=f"La reserva debe realizarse con al menos {min_minutes} minutos de anticipación. Por favor selecciona un horario posterior."
            )

def validate_no_overlap(
    cursor,
    barber_id: str,
    date_str: str,
    start_time: str,
    duration_minutes: int,
    tenant_id: str = DEFAULT_TENANT_ID,
    exclude_id: Optional[str] = None
):
    """
    Algoritmo Matemático Anti-Solapamiento (Interval Overlap Detection) con Tenant Scoping:
    Dos intervalos [S1, E1) y [S2, E2) chocan si y solo si:
    S1 < E2 AND E1 > S2
    """
    new_start = time_to_minutes(start_time)
    new_end = new_start + duration_minutes

    query = """
        SELECT id, time, duration_minutes, client_name, service_name 
        FROM appointments 
        WHERE tenant_id = ? AND barber_id = ? AND date = ? AND status != 'cancelled'
    """
    params = [tenant_id, barber_id, date_str]

    if exclude_id:
        query += " AND id != ?"
        params.append(exclude_id)

    cursor.execute(query, params)
    existing_apts = cursor.fetchall()

    for apt in existing_apts:
        apt_start = time_to_minutes(apt["time"])
        apt_end = apt_start + apt["duration_minutes"]

        if apt_start < new_end and apt_end > new_start:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Conflicto de horario: El barbero ya tiene una cita ocupada ({apt['service_name']} "
                    f"para '{apt['client_name']}' de {apt['time']} a {minutes_to_time(apt_end)}). "
                    f"Por favor selecciona otro horario o sillón."
                )
            )

@router.get("/availability", response_model=AvailabilityResponse)
def get_availability(
    date: str,
    service_id: str,
    barber_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    slug: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Endpoint Público Sanitizado:
    Calcula los slots realmente libres para un servicio y fecha según su duración.
    OWASP Data Minimization: No expone nombres ni teléfonos de clientes en ningún caso.
    """
    conn = get_db()
    cursor = conn.cursor()

    tid = None
    if tenant_id:
        tid = tenant_id
    elif slug:
        cursor.execute("SELECT id FROM organizations WHERE slug = ? AND is_active = 1", (slug,))
        row = cursor.fetchone()
        if row:
            tid = row[0]

    if not tid:
        tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID

    cursor.execute("SELECT name, duration_minutes, is_active FROM services WHERE id = ? AND tenant_id = ?", (service_id, tid))
    service = cursor.fetchone()
    if not service:
        conn.close()
        raise HTTPException(status_code=404, detail="Servicio no encontrado.")

    duration = service["duration_minutes"]
    service_name = service["name"]

    # Active barbers to check
    if barber_id and barber_id != "all":
        cursor.execute("SELECT id, name FROM barbers WHERE id = ? AND is_active = 1 AND tenant_id = ?", (barber_id, tid))
        barbers = cursor.fetchall()
        if not barbers:
            conn.close()
            raise HTTPException(status_code=404, detail="Barbero no encontrado o inactivo.")
    else:
        cursor.execute("SELECT id, name FROM barbers WHERE is_active = 1 AND tenant_id = ?", (tid,))
        barbers = cursor.fetchall()
        if not barbers:
            conn.close()
            return AvailabilityResponse(
                date=date,
                service_id=service_id,
                service_name=service_name,
                duration_minutes=duration,
                barber_id=barber_id,
                available_slots=[]
            )

    open_m = time_to_minutes("08:00")
    close_m = time_to_minutes("21:00")
    step_m = 30

    today_str = dt_date.today().isoformat()
    now_m = None
    if date == today_str:
        now = datetime.now()
        now_m = now.hour * 60 + now.minute

    available_slots = []
    current_m = open_m

    while current_m + duration <= close_m:
        slot_time = minutes_to_time(current_m)

        if now_m is not None and current_m < now_m + 15:
            current_m += step_m
            continue

        slot_start = current_m
        slot_end = current_m + duration

        has_available_barber = False
        for b in barbers:
            cursor.execute("""
                SELECT time, duration_minutes 
                FROM appointments 
                WHERE tenant_id = ? AND barber_id = ? AND date = ? AND status != 'cancelled'
            """, (tid, b["id"], date))
            booked_apts = cursor.fetchall()

            collision = False
            for apt in booked_apts:
                apt_start = time_to_minutes(apt["time"])
                apt_end = apt_start + apt["duration_minutes"]
                if apt_start < slot_end and apt_end > slot_start:
                    collision = True
                    break

            if not collision:
                has_available_barber = True
                break

        if has_available_barber:
            available_slots.append(slot_time)

        current_m += step_m

    conn.close()
    return AvailabilityResponse(
        date=date,
        service_id=service_id,
        service_name=service_name,
        duration_minutes=duration,
        barber_id=barber_id,
        available_slots=available_slots
    )

@router.get("", response_model=List[AppointmentResponse])
def get_appointments(
    date: Optional[str] = None,
    barber_id: Optional[str] = None,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Segregación de Funciones (SoD) y Multi-Tenant Scoping:
    - Si el usuario autenticado es un 'barber', se le restringe forzosamente a ver únicamente sus propias citas.
    - Si es un 'client', solo ve sus propias citas.
    """
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM appointments WHERE tenant_id = ?"
    params = [tid]

    # SoD: Restringir a barberos a solo su propio barber_id
    if user and user.get("role") == "barber":
        query += " AND barber_id = ?"
        params.append(user.get("barber_id"))
    elif barber_id and barber_id != "all":
        query += " AND barber_id = ?"
        params.append(barber_id)

    # SoD: Restringir a clientes a solo sus citas
    if user and user.get("role") == "client":
        query += " AND (client_id = ? OR client_phone = ?)"
        params.extend([user.get("sub"), user.get("email")])
    elif client_id:
        query += " AND client_id = ?"
        params.append(client_id)

    if date:
        query += " AND date = ?"
        params.append(date)
    if status:
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY date ASC, time ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.post("", response_model=AppointmentResponse)
def create_appointment(
    payload: AppointmentCreate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = payload.tenant_id if payload.tenant_id else (user.get("tenant_id") if user else DEFAULT_TENANT_ID)
    conn = get_db()
    cursor = conn.cursor()

    # 1. Look up barber
    cursor.execute("SELECT id, name, is_active FROM barbers WHERE id = ? AND tenant_id = ?", (payload.barber_id, tid))
    barber = cursor.fetchone()
    if not barber:
        conn.close()
        raise HTTPException(status_code=404, detail="Barbero no encontrado.")
    if not barber["is_active"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Este barbero se encuentra inactivo actualmente.")
    barber_name = barber["name"]

    # 2. Look up service details
    cursor.execute("SELECT id, name, duration_minutes, price, is_active FROM services WHERE id = ? AND tenant_id = ?", (payload.service_id, tid))
    service = cursor.fetchone()
    if not service:
        conn.close()
        raise HTTPException(status_code=404, detail="Servicio no encontrado.")
    if not service["is_active"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Este servicio está temporalmente desactivado.")

    service_name = service["name"]
    duration = payload.duration_minutes or service["duration_minutes"]
    price = payload.price if payload.price is not None and payload.price > 0 else service["price"]

    # 3. Reglas de negocio: horario de atención y anticipación mínima
    validate_working_hours(payload.time, duration)
    validate_minimum_notice(payload.date, payload.time, min_minutes=15)

    # 4. Regla estricta anti-solapamiento con tenant scoping
    validate_no_overlap(cursor, payload.barber_id, payload.date, payload.time, duration, tenant_id=tid)

    # 5. Client link or auto-registration
    client_id = payload.client_id
    if not client_id:
        cursor.execute("SELECT id FROM clients WHERE phone = ? AND tenant_id = ?", (payload.client_phone, tid))
        existing_client = cursor.fetchone()
        if existing_client:
            client_id = existing_client["id"]
        else:
            client_id = f"cli-{uuid.uuid4().hex[:6]}"
            cursor.execute(
                "INSERT INTO clients (id, tenant_id, name, phone, email, notes, total_visits, total_spent, last_visit, created_at) VALUES (?, ?, ?, ?, '', '', 0, 0, ?, ?)",
                (client_id, tid, payload.client_name, payload.client_phone, payload.date, datetime.now().isoformat())
            )

    apt_id = f"apt-{uuid.uuid4().hex[:6]}"
    now_str = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO appointments (
            id, tenant_id, client_id, client_name, client_phone, barber_id, barber_name,
            service_id, service_name, date, time, duration_minutes, price,
            status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        apt_id, tid, client_id, payload.client_name, payload.client_phone,
        payload.barber_id, barber_name, payload.service_id,
        service_name, payload.date, payload.time,
        duration, price, payload.status or "confirmed",
        payload.notes or "", now_str
    ))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.put("/{apt_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    apt_id: str,
    payload: AppointmentStatusUpdate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND tenant_id = ?", (apt_id, tid))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    # SoD: Si es barbero, solo puede actualizar sus propias citas
    if user and user.get("role") == "barber":
        if row["barber_id"] != user.get("barber_id"):
            conn.close()
            raise HTTPException(status_code=403, detail="Violación SoD: No puedes modificar citas asignadas a otro barbero.")

    cursor.execute("UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?", (payload.status, apt_id, tid))

    if payload.status == "completed" and row["client_id"]:
        cursor.execute("""
            UPDATE clients 
            SET total_visits = total_visits + 1,
                last_visit = ?
            WHERE id = ? AND tenant_id = ?
        """, (row["date"], row["client_id"], tid))

    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,))
    updated = cursor.fetchone()
    conn.close()
    return dict(updated)

@router.put("/{apt_id}", response_model=AppointmentResponse)
def update_appointment(
    apt_id: str,
    payload: AppointmentUpdate,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM appointments WHERE id = ? AND tenant_id = ?", (apt_id, tid))
    current = cursor.fetchone()
    if not current:
        conn.close()
        raise HTTPException(status_code=404, detail="Cita no encontrada.")

    # SoD: Barberos solo pueden editar sus propias citas
    if user and user.get("role") == "barber":
        if current["barber_id"] != user.get("barber_id"):
            conn.close()
            raise HTTPException(status_code=403, detail="Violación SoD: Solo puedes editar citas asignadas a tu sillón.")

    # Regla: Cita completada es inmutable
    if current["status"] == "completed":
        conn.close()
        raise HTTPException(status_code=400, detail="Una cita completada y facturada no puede ser modificada.")

    target_barber_id = payload.barber_id or current["barber_id"]
    target_date = payload.date or current["date"]
    target_time = payload.time or current["time"]
    target_duration = payload.duration_minutes or current["duration_minutes"]

    if (payload.date is not None or payload.time is not None or 
        payload.barber_id is not None or payload.duration_minutes is not None):
        validate_working_hours(target_time, target_duration)
        validate_no_overlap(cursor, target_barber_id, target_date, target_time, target_duration, tenant_id=tid, exclude_id=apt_id)

    updates = []
    params = []
    if payload.barber_id is not None:
        cursor.execute("SELECT name FROM barbers WHERE id = ? AND tenant_id = ?", (payload.barber_id, tid))
        b = cursor.fetchone()
        if b:
            updates.append("barber_id = ?")
            params.append(payload.barber_id)
            updates.append("barber_name = ?")
            params.append(b["name"])

    if payload.service_id is not None:
        cursor.execute("SELECT name, duration_minutes, price FROM services WHERE id = ? AND tenant_id = ?", (payload.service_id, tid))
        s = cursor.fetchone()
        if s:
            updates.append("service_id = ?")
            params.append(payload.service_id)
            updates.append("service_name = ?")
            params.append(s["name"])
            if payload.duration_minutes is None:
                updates.append("duration_minutes = ?")
                params.append(s["duration_minutes"])
            if payload.price is None:
                updates.append("price = ?")
                params.append(s["price"])

    if payload.date is not None:
        updates.append("date = ?")
        params.append(payload.date)
    if payload.time is not None:
        updates.append("time = ?")
        params.append(payload.time)
    if payload.duration_minutes is not None:
        updates.append("duration_minutes = ?")
        params.append(payload.duration_minutes)
    if payload.price is not None:
        updates.append("price = ?")
        params.append(payload.price)
    if payload.status is not None:
        updates.append("status = ?")
        params.append(payload.status)
    if payload.notes is not None:
        updates.append("notes = ?")
        params.append(payload.notes)

    if updates:
        params.extend([apt_id, tid])
        cursor.execute(f"UPDATE appointments SET {', '.join(updates)} WHERE id = ? AND tenant_id = ?", params)
        conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (apt_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)

@router.delete("/{apt_id}")
def delete_appointment(
    apt_id: str,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()

    if user and user.get("role") == "barber":
        conn.close()
        raise HTTPException(status_code=403, detail="Violación SoD: Los barberos no pueden eliminar citas del sistema. Solicite la cancelación a Recepción.")

    cursor.execute("DELETE FROM appointments WHERE id = ? AND tenant_id = ?", (apt_id, tid))
    conn.commit()
    conn.close()
    return {"status": "ok", "message": "Cita cancelada y eliminada."}
