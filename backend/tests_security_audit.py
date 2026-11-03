import urllib.request
import urllib.error
import json
from datetime import date

BASE_URL = "http://127.0.0.1:8008"

def http_req(path: str, method: str = "GET", data: dict = None, token: str = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode("utf-8")
            return status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"detail": body}
        return e.code, parsed

def run_tests():
    print("=" * 70)
    print("   EJECUCIÓN DE SUITE DE PRUEBAS DE SEGURIDAD DEFENSIVA OWASP")
    print("=" * 70)

    # -------------------------------------------------------------
    # TEST 1: AUTENTICACIÓN JWT Y LOGIN
    # -------------------------------------------------------------
    print("\n[TEST 1] Autenticación JWT y Emisión de Tokens...")
    
    # Intento con password incorrecta
    status, res = http_req("/api/auth/login", method="POST", data={
        "email": "admin@apolodigital.lat",
        "password": "PasswordIncorrecta!"
    })
    assert status == 401, f"Esperado 401, recibido {status}"
    print("  ✓ Login con contraseña errónea rechazado con 401 Unauthorized")

    # Login exitoso como Admin
    status, admin_data = http_req("/api/auth/login", method="POST", data={
        "email": "admin@apolodigital.lat",
        "password": "Apolo2026!"
    })
    assert status == 200, f"Error en login admin: {admin_data}"
    admin_token = admin_data["access_token"]
    assert admin_data["user"]["role"] == "admin"
    print("  ✓ Login como Administrador exitoso (Token JWT generado)")

    # Login como Barbero
    status, barber_data = http_req("/api/auth/login", method="POST", data={
        "email": "alex@apolodigital.lat",
        "password": "Apolo2026!"
    })
    assert status == 200
    barber_token = barber_data["access_token"]
    assert barber_data["user"]["role"] == "barber"
    assert barber_data["user"]["barber_id"] == "bar-1"
    print("  ✓ Login como Barbero exitoso (Rol='barber', BarberID='bar-1')")

    # -------------------------------------------------------------
    # TEST 2: SEGREGACIÓN DE FUNCIONES (SoD) EN AGENDA
    # -------------------------------------------------------------
    print("\n[TEST 2] Segregación de Funciones (SoD) en Agenda...")

    # Admin ve todas las citas del día
    today = date.today().isoformat()
    status, admin_apts = http_req(f"/api/appointments?date={today}", token=admin_token)
    assert status == 200
    barbers_in_admin = set(a["barber_id"] for a in admin_apts)
    assert len(barbers_in_admin) > 1, "Admin debería ver citas de múltiples barberos"
    print(f"  ✓ Admin visualiza agenda global ({len(admin_apts)} citas de varios barberos)")

    # Barbero SOLO ve sus citas (bar-1)
    status, barber_apts = http_req(f"/api/appointments?date={today}", token=barber_token)
    assert status == 200
    for apt in barber_apts:
        assert apt["barber_id"] == "bar-1", f"Fuga de datos: Barbero vio cita de {apt['barber_id']}"
    print(f"  ✓ Barbero ve ÚNICAMENTE sus {len(barber_apts)} citas asignadas (SoD garantizado)")

    # -------------------------------------------------------------
    # TEST 3: SEGREGACIÓN SoD EN CHECKOUT (BARBERO NO PUEDE COBRAR)
    # -------------------------------------------------------------
    print("\n[TEST 3] Violación SoD: Intento de Barbero cobrando en caja...")
    checkout_payload = {
        "client_name": "Test Cliente Fraude",
        "barber_id": "bar-1",
        "barber_name": "Alex Mendoza",
        "services_total": 50.0,
        "total": 50.0,
        "payment_method": "cash"
    }

    # Barbero intenta cobrar
    status, barber_checkout_res = http_req("/api/checkout", method="POST", data=checkout_payload, token=barber_token)
    assert status == 403, f"Esperado 403, recibido {status}"
    print("  ✓ Intento de cobro por Barbero bloqueado con 403 Forbidden (Violación SoD)")

    # -------------------------------------------------------------
    # TEST 4: PREVENCIÓN DE FRAUDE CON QR SIMPLE (NO REUTILIZACIÓN)
    # -------------------------------------------------------------
    print("\n[TEST 4] Prevención de Fraude en Comprobantes QR Simple...")
    qr_payload_1 = {
        "client_name": "Cliente QR 1",
        "barber_id": "bar-1",
        "barber_name": "Alex Mendoza",
        "services_total": 40.0,
        "total": 40.0,
        "payment_method": "qr_simple",
        "qr_reference_code": "BNB-TEST-998811"
    }

    # Cobro QR legítimo por Admin
    status, qr_res_1 = http_req("/api/checkout", method="POST", data=qr_payload_1, token=admin_token)
    assert status == 200, f"Error en cobro QR: {qr_res_1}"
    print("  ✓ Primer cobro QR registrado con éxito con referencia 'BNB-TEST-998811'")

    # Intento de reusar el mismo código de comprobante
    qr_payload_dup = {
        "client_name": "Cliente Estafador",
        "barber_id": "bar-1",
        "barber_name": "Alex Mendoza",
        "services_total": 40.0,
        "total": 40.0,
        "payment_method": "qr_simple",
        "qr_reference_code": "BNB-TEST-998811"
    }
    status, dup_res = http_req("/api/checkout", method="POST", data=qr_payload_dup, token=admin_token)
    assert status == 409, f"Esperado 409, recibido {status}"
    print("  ✓ Intento de reutilización de comprobante QR bloqueado con 409 Conflict")

    # -------------------------------------------------------------
    # TEST 5: ARQUEO CIEGO Y CIERRE DE CAJA (BLIND RECONCILIATION)
    # -------------------------------------------------------------
    print("\n[TEST 5] Integridad de Caja y Arqueo Ciego...")
    status, current_shift_data = http_req("/api/cash/current", token=admin_token)
    assert status == 200
    shift_info = current_shift_data["shift"]
    expected_cash = shift_info["expected_cash_in_drawer"]
    print(f"  ✓ Estado actual de turno obtenido (Efectivo teórico calculado: Bs. {expected_cash})")

    # Cajero realiza cierre ciego ingresando conteo con faltante de 10 Bs.
    counted_cash = expected_cash - 10.0
    status, close_data = http_req("/api/cash/close", method="POST", data={
        "actual_cash_counted": counted_cash,
        "notes": "Arqueo de prueba al final de la jornada"
    }, token=admin_token)
    assert status == 200
    assert close_data["difference"] == -10.0
    assert "FALTANTE" in close_data["verdict"]
    print(f"  ✓ Cierre Ciego ejecutado con éxito. Dictamen del sistema: {close_data['verdict']}")

    # Intento de cobro con caja cerrada
    status, closed_checkout_res = http_req("/api/checkout", method="POST", data=checkout_payload, token=admin_token)
    assert status == 400
    print("  ✓ Cobro bloqueado con 400 Bad Request cuando la caja está cerrada")

    # Reapertura de caja para siguiente turno
    status, open_res = http_req("/api/cash/open", method="POST", data={
        "initial_cash": 200.0,
        "notes": "Apertura turno nocturno"
    }, token=admin_token)
    assert status == 200
    print("  ✓ Nuevo turno de caja abierto con éxito (Fondo inicial: Bs. 200.0)")

    print("\n" + "=" * 70)
    print("   TODAS LAS PRUEBAS DE MITIGACIÓN OWASP PASARON EXITOSAMENTE (5/5)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
