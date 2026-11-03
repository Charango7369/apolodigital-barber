import re
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from ..auth import get_current_user, RequireRole, hash_password

router = APIRouter(prefix="/organizations", tags=["organizations"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text or f"barber-{uuid.uuid4().hex[:6]}"

@router.get("/public")
def get_public_organizations():
    """
    Public listing of active barbershops for client booking portal.
    No authentication required.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, slug, address, phone, currency, created_at
        FROM organizations
        WHERE is_active = 1
        ORDER BY name ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/public/{slug_or_id}")
def get_public_organization_by_slug_or_id(slug_or_id: str):
    """
    Fetch public metadata for a specific barbershop by its slug or ID.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, name, slug, address, phone, currency, created_at
        FROM organizations
        WHERE (id = ? OR slug = ?) AND is_active = 1
    """, (slug_or_id, slug_or_id))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Barbería '{slug_or_id}' no encontrada o inactiva.")
    return dict(row)

@router.get("", response_model=List[OrganizationResponse])
def get_organizations(user: dict = Depends(RequireRole(["superadmin", "owner"]))):
    """
    List all registered barbershops / tenants.
    Superadmin can view all. Owner can view their own.
    """
    conn = get_db()
    cursor = conn.cursor()

    if user.get("role") == "superadmin":
        cursor.execute("SELECT * FROM organizations ORDER BY created_at DESC")
    else:
        cursor.execute("SELECT * FROM organizations WHERE id = ?", (user.get("tenant_id"),))

    rows = cursor.fetchall()
    results = []

    for r in rows:
        org_id = r["id"]
        # Fetch counts
        cursor.execute("SELECT COUNT(*) FROM barbers WHERE tenant_id = ? AND is_active = 1", (org_id,))
        barbers_cnt = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM appointments WHERE tenant_id = ?", (org_id,))
        apts_cnt = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM clients WHERE tenant_id = ?", (org_id,))
        clients_cnt = cursor.fetchone()[0]

        cursor.execute("SELECT email FROM users WHERE tenant_id = ? AND role IN ('owner', 'admin') LIMIT 1", (org_id,))
        admin_row = cursor.fetchone()
        admin_email = admin_row[0] if admin_row else None

        results.append(OrganizationResponse(
            id=r["id"],
            name=r["name"],
            slug=r["slug"],
            address=r["address"] or "",
            phone=r["phone"] or "",
            currency=r["currency"] or "Bs.",
            is_active=bool(r["is_active"]),
            created_at=r["created_at"],
            barbers_count=barbers_cnt,
            appointments_count=apts_cnt,
            clients_count=clients_cnt,
            admin_email=admin_email
        ))

    conn.close()
    return results

@router.post("", response_model=OrganizationResponse)
def create_organization(
    payload: OrganizationCreate,
    user: dict = Depends(RequireRole(["superadmin"]))
):
    """
    Superadmin creates a new barbershop / tenant.
    Initializes organization record, default admin user, and starter services.
    """
    conn = get_db()
    cursor = conn.cursor()

    org_slug = slugify(payload.slug or payload.name)
    org_id = f"org_{org_slug.replace('-', '_')}"

    # Verify uniqueness
    cursor.execute("SELECT id FROM organizations WHERE id = ? OR slug = ?", (org_id, org_slug))
    if cursor.fetchone():
        # Fallback with random suffix
        suffix = uuid.uuid4().hex[:4]
        org_slug = f"{org_slug}-{suffix}"
        org_id = f"org_{org_slug.replace('-', '_')}"

    now_str = datetime.now().isoformat()

    # 1. Insert Organization
    cursor.execute("""
        INSERT INTO organizations (id, name, slug, address, phone, currency, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        org_id,
        payload.name.strip(),
        org_slug,
        payload.address or "",
        payload.phone or "",
        payload.currency or "Bs.",
        1 if payload.is_active else 0,
        now_str
    ))

    # 2. Create Owner User for this barbershop
    admin_email = (payload.admin_email or f"admin@{org_slug}.lat").strip().lower()
    admin_name = payload.admin_name or f"Administrador {payload.name}"
    admin_pw_hash = hash_password(payload.admin_password or "Apolo2026!")

    user_id = f"usr-owner-{uuid.uuid4().hex[:6]}"
    cursor.execute("""
        INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, barber_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        org_id,
        admin_email,
        admin_pw_hash,
        admin_name,
        "owner",
        None,
        1,
        now_str
    ))

    # 3. Clone / Seed Starter Services if requested
    if payload.clone_default_services:
        starter_services = [
            (f"srv-{uuid.uuid4().hex[:6]}", org_id, "Corte Clásico Ejecutivo", "Cortes", 30, 40.0, "Corte a tijera o máquina con peinado.", 1),
            (f"srv-{uuid.uuid4().hex[:6]}", org_id, "Degradado / Fade Moderno", "Cortes", 45, 50.0, "Fade con máquina shaver y perfilado de navaja.", 1),
            (f"srv-{uuid.uuid4().hex[:6]}", org_id, "Ritual de Barba con Toalla Caliente", "Barba", 30, 35.0, "Toalla caliente, vapor y navaja clásica.", 1),
            (f"srv-{uuid.uuid4().hex[:6]}", org_id, "Combo Master (Corte + Barba)", "Combos", 60, 75.0, "Corte completo y arreglo de barba profesional.", 1),
        ]
        cursor.executemany("""
            INSERT INTO services (id, tenant_id, name, category, duration_minutes, price, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, starter_services)

    # 4. Initialize starter open cash shift
    shift_id = f"shift-{uuid.uuid4().hex[:6]}"
    cursor.execute("""
        INSERT INTO cash_shifts (
            id, tenant_id, opened_by_user_id, opened_by_name, opened_at, initial_cash,
            status, system_cash_sales, system_qr_sales, system_total_sales, expected_cash_in_drawer, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        shift_id,
        org_id,
        user_id,
        admin_name,
        now_str,
        100.0,
        "open",
        0.0,
        0.0,
        0.0,
        100.0,
        "Apertura inicial al registrar barbería"
    ))

    conn.commit()
    conn.close()

    return OrganizationResponse(
        id=org_id,
        name=payload.name,
        slug=org_slug,
        address=payload.address or "",
        phone=payload.phone or "",
        currency=payload.currency or "Bs.",
        is_active=True,
        created_at=now_str,
        barbers_count=0,
        appointments_count=0,
        clients_count=0,
        admin_email=admin_email
    )

@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    user: dict = Depends(RequireRole(["superadmin", "owner"]))
):
    # Non-superadmins can only update their own organization
    if user.get("role") != "superadmin" and user.get("tenant_id") != org_id:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar esta barbería.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM organizations WHERE id = ?", (org_id,))
    org = cursor.fetchone()
    if not org:
        conn.close()
        raise HTTPException(status_code=404, detail="Barbería no encontrada.")

    org_dict = dict(org)
    name = payload.name if payload.name is not None else org_dict["name"]
    slug = payload.slug if payload.slug is not None else org_dict["slug"]
    address = payload.address if payload.address is not None else org_dict["address"]
    phone = payload.phone if payload.phone is not None else org_dict["phone"]
    currency = payload.currency if payload.currency is not None else org_dict["currency"]
    is_active = (1 if payload.is_active else 0) if payload.is_active is not None else org_dict["is_active"]

    cursor.execute("""
        UPDATE organizations
        SET name = ?, slug = ?, address = ?, phone = ?, currency = ?, is_active = ?
        WHERE id = ?
    """, (name, slug, address, phone, currency, is_active, org_id))
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM barbers WHERE tenant_id = ? AND is_active = 1", (org_id,))
    barbers_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM appointments WHERE tenant_id = ?", (org_id,))
    apts_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM clients WHERE tenant_id = ?", (org_id,))
    clients_cnt = cursor.fetchone()[0]
    conn.close()

    return OrganizationResponse(
        id=org_id,
        name=name,
        slug=slug,
        address=address or "",
        phone=phone or "",
        currency=currency or "Bs.",
        is_active=bool(is_active),
        created_at=org_dict["created_at"],
        barbers_count=barbers_cnt,
        appointments_count=apts_cnt,
        clients_count=clients_cnt
    )

@router.delete("/{org_id}")
def delete_organization(
    org_id: str,
    user: dict = Depends(RequireRole(["superadmin"]))
):
    if org_id == DEFAULT_TENANT_ID:
        raise HTTPException(status_code=400, detail="No se puede eliminar la barbería matriz principal.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE organizations SET is_active = 0 WHERE id = ?", (org_id,))
    cursor.execute("UPDATE users SET is_active = 0 WHERE tenant_id = ?", (org_id,))
    conn.commit()
    conn.close()
    return {"message": f"Barbería '{org_id}' desactivada con éxito"}
