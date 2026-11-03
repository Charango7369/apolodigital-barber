import sqlite3
import os
import uuid
from datetime import datetime, date, timedelta
from .auth import hash_password

DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "barber.db"))
DEFAULT_TENANT_ID = "org_apolo_sopocachi"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Organizations (Tenants)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        address TEXT,
        phone TEXT,
        currency TEXT DEFAULT 'Bs.',
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # 2. Users (RBAC & Authentication)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        email TEXT NOT NULL,
        hashed_password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'owner', 'admin', 'barber', 'client'
        barber_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY(tenant_id) REFERENCES organizations(id),
        UNIQUE(tenant_id, email)
    )
    """)

    # 3. Cash Shifts (Cierre ciego & Control de Turnos)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cash_shifts (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        opened_by_user_id TEXT NOT NULL,
        opened_by_name TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        initial_cash REAL NOT NULL DEFAULT 0.0,
        closed_by_user_id TEXT,
        closed_by_name TEXT,
        closed_at TEXT,
        status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
        system_cash_sales REAL DEFAULT 0.0,
        system_qr_sales REAL DEFAULT 0.0,
        system_total_sales REAL DEFAULT 0.0,
        expected_cash_in_drawer REAL DEFAULT 0.0,
        actual_cash_counted REAL DEFAULT 0.0,
        difference REAL DEFAULT 0.0,
        notes TEXT,
        FOREIGN KEY(tenant_id) REFERENCES organizations(id)
    )
    """)

    # 4. Services
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'org_apolo_sopocachi',
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1
    )
    """)

    # 5. Barbers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS barbers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'org_apolo_sopocachi',
        name TEXT NOT NULL,
        nickname TEXT,
        photo_url TEXT,
        phone TEXT,
        specialty TEXT,
        commission_rate REAL DEFAULT 0.50,
        rating REAL DEFAULT 5.0,
        is_active INTEGER DEFAULT 1
    )
    """)

    # 6. Clients
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'org_apolo_sopocachi',
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        notes TEXT,
        total_visits INTEGER DEFAULT 0,
        total_spent REAL DEFAULT 0.0,
        last_visit TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 7. Appointments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'org_apolo_sopocachi',
        client_id TEXT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        barber_id TEXT NOT NULL,
        barber_name TEXT NOT NULL,
        service_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed',
        notes TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 8. Sales
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'org_apolo_sopocachi',
        cash_shift_id TEXT,
        appointment_id TEXT,
        client_name TEXT NOT NULL,
        barber_id TEXT NOT NULL,
        barber_name TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tip REAL DEFAULT 0.0,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        qr_reference_code TEXT,
        service_price_snapshot REAL DEFAULT 0.0,
        commission_percentage_snapshot REAL DEFAULT 0.50,
        commission_amount REAL DEFAULT 0.0,
        notes TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Dynamic migrations for existing databases
    migrations = [
        ("services", "tenant_id", "TEXT NOT NULL DEFAULT 'org_apolo_sopocachi'"),
        ("barbers", "tenant_id", "TEXT NOT NULL DEFAULT 'org_apolo_sopocachi'"),
        ("clients", "tenant_id", "TEXT NOT NULL DEFAULT 'org_apolo_sopocachi'"),
        ("appointments", "tenant_id", "TEXT NOT NULL DEFAULT 'org_apolo_sopocachi'"),
        ("sales", "tenant_id", "TEXT NOT NULL DEFAULT 'org_apolo_sopocachi'"),
        ("sales", "cash_shift_id", "TEXT"),
        ("sales", "qr_reference_code", "TEXT"),
        ("sales", "service_price_snapshot", "REAL DEFAULT 0.0"),
        ("sales", "commission_percentage_snapshot", "REAL DEFAULT 0.50"),
        ("sales", "commission_amount", "REAL DEFAULT 0.0")
    ]

    for table, col, col_type in migrations:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass

    # Indices for Multi-Tenant performance and security
    indices = [
        ("idx_services_tenant", "services(tenant_id, category)"),
        ("idx_barbers_tenant", "barbers(tenant_id, is_active)"),
        ("idx_clients_tenant", "clients(tenant_id, phone)"),
        ("idx_appointments_tenant_date", "appointments(tenant_id, date, status)"),
        ("idx_appointments_tenant_barber", "appointments(tenant_id, barber_id, date)"),
        ("idx_sales_tenant_created", "sales(tenant_id, created_at)"),
        ("idx_cash_shifts_tenant_status", "cash_shifts(tenant_id, status)")
    ]

    for idx_name, idx_def in indices:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {idx_def}")
        except sqlite3.OperationalError:
            pass

    # Ensure default Organization exists
    cursor.execute("SELECT COUNT(*) FROM organizations WHERE id = ?", (DEFAULT_TENANT_ID,))
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO organizations (id, name, slug, address, phone, currency, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            DEFAULT_TENANT_ID,
            "Apolo Barber Studio - Sopocachi",
            "apolo-sopocachi",
            "Av. 6 de Agosto #2455, Sopocachi, La Paz - Bolivia",
            "+591 71234567",
            "Bs.",
            1,
            now_str
        ))

    # Ensure default users exist for all roles
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        seed_users(cursor)
    else:
        # Check if superadmin user exists, if not create it
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'superadmin@apolodigital.lat'")
        if cursor.fetchone()[0] == 0:
            now_str = datetime.now().isoformat()
            default_pw_hash = hash_password("Apolo2026!")
            cursor.execute("""
                INSERT INTO users (id, tenant_id, email, hashed_password, full_name, role, barber_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ("usr-superadmin-01", DEFAULT_TENANT_ID, "superadmin@apolodigital.lat", default_pw_hash, "Super Administrador (SaaS Global)", "superadmin", None, 1, now_str))

    # Seed initial business data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM services")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)

    # Ensure at least one initial open cash shift exists for seamless local workflow
    cursor.execute("SELECT COUNT(*) FROM cash_shifts WHERE tenant_id = ? AND status = 'open'", (DEFAULT_TENANT_ID,))
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO cash_shifts (
                id, tenant_id, opened_by_user_id, opened_by_name, opened_at, initial_cash,
                status, system_cash_sales, system_qr_sales, system_total_sales, expected_cash_in_drawer, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "shift-initial-001",
            DEFAULT_TENANT_ID,
            "usr-admin-01",
            "Admin Recepción",
            now_str,
            200.0,
            "open",
            60.0,
            95.0,
            155.0,
            260.0,
            "Turno matutino inicial de demostración"
        ))

    conn.commit()
    conn.close()

def seed_users(cursor):
    now_str = datetime.now().isoformat()
    default_pw_hash = hash_password("Apolo2026!")

    users = [
        # (id, tenant_id, email, hashed_password, full_name, role, barber_id, is_active, created_at)
        ("usr-superadmin-01", DEFAULT_TENANT_ID, "superadmin@apolodigital.lat", default_pw_hash, "Super Administrador (SaaS Global)", "superadmin", None, 1, now_str),
        ("usr-owner-01", DEFAULT_TENANT_ID, "dueno@apolodigital.lat", default_pw_hash, "Dueño Apolo", "owner", None, 1, now_str),
        ("usr-admin-01", DEFAULT_TENANT_ID, "admin@apolodigital.lat", default_pw_hash, "Admin Recepción", "admin", None, 1, now_str),
        ("usr-barber-01", DEFAULT_TENANT_ID, "alex@apolodigital.lat", default_pw_hash, "Alex Mendoza", "barber", "bar-1", 1, now_str),
        ("usr-client-01", DEFAULT_TENANT_ID, "cliente@apolodigital.lat", default_pw_hash, "Juan Pablo Claure", "client", None, 1, now_str)
    ]

    cursor.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", users)

def seed_data(cursor):
    now_str = datetime.now().isoformat()
    today_str = date.today().isoformat()
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()

    # 1. Services
    services = [
        ("srv-1", DEFAULT_TENANT_ID, "Corte Clásico Ejecutivo", "Cortes", 30, 40.0, "Corte tradicional a tijera o máquina, lavado rápido y peinado.", 1),
        ("srv-2", DEFAULT_TENANT_ID, "Degradado / Low & Mid Fade", "Cortes", 45, 50.0, "Fade pulido a navaja y shaver, definición de contornos y textura.", 1),
        ("srv-3", DEFAULT_TENANT_ID, "Arreglo de Barba con Toalla Caliente", "Barba", 30, 35.0, "Ritual con vapor de ozono, aceites esenciales, toalla caliente y navaja.", 1),
        ("srv-4", DEFAULT_TENANT_ID, "Combo Apolo Master (Corte + Barba)", "Combos", 60, 75.0, "Experiencia completa: Fade o corte ejecutivo + toalla caliente + barba y cejas.", 1),
        ("srv-5", DEFAULT_TENANT_ID, "Diseño & Hair Tattoo Freestyle", "Cortes", 30, 30.0, "Líneas artísticas, degradados tribales o geométricos personalizados.", 1),
        ("srv-6", DEFAULT_TENANT_ID, "Camuflaje de Canas / Platinado", "Tratamientos", 60, 110.0, "Colorimetría capilar masculina, matización natural y cuidado del cuero cabelludo.", 1),
        ("srv-7", DEFAULT_TENANT_ID, "Corte Infantil (Niños menores de 12)", "Cortes", 30, 35.0, "Paciencia, estilo moderno o escolar para los más pequeños.", 1),
        ("srv-8", DEFAULT_TENANT_ID, "Limpieza Facial Express con Mascarilla", "Tratamientos", 25, 30.0, "Exfoliación suave, puntos negros y mascarilla peel-off refrescante.", 1)
    ]
    cursor.executemany("INSERT INTO services VALUES (?, ?, ?, ?, ?, ?, ?, ?)", services)

    # 2. Barbers
    barbers = [
        ("bar-1", DEFAULT_TENANT_ID, "Alex Mendoza", "El Master Barber", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", "+591 71234567", "Fades & Diseños Urbanos", 0.60, 4.95, 1),
        ("bar-2", DEFAULT_TENANT_ID, "Carlos Rocha", "Don Barba", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", "+591 72345678", "Barbas Tradicionales & Ritual Navaja", 0.55, 4.90, 1),
        ("bar-3", DEFAULT_TENANT_ID, "Mateo Quispe", "El Artista", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", "+591 73456789", "Colorimetría & Tijera Clásica", 0.50, 4.88, 1),
        ("bar-4", DEFAULT_TENANT_ID, "Diego Torrez", "Speed Fade", "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80", "+591 74567890", "Cortes Ejecutivos & Niños", 0.50, 4.80, 1)
    ]
    cursor.executemany("INSERT INTO barbers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", barbers)

    # 3. Clients
    clients = [
        ("cli-1", DEFAULT_TENANT_ID, "Juan Pablo Claure", "+591 72019283", "jp.claure@gmail.com", "Fade #1 bajo, usar cera mate sin brillo", 8, 380.0, today_str, now_str),
        ("cli-2", DEFAULT_TENANT_ID, "Roberto Morales", "+591 77543210", "roberto.m@outlook.com", "Corte clásico a tijera, no tocar barba", 4, 160.0, today_str, now_str),
        ("cli-3", DEFAULT_TENANT_ID, "Andrés Gutiérrez", "+591 76891234", "agutierrez@empresa.bo", "Barba perfilada alta con toalla bien tibia", 6, 290.0, today_str, now_str),
        ("cli-4", DEFAULT_TENANT_ID, "Mateo Villarroel", "+591 71239845", "mateov@yahoo.com", "Combo Apolo completo para bodas o eventos", 3, 225.0, tomorrow_str, now_str),
        ("cli-5", DEFAULT_TENANT_ID, "Fernando Siles", "+591 70554433", "fsiles@gmail.com", "Taper fade con diseño lateral discreto", 5, 230.0, today_str, now_str),
        ("cli-6", DEFAULT_TENANT_ID, "Gabriel Flores", "+591 78901234", "gflores@hotmail.com", "Limpieza de cejas con navaja y corte ejecutivo", 2, 80.0, tomorrow_str, now_str)
    ]
    cursor.executemany("INSERT INTO clients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", clients)

    # 4. Appointments
    appointments = [
        ("apt-1", DEFAULT_TENANT_ID, "cli-1", "Juan Pablo Claure", "+591 72019283", "bar-1", "Alex Mendoza", "srv-2", "Degradado / Low & Mid Fade", today_str, "09:00", 45, 50.0, "completed", "Cliente puntual", now_str),
        ("apt-2", DEFAULT_TENANT_ID, "cli-2", "Roberto Morales", "+591 77543210", "bar-2", "Carlos Rocha", "srv-1", "Corte Clásico Ejecutivo", today_str, "10:00", 30, 40.0, "completed", "Pago con QR Simple", now_str),
        ("apt-3", DEFAULT_TENANT_ID, "cli-3", "Andrés Gutiérrez", "+591 76891234", "bar-2", "Carlos Rocha", "srv-3", "Arreglo de Barba con Toalla Caliente", today_str, "11:30", 30, 35.0, "in_progress", "En sillón actualmente", now_str),
        ("apt-4", DEFAULT_TENANT_ID, "cli-5", "Fernando Siles", "+591 70554433", "bar-1", "Alex Mendoza", "srv-4", "Combo Apolo Master (Corte + Barba)", today_str, "14:00", 60, 75.0, "confirmed", "Confirmado por WhatsApp", now_str),
        ("apt-5", DEFAULT_TENANT_ID, "cli-6", "Gabriel Flores", "+591 78901234", "bar-3", "Mateo Quispe", "srv-6", "Camuflaje de Canas / Platinado", today_str, "16:00", 60, 110.0, "confirmed", "Primera vez tintura", now_str),
        ("apt-6", DEFAULT_TENANT_ID, "cli-4", "Mateo Villarroel", "+591 71239845", "bar-1", "Alex Mendoza", "srv-4", "Combo Apolo Master (Corte + Barba)", tomorrow_str, "10:30", 60, 75.0, "confirmed", "Evento el fin de semana", now_str),
        ("apt-7", DEFAULT_TENANT_ID, "cli-2", "Roberto Morales", "+591 77543210", "bar-4", "Diego Torrez", "srv-7", "Corte Infantil (Niños menores de 12)", tomorrow_str, "15:00", 30, 35.0, "confirmed", "Viene con su hijo", now_str)
    ]
    cursor.executemany("INSERT INTO appointments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", appointments)

    # 5. Sales
    sales = [
        ("sal-1", DEFAULT_TENANT_ID, "shift-initial-001", "apt-1", "Juan Pablo Claure", "bar-1", "Alex Mendoza", 50.0, 10.0, 60.0, "cash", None, 50.0, 0.60, 30.0, "Excelente servicio, dejó propina de 10 Bs.", now_str),
        ("sal-2", DEFAULT_TENANT_ID, "shift-initial-001", "apt-2", "Roberto Morales", "bar-2", "Carlos Rocha", 40.0, 5.0, 45.0, "qr_simple", "QR-AUTH-882190", 40.0, 0.55, 22.0, "Comprobante QR verificado", now_str)
    ]
    cursor.executemany("INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", sales)

if __name__ == "__main__":
    init_db()
    print("Database initialized, migrated, and seeded successfully at:", DB_PATH)
