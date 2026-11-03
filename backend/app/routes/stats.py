from fastapi import APIRouter, Depends
from typing import Optional
from datetime import date
from ..database import get_db, DEFAULT_TENANT_ID
from ..models import BusinessInfo
from ..auth import get_current_user_optional

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/dashboard")
def get_dashboard_metrics(
    target_date: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    if not target_date:
        target_date = date.today().isoformat()

    tid = user.get("tenant_id") if user else DEFAULT_TENANT_ID
    conn = get_db()
    cursor = conn.cursor()

    # SoD: Barberos solo ven sus métricas personales
    is_barber = user and user.get("role") == "barber"
    barber_filter = user.get("barber_id") if is_barber else None

    # 1. Sales today
    if barber_filter:
        cursor.execute("""
            SELECT SUM(total), SUM(subtotal), SUM(tip), COUNT(*), SUM(commission_amount) 
            FROM sales 
            WHERE tenant_id = ? AND barber_id = ? AND created_at LIKE ?
        """, (tid, barber_filter, f"{target_date}%"))
    else:
        cursor.execute("""
            SELECT SUM(total), SUM(subtotal), SUM(tip), COUNT(*), SUM(commission_amount) 
            FROM sales 
            WHERE tenant_id = ? AND created_at LIKE ?
        """, (tid, f"{target_date}%"))

    sales_row = cursor.fetchone()
    today_revenue = sales_row[0] or 0.0
    today_tips = sales_row[2] or 0.0
    today_sales_count = sales_row[3] or 0
    today_commissions = sales_row[4] or 0.0

    # 2. Total appointments today
    if barber_filter:
        cursor.execute("SELECT status, COUNT(*) FROM appointments WHERE tenant_id = ? AND barber_id = ? AND date = ? GROUP BY status", (tid, barber_filter, target_date))
    else:
        cursor.execute("SELECT status, COUNT(*) FROM appointments WHERE tenant_id = ? AND date = ? GROUP BY status", (tid, target_date))

    status_counts = {row[0]: row[1] for row in cursor.fetchall()}
    total_appointments = sum(status_counts.values())
    completed_appointments = status_counts.get("completed", 0)
    in_progress = status_counts.get("in_progress", 0)
    confirmed = status_counts.get("confirmed", 0)

    # 3. Barbers ranking
    if barber_filter:
        cursor.execute("""
            SELECT barber_name, COUNT(*) as apt_count, SUM(price) as total_price
            FROM appointments 
            WHERE tenant_id = ? AND barber_id = ? AND date = ? AND status != 'cancelled'
            GROUP BY barber_name
        """, (tid, barber_filter, target_date))
    else:
        cursor.execute("""
            SELECT barber_name, COUNT(*) as apt_count, SUM(price) as total_price
            FROM appointments 
            WHERE tenant_id = ? AND date = ? AND status != 'cancelled'
            GROUP BY barber_name
            ORDER BY apt_count DESC
        """, (tid, target_date))
    top_barbers = [{"name": r["barber_name"], "appointments": r["apt_count"], "revenue": r["total_price"] or 0.0} for r in cursor.fetchall()]

    # 4. Top services
    if barber_filter:
        cursor.execute("""
            SELECT service_name, COUNT(*) as srv_count, SUM(price) as revenue
            FROM appointments
            WHERE tenant_id = ? AND barber_id = ? AND date = ? AND status != 'cancelled'
            GROUP BY service_name
            ORDER BY srv_count DESC
            LIMIT 5
        """, (tid, barber_filter, target_date))
    else:
        cursor.execute("""
            SELECT service_name, COUNT(*) as srv_count, SUM(price) as revenue
            FROM appointments
            WHERE tenant_id = ? AND date = ? AND status != 'cancelled'
            GROUP BY service_name
            ORDER BY srv_count DESC
            LIMIT 5
        """, (tid, target_date))
    top_services = [{"name": r["service_name"], "count": r["srv_count"], "revenue": r["revenue"] or 0.0} for r in cursor.fetchall()]

    # 5. Payment method breakdown
    if barber_filter:
        cursor.execute("""
            SELECT payment_method, SUM(total) as method_total, COUNT(*) as count
            FROM sales
            WHERE tenant_id = ? AND barber_id = ? AND created_at LIKE ?
            GROUP BY payment_method
        """, (tid, barber_filter, f"{target_date}%"))
    else:
        cursor.execute("""
            SELECT payment_method, SUM(total) as method_total, COUNT(*) as count
            FROM sales
            WHERE tenant_id = ? AND created_at LIKE ?
            GROUP BY payment_method
        """, (tid, f"{target_date}%"))
    payment_breakdown = [{"method": r["payment_method"], "total": r["method_total"] or 0.0, "count": r["count"]} for r in cursor.fetchall()]

    # 6. Active barbers count
    cursor.execute("SELECT COUNT(*) FROM barbers WHERE tenant_id = ? AND is_active = 1", (tid,))
    active_barbers_count = cursor.fetchone()[0]

    # Theoretical occupancy
    total_slots_theoretical = (active_barbers_count or 1) * 26
    occupancy_rate = min(100, int((total_appointments / max(1, total_slots_theoretical)) * 100))

    conn.close()

    return {
        "date": target_date,
        "revenue_today": today_revenue,
        "tips_today": today_tips,
        "commissions_today": today_commissions,
        "sales_count": today_sales_count,
        "total_appointments": total_appointments,
        "completed_appointments": completed_appointments,
        "in_progress_appointments": in_progress,
        "confirmed_appointments": confirmed,
        "occupancy_rate_percent": occupancy_rate,
        "top_barbers": top_barbers,
        "top_services": top_services,
        "payment_breakdown": payment_breakdown,
        "active_barbers_count": active_barbers_count
    }

@router.get("/business-info", response_model=BusinessInfo)
def get_business_info(
    slug: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user_optional)
):
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

    cursor.execute("SELECT name, address, phone, currency FROM organizations WHERE id = ?", (tid,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return BusinessInfo(
            name=row["name"],
            slogan="Tecnología para barberías desde la Bolivia real",
            phone=row["phone"] or "+591 71234567",
            address=row["address"] or "Av. 6 de Agosto #2455, Sopocachi, La Paz",
            currency=row["currency"] or "Bs.",
            website="https://apolodigital.lat"
        )
    return BusinessInfo()
