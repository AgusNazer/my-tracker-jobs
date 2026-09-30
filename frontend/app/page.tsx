import Database from "better-sqlite3";
import { revalidatePath } from "next/cache";

const BASE_RATE_ANYONE = 65.0;
const BASE_RATE_INNODATA = 8.0;

interface SessionRow {
  id: number;
  client: string;
  hours: number;
  rate_per_hour: number;
  total_pay: number;
  date: string;
  notes: string | null;
}

// Server Action para registrar sesión de Anyone AI (por AHT)
async function submitAnyoneAction(formData: FormData) {
  "use server";
  const subproject =
    (formData.get("subproject") as string)?.trim() || "General";
  const aht = parseFloat(formData.get("aht") as string) || 15.0;
  const tasks = parseFloat(formData.get("tasks") as string) || 0;

  if (tasks <= 0) return;

  const computedHours = (aht / 60.0) * tasks;
  const pricePerTask = (aht / 60.0) * BASE_RATE_ANYONE;
  const totalPay = computedHours * BASE_RATE_ANYONE;
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 16);
  const notes = `Sub: ${subproject} (${tasks.toFixed(0)} tareas @ AHT ${aht.toFixed(0)}m - $${pricePerTask.toFixed(2)} c/u)`;

  const dbPath = process.env.DATABASE_URL || "/data/tracker.db";
  try {
    const db = new Database(dbPath);
    db.prepare(
      `
      INSERT INTO sessions (client, hours, rate_per_hour, total_pay, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "Anyone AI",
      computedHours,
      BASE_RATE_ANYONE,
      totalPay,
      dateStr,
      notes,
    );
  } catch (err) {
    console.error("Error insertando Anyone AI:", err);
  }
  revalidatePath("/");
}

async function deleteSessionAction(formData: FormData) {
  'use server';
  const id = formData.get('id');
  if (!id) return;

  const dbPath = process.env.DATABASE_URL || '/data/tracker.db';
  try {
    const db = new Database(dbPath);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error al borrar:', err);
  }
  revalidatePath('/');
}

// Server Action para registrar sesión de Innodata (horas reloj)
async function submitInnodataAction(formData: FormData) {
  "use server";
  const hours = parseFloat(formData.get("hours") as string) || 0;
  const notesInput = (formData.get("notes") as string)?.trim() || "General";

  if (hours <= 0) return;

  const totalPay = hours * BASE_RATE_INNODATA;
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 16);

  const dbPath = process.env.DATABASE_URL || "/data/tracker.db";
  try {
    const db = new Database(dbPath);
    db.prepare(
      `
      INSERT INTO sessions (client, hours, rate_per_hour, total_pay, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run("Innodata", hours, BASE_RATE_INNODATA, totalPay, dateStr, notesInput);
  } catch (err) {
    console.error("Error insertando Innodata:", err);
  }
  revalidatePath("/");
}

export default function Home() {
  const dbPath = process.env.DATABASE_URL || "/data/tracker.db";
  let rows: SessionRow[] = [];
  let dbError = "";

  try {
    const db = new Database(dbPath, { readonly: true });
    rows = db
      .prepare("SELECT * FROM sessions ORDER BY id DESC")
      .all() as SessionRow[];
  } catch (error: any) {
    dbError = error.message;
  }

  // Cálculos acumulados idénticos a generate_report()
  const totalHours = rows.reduce((acc, r) => acc + (r.hours || 0), 0);
  const totalEarnings = rows.reduce((acc, r) => acc + (r.total_pay || 0), 0);

  const anyoneSessions = rows.filter((r) => r.client === "Anyone AI");
  const anyoneHours = anyoneSessions.reduce(
    (acc, r) => acc + (r.hours || 0),
    0,
  );
  const anyonePay = anyoneSessions.reduce(
    (acc, r) => acc + (r.total_pay || 0),
    0,
  );

  const innodataSessions = rows.filter((r) => r.client === "Innodata");
  const innodataHours = innodataSessions.reduce(
    (acc, r) => acc + (r.hours || 0),
    0,
  );
  const innodataPay = innodataSessions.reduce(
    (acc, r) => acc + (r.total_pay || 0),
    0,
  );

 return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Terminal Header */}
        <header style={styles.header}>
          <div>
            <span style={styles.kicker}>
              TERMINAL CONSOLE // SQLITE3 BACKEND
            </span>
            <h1 style={styles.title}>TRACKER DE TAREAS & LIQUIDACIÓN</h1>
          </div>
          <div style={styles.ratesBox}>
            <div>
              ANYONE AI: <strong style={{ color: "#88c0d0" }}>$65.00/h</strong>{" "}
              (AHT)
            </div>
            <div>
              INNODATA: <strong style={{ color: "#ebcb8b" }}>$8.00/h</strong>{" "}
              (Reloj)
            </div>
          </div>
        </header>

        {dbError && <div style={styles.errorBanner}>[DB_ERROR]: {dbError}</div>}

        {/* Bloque Resumen Métricas */}
        <section style={styles.metricsGrid}>
          <div style={{ ...styles.metricCard, borderTop: "4px solid #5e81ac" }}>
            <span style={styles.metricLabel}>TOTAL GENERAL</span>
            <div style={styles.metricBig}>
              ${totalEarnings.toFixed(2)} <span style={styles.usd}>USD</span>
            </div>
            <span style={styles.metricSub}>
              {totalHours.toFixed(2)} horas equivalentes
            </span>
          </div>

          <div style={{ ...styles.metricCard, borderTop: "4px solid #88c0d0" }}>
            <span style={styles.metricLabel}>ANYONE AI</span>
            <div style={{ ...styles.metricBig, color: "#88c0d0" }}>
              ${anyonePay.toFixed(2)} <span style={styles.usd}>USD</span>
            </div>
            <span style={styles.metricSub}>
              {anyoneHours.toFixed(2)}h ({anyoneSessions.length} registros)
            </span>
          </div>

          <div style={{ ...styles.metricCard, borderTop: "4px solid #ebcb8b" }}>
            <span style={styles.metricLabel}>INNODATA</span>
            <div style={{ ...styles.metricBig, color: "#ebcb8b" }}>
              ${innodataPay.toFixed(2)} <span style={styles.usd}>USD</span>
            </div>
            <span style={styles.metricSub}>
              {innodataHours.toFixed(2)}h ({innodataSessions.length} registros)
            </span>
          </div>
        </section>

        {/* Paneles de Registro de Tareas */}
        <section style={styles.inputsGrid}>
          {/* Formulario 1: Anyone AI */}
          <div style={styles.panelBox}>
            <div
              style={{
                ...styles.panelHeader,
                borderBottom: "1px solid #434c5e",
              }}
            >
              <span style={{ color: "#88c0d0", fontWeight: "bold" }}>
                [1] CARGAR EN ANYONE AI
              </span>
              <span style={styles.rateBadge}>$65/H BASE</span>
            </div>
            <form action={submitAnyoneAction} style={styles.formStack}>
              <div>
                <label style={styles.label}>SUBPROYECTO / TAG:</label>
                <input
                  type="text"
                  name="subproject"
                  placeholder="ej: Code Review, RLHF, Math"
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>SELECCIONAR AHT:</label>
                <select name="aht" defaultValue="15" style={styles.select}>
                  <option value="5">AHT 5 min ($5.42 / tarea)</option>
                  <option value="10">AHT 10 min ($10.83 / tarea)</option>
                  <option value="15">AHT 15 min ($16.25 / tarea)</option>
                  <option value="20">AHT 20 min ($21.67 / tarea)</option>
                  <option value="25">AHT 25 min ($27.08 / tarea)</option>
                  <option value="30">AHT 30 min ($32.50 / tarea)</option>
                  <option value="40">AHT 40 min ($43.33 / tarea)</option>
                  <option value="45">AHT 45 min ($48.75 / tarea)</option>
                  <option value="50">AHT 50 min ($54.17 / tarea)</option>
                  <option value="60">AHT 60 min ($65.00 / tarea)</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  CANTIDAD DE TAREAS COMPLETADAS:
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  name="tasks"
                  placeholder="ej: 6"
                  required
                  style={styles.input}
                />
              </div>

              <button type="submit" style={styles.btnBlue}>
                + GUARDAR TAREAS ANYONE
              </button>
            </form>
          </div>

          {/* Formulario 2: Innodata */}
          <div style={styles.panelBox}>
            <div
              style={{
                ...styles.panelHeader,
                borderBottom: "1px solid #434c5e",
              }}
            >
              <span style={{ color: "#ebcb8b", fontWeight: "bold" }}>
                [2] CARGAR EN INNODATA
              </span>
              <span style={styles.rateBadge}>$8/H RELOJ</span>
            </div>
            <form action={submitInnodataAction} style={styles.formStack}>
              <div>
                <label style={styles.label}>HORAS RELOJ TRABAJADAS:</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  name="hours"
                  placeholder="ej: 3.5"
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>NOTAS / DETALLES DE SESIÓN:</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="ej: Anotación de datos, QA, General"
                  style={styles.input}
                />
              </div>

              <div style={{ minHeight: "62px" }} />

              <button type="submit" style={styles.btnAmber}>
                + GUARDAR HORAS INNODATA
              </button>
            </form>
          </div>
        </section>

        {/* Tabla de Reporte Acumulado */}
        <section style={styles.tableCard}>
          <div style={styles.tableHeaderBar}>
            <span>HISTORIAL ACUMULADO // SESSIONS</span>
            <span>TOTAL: {rows.length} ENTRADAS</span>
          </div>

          {rows.length === 0 ? (
            <div style={styles.emptyPrompt}>
              &gt; No hay sesiones guardadas en la base de datos todavía.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>FECHA</th>
                    <th style={styles.th}>PLATAFORMA</th>
                    <th style={styles.th}>HORAS EQ.</th>
                    <th style={styles.th}>TARIFA</th>
                    <th style={styles.th}>LIQUIDACIÓN</th>
                    <th style={styles.th}>DETALLES / NOTAS</th>
                    <th style={{ ...styles.th, textAlign: "center" }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isAnyone = r.client === "Anyone AI";
                    return (
                      <tr key={r.id} style={styles.tr}>
                        <td style={{ ...styles.td, color: "#8892b0" }}>
                          {r.date}
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.tag,
                              color: isAnyone ? "#88c0d0" : "#ebcb8b",
                              borderColor: isAnyone ? "#4c566a" : "#5e5138",
                              backgroundColor: isAnyone ? "#2e3440" : "#322c22",
                            }}
                          >
                            {r.client}
                          </span>
                        </td>
                        <td style={{ ...styles.td, fontWeight: "bold" }}>
                          {r.hours.toFixed(2)} h
                        </td>
                        <td style={{ ...styles.td, color: "#d8dee9" }}>
                          ${r.rate_per_hour.toFixed(2)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            fontWeight: "bold",
                            color: "#a3be8c",
                          }}
                        >
                          ${r.total_pay.toFixed(2)} USD
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            color: "#b2c0cc",
                            fontSize: "0.8rem",
                          }}
                        >
                          {r.notes || "--"}
                        </td>
                        <td style={{ ...styles.td, textAlign: "center" }}>
                          <form action={deleteSessionAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={r.id} />
                            <button
                              type="submit"
                              style={styles.btnDelete}
                              title="Eliminar fila"
                            >
                              ✕ BORRAR
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#1a1c23", // Gris oscuro profundo
    color: "#d8dee9",
    fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
    padding: "2.5rem 1.5rem",
    boxSizing: "border-box",
  },
  wrapper: {
    maxWidth: "1150px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2px solid #2e3440",
    paddingBottom: "1.5rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  kicker: {
    fontSize: "0.72rem",
    color: "#81a1c1",
    letterSpacing: "1px",
    display: "block",
    marginBottom: "0.3rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "bold",
    margin: 0,
    color: "#eceff4",
    letterSpacing: "0.5px",
  },
  ratesBox: {
    backgroundColor: "#242832",
    border: "1px solid #3b4252",
    padding: "0.65rem 1rem",
    fontSize: "0.78rem",
    lineHeight: "1.6",
    borderRadius: "2px",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  metricCard: {
    backgroundColor: "#242832",
    border: "1px solid #3b4252",
    padding: "1.25rem",
    boxShadow: "3px 3px 0px #111317",
  },
  metricLabel: {
    fontSize: "0.7rem",
    color: "#9aa5b8",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: "0.4rem",
  },
  metricBig: {
    fontSize: "1.8rem",
    fontWeight: "bold",
    color: "#eceff4",
    marginBottom: "0.25rem",
  },
  usd: {
    fontSize: "0.85rem",
    color: "#81a1c1",
    fontWeight: "normal",
  },
  metricSub: {
    fontSize: "0.75rem",
    color: "#707d91",
  },
  inputsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2.5rem",
  },
  panelBox: {
    backgroundColor: "#242832",
    border: "1px solid #3b4252",
    boxShadow: "4px 4px 0px #111317",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.8rem 1.25rem",
    backgroundColor: "#20242e",
    fontSize: "0.78rem",
  },
  rateBadge: {
    backgroundColor: "#2e3440",
    padding: "0.2rem 0.5rem",
    fontSize: "0.7rem",
    color: "#d8dee9",
    border: "1px solid #434c5e",
  },
  formStack: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  label: {
    display: "block",
    fontSize: "0.7rem",
    color: "#8892b0",
    marginBottom: "0.4rem",
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    backgroundColor: "#1b1d24",
    border: "1px solid #434c5e",
    color: "#eceff4",
    padding: "0.65rem 0.75rem",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    borderRadius: "2px",
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    width: "100%",
    backgroundColor: "#1b1d24",
    border: "1px solid #434c5e",
    color: "#eceff4",
    padding: "0.65rem 0.75rem",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    borderRadius: "2px",
    boxSizing: "border-box",
    outline: "none",
  },
  btnBlue: {
    backgroundColor: "#435b75",
    color: "#eceff4",
    border: "1px solid #5e81ac",
    padding: "0.8rem",
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: "0.8rem",
    cursor: "pointer",
    borderRadius: "2px",
    boxShadow: "2px 2px 0px #111317",
    marginTop: "0.5rem",
  },
  btnAmber: {
    backgroundColor: "#615233",
    color: "#eceff4",
    border: "1px solid #ebcb8b",
    padding: "0.8rem",
    fontFamily: "inherit",
    fontWeight: "bold",
    fontSize: "0.8rem",
    cursor: "pointer",
    borderRadius: "2px",
    boxShadow: "2px 2px 0px #111317",
    marginTop: "0.5rem",
  },
  tableCard: {
    backgroundColor: "#242832",
    border: "1px solid #3b4252",
    boxShadow: "4px 4px 0px #111317",
  },
  tableHeaderBar: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.85rem 1.25rem",
    backgroundColor: "#20242e",
    borderBottom: "1px solid #3b4252",
    fontSize: "0.75rem",
    color: "#81a1c1",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.82rem",
  },
  th: {
    backgroundColor: "#1f232c",
    color: "#81a1c1",
    padding: "0.85rem 1.25rem",
    fontSize: "0.72rem",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #3b4252",
  },
  tr: {
    borderBottom: "1px solid #2e3440",
  },
  td: {
    padding: "0.85rem 1.25rem",
  },
  tag: {
    display: "inline-block",
    padding: "0.2rem 0.5rem",
    fontSize: "0.7rem",
    border: "1px solid",
    borderRadius: "2px",
    fontWeight: "bold",
  },
  emptyPrompt: {
    padding: "3rem",
    textAlign: "center",
    color: "#6c7a96",
    fontStyle: "italic",
  },
  errorBanner: {
    backgroundColor: "#3b2528",
    border: "1px solid #bf616a",
    color: "#d08770",
    padding: "0.85rem 1.25rem",
    marginBottom: "1.5rem",
    fontSize: "0.85rem",
  },
  btnDelete: {
    backgroundColor: '#3b2226',
    color: '#e0828d',
    border: '1px solid #7a3a44',
    padding: '0.3rem 0.6rem',
    fontFamily: 'inherit',
    fontSize: '0.7rem',
    cursor: 'pointer',
    borderRadius: '2px',
    letterSpacing: '0.5px',
  },
};
