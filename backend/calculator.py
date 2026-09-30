import sqlite3
import sys
from datetime import datetime

DB_FILE = "tracker.db"
BASE_RATE_ANYONE = 65.0
BASE_RATE_INNODATA = 8.0

PRESET_AHTS = {
    "1": ("5 minutos", 5.0),
    "2": ("10 minutos", 10.0),
    "3": ("15 minutos", 15.0),
    "4": ("20 minutos", 20.0),
    "5": ("25 minutos", 25.0),
    "6": ("30 minutos", 30.0),
    "7": ("40 minutos", 40.0),
    "8": ("45 minutos", 45.0),
    "9": ("50 minutos", 50.0),
    "10": ("60 minutos", 60.0),
}


def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client TEXT NOT NULL,
                hours REAL NOT NULL,
                rate_per_hour REAL NOT NULL,
                total_pay REAL NOT NULL,
                date TEXT NOT NULL,
                notes TEXT
            )
            """
        )
        conn.commit()


def add_entry(client_name: str, hours: float, rate: float, notes: str = ""):
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    total = hours * rate
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (client, hours, rate_per_hour, total_pay, date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (client_name, hours, rate, total, today, notes),
        )
        conn.commit()

    print(f"\n✔ Guardado con éxito: {hours:.2f}h eq. en {client_name} -> ${total:.2f} USD")
    input("\nPresioná [Enter] para volver al menú principal...")

def delete_entry():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, date, client, hours, total_pay, notes FROM sessions ORDER BY id DESC")
        rows = cursor.fetchall()

    if not rows:
        print("\n⚠ No hay registros para eliminar.")
        input("\nPresioná [Enter] para volver...")
        return

    print("\n" + "=" * 70)
    print(f"{'REGISTROS DISPONIBLES':^70}")
    print("=" * 70)
    for r_id, date, client, hours, pay, notes in rows:
        print(f"[{r_id:>3}] {date} | {client:<10} | {hours:>5.2f}h | ${pay:>6.2f} | {notes or ''}")
    print("-" * 70)

    target = input("\nID a eliminar (o 'c' para cancelar): ").strip()
    if target.lower() == 'c':
        return

    try:
        id_num = int(target)
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE id = ?", (id_num,))
            if cursor.rowcount > 0:
                conn.commit()
                print(f"✔ Registro #{id_num} eliminado.")
            else:
                print(f"❌ No existe el ID #{id_num}.")
    except ValueError:
        print("❌ Debés ingresar un número.")

    input("\nPresioná [Enter] para volver...")

def generate_report():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT date, client, hours, rate_per_hour, total_pay, notes FROM sessions ORDER BY id ASC"
        )
        rows = cursor.fetchall()

    if not rows:
        print("\n⚠ No hay sesiones guardadas en la base de datos todavía.")
        input("\nPresioná [Enter] para volver al menú...")
        return

    total_hours = 0.0
    total_earnings = 0.0
    by_client = {}

    print("\n" + "=" * 75)
    print(f"{'DETALLE DE HORAS Y LIQUIDACIÓN ACUMULADA':^75}")
    print("=" * 75)

    for date, client, hours, rate, pay, notes in rows:
        total_hours += hours
        total_earnings += pay

        if client not in by_client:
            by_client[client] = {"hours": 0.0, "pay": 0.0}
        by_client[client]["hours"] += hours
        by_client[client]["pay"] += pay

        notes_display = f" | {notes}" if notes else ""
        print(
            f"[{date}] {client:<11} | {hours:>5.2f}h x ${rate:>5.2f} = ${pay:>6.2f}{notes_display}"
        )

    print("-" * 75)
    print("RESUMEN POR PLATAFORMA:")
    for client, data in by_client.items():
        print(f" • {client:<11}: {data['hours']:>5.2f} horas eq. | Total: ${data['pay']:>7.2f} USD")

    print("-" * 75)
    print(f"TOTAL GENERAL: {total_hours:.2f} horas eq. | ${total_earnings:.2f} USD")
    print("=" * 75)

    input("\nPresioná [Enter] para volver al menú principal...")


def ask_positive_float(prompt: str) -> float:
    while True:
        raw = input(prompt).strip()
        try:
            val = float(raw)
            if val <= 0:
                print("❌ Debe ser un número mayor a 0.")
                continue
            return val
        except ValueError:
            print("❌ Número no válido. Usá formato numérico (ej: 10 o 2.5).")


def choose_aht_minutes() -> float:
    while True:
        print("\n  --- SELECCIONAR AHT DEL PROYECTO ---")
        for key, (label, mins) in PRESET_AHTS.items():
            unit_val = (mins / 60.0) * BASE_RATE_ANYONE
            print(f"  {key}. AHT {label} (${unit_val:.2f} / tarea)")
        print("  6. Ingresar otro AHT manual en minutos")

        choice = input("\n  Elegí una opción (1-6): ").strip()
        if choice in PRESET_AHTS:
            return PRESET_AHTS[choice][1]
        elif choice == "6":
            return ask_positive_float("  Ingresá el AHT exacto en minutos: ")
        else:
            print("  ❌ Opción inválida. Elegí entre 1 y 6.")


def main():
    init_db()

    while True:
        print("\n===============================")
        print("     TRACKER DE TAREAS/HORAS   ")
        print("===============================")
        print("1. Anyone AI ($65/h base - liquidación por AHT)")
        print("2. Innodata ($8/h reloj)")
        print("3. Ver reporte acumulado")
        print("4. Eliminar registro")
        print("5. Salir")

        opt = input("\nSeleccioná una opción (1-5): ").strip()

        if opt == "1":
            subproject = input("\nNombre o tag del subproyecto (ej: Code Review, RLHF): ").strip()
            aht = choose_aht_minutes()
            tasks = ask_positive_float(f"\n¿Cuántas tareas completaste con AHT {aht:.0f}m?: ")

            computed_hours = (aht / 60.0) * tasks
            price_per_task = (aht / 60.0) * BASE_RATE_ANYONE
            notes = f"Sub: {subproject or 'General'} ({tasks:.0f} tareas @ AHT {aht:.0f}m - ${price_per_task:.2f} c/u)"

            add_entry("Anyone AI", hours=computed_hours, rate=BASE_RATE_ANYONE, notes=notes)

        elif opt == "2":
            hours = ask_positive_float("\n¿Cuántas horas reloj trabajaste en Innodata?: ")
            task_detail = input("Notas o descripción (opcional): ").strip()
            notes = task_detail if task_detail else "General"

            add_entry("Innodata", hours=hours, rate=BASE_RATE_INNODATA, notes=notes)

        elif opt == "3":
            generate_report()

        elif opt == "4":
            delete_entry()

        elif opt == "5":
            print("\n¡Nos vemos! Datos guardados en tracker.db.")
            break

        else:
            print("❌ Opción inválida. Ingresá un número del 1 al 5.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nSesión cancelada por el usuario. Saliendo...")
        sys.exit(0)