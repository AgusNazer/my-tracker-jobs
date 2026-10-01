// import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { createClient } from '../lib/supabase';
import { redirect } from 'next/navigation';
import './tracker.css';

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

async function submitAnyoneAction(formData: FormData) {
  'use server';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subproject = (formData.get('subproject') as string)?.trim() || 'General';
  const aht = parseFloat(formData.get('aht') as string) || 15.0;
  const tasks = parseFloat(formData.get('tasks') as string) || 0;

  if (tasks <= 0) return;

  const computedHours = (aht / 60.0) * tasks;
  const pricePerTask = (aht / 60.0) * BASE_RATE_ANYONE;
  const totalPay = computedHours * BASE_RATE_ANYONE;
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
  const notes = `Sub: ${subproject} (${tasks.toFixed(0)} tareas @ AHT ${aht.toFixed(0)}m - $${pricePerTask.toFixed(2)} c/u)`;

  await supabase.from('sessions').insert([
    {
      user_id: user.id,
      client: 'Anyone AI',
      hours: computedHours,
      rate_per_hour: BASE_RATE_ANYONE,
      total_pay: totalPay,
      date: dateStr,
      notes,
    },
  ]);

  revalidatePath('/');
}
async function submitInnodataAction(formData: FormData) {
  'use server';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const hours = parseFloat(formData.get('hours') as string) || 0;
  const notesInput = (formData.get('notes') as string)?.trim() || 'General';

  if (hours <= 0) return;

  const totalPay = hours * BASE_RATE_INNODATA;
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

  await supabase.from('sessions').insert([
    {
      user_id: user.id, // <-- Faltaba esto
      client: 'Innodata',
      hours,
      rate_per_hour: BASE_RATE_INNODATA,
      total_pay: totalPay,
      date: dateStr,
      notes: notesInput,
    },
  ]);

  revalidatePath('/');
}

async function deleteSessionAction(formData: FormData) {
  'use server';
  const supabase = createClient();
  const id = formData.get('id');
  if (!id) return;

  await supabase.from('sessions').delete().eq('id', id);
  revalidatePath('/');
}
async function logoutAction() {
  'use server';
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function Home() {

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let rows: SessionRow[] = [];
  let dbError = '';

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    dbError = error.message;
  } else if (data) {
    rows = data as SessionRow[];
  }

  const totalHours = rows.reduce((acc, r) => acc + (r.hours || 0), 0);
  const totalEarnings = rows.reduce((acc, r) => acc + (r.total_pay || 0), 0);

  const anyoneSessions = rows.filter((r) => r.client === 'Anyone AI');
  const anyoneHours = anyoneSessions.reduce((acc, r) => acc + (r.hours || 0), 0);
  const anyonePay = anyoneSessions.reduce((acc, r) => acc + (r.total_pay || 0), 0);

  const innodataSessions = rows.filter((r) => r.client === 'Innodata');
  const innodataHours = innodataSessions.reduce((acc, r) => acc + (r.hours || 0), 0);
  const innodataPay = innodataSessions.reduce((acc, r) => acc + (r.total_pay || 0), 0);

  return (
    <main className="container">
      <div className="wrapper">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end', marginBottom: '1rem' }}>
  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
    Usuario: <strong style={{ color: 'var(--text-main)' }}>{user.email}</strong>
  </span>
  <form action={logoutAction}>
    <button
      type="submit"
      style={{
        background: '#202531',
        border: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        padding: '0.35rem 0.8rem',
        fontSize: '0.75rem',
        borderRadius: '4px',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      Cerrar sesión
    </button>
  </form>
</div>
          <div>
            <span className="kicker">SYSTEM LOG // SUPABASE POSTGRESQL</span>
            <h1 className="title">TRACKER DE TAREAS & LIQUIDACIÓN</h1>
          </div>
          <div className="ratesBox">
            <div>ANYONE AI: <strong style={{ color: 'var(--accent-anyone)' }}>$65.00/h</strong> (AHT)</div>
            <div>INNODATA: <strong style={{ color: 'var(--accent-innodata)' }}>$8.00/h</strong> (Reloj)</div>
          </div>
        </header>

        {dbError && <div className="errorBanner">[SUPABASE_ERROR]: {dbError}</div>}

        {/* Métricas Fluidas */}
        <section className="metricsGrid">
          <div className="metricCard" style={{ borderTop: '3px solid var(--accent-total)' }}>
            <span className="metricLabel">TOTAL GENERAL</span>
            <div className="metricBig">
              ${totalEarnings.toFixed(2)} <span className="usd">USD</span>
            </div>
            <span className="metricSub">{totalHours.toFixed(2)} horas equivalentes</span>
          </div>

          <div className="metricCard" style={{ borderTop: '3px solid var(--accent-anyone)' }}>
            <span className="metricLabel">ANYONE AI</span>
            <div className="metricBig" style={{ color: 'var(--accent-anyone)' }}>
              ${anyonePay.toFixed(2)} <span className="usd">USD</span>
            </div>
            <span className="metricSub">{anyoneHours.toFixed(2)}h ({anyoneSessions.length} entradas)</span>
          </div>

          <div className="metricCard" style={{ borderTop: '3px solid var(--accent-innodata)' }}>
            <span className="metricLabel">INNODATA</span>
            <div className="metricBig" style={{ color: 'var(--accent-innodata)' }}>
              ${innodataPay.toFixed(2)} <span className="usd">USD</span>
            </div>
            <span className="metricSub">{innodataHours.toFixed(2)}h ({innodataSessions.length} entradas)</span>
          </div>
        </section>

        {/* Formularios elásticos */}
        <section className="inputsGrid">
          {/* Anyone AI */}
          <div className="panelBox">
            <div className="panelHeader">
              <span style={{ color: 'var(--accent-anyone)' }}>[1] CARGAR EN ANYONE AI</span>
              <span className="badge">$65/H BASE</span>
            </div>
            <form action={submitAnyoneAction} className="formStack">
              <div className="fieldGroup">
                <label className="label">SUBPROYECTO / TAG:</label>
                <input
                  type="text"
                  name="subproject"
                  placeholder="ej: Code Review, RLHF, Math"
                  required
                  className="input"
                />
              </div>

              <div className="fieldGroup">
                <label className="label">SELECCIONAR AHT:</label>
                <select name="aht" defaultValue="15" className="select">
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

              <div className="fieldGroup">
                <label className="label">CANTIDAD DE TAREAS:</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  name="tasks"
                  placeholder="ej: 6"
                  required
                  className="input"
                />
              </div>

              <button type="submit" className="btnSubmit btnAnyone">
                + GUARDAR TAREAS ANYONE
              </button>
            </form>
          </div>

          {/* Innodata */}
          <div className="panelBox">
            <div className="panelHeader">
              <span style={{ color: 'var(--accent-innodata)' }}>[2] CARGAR EN INNODATA</span>
              <span className="badge">$8/H RELOJ</span>
            </div>
            <form action={submitInnodataAction} className="formStack">
              <div className="fieldGroup">
                <label className="label">HORAS RELOJ TRABAJADAS:</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  name="hours"
                  placeholder="ej: 3.5"
                  required
                  className="input"
                />
              </div>

              <div className="fieldGroup">
                <label className="label">NOTAS / DETALLES:</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="ej: Anotación de datos, QA, General"
                  className="input"
                />
              </div>

              <button type="submit" className="btnSubmit btnInnodata">
                + GUARDAR HORAS INNODATA
              </button>
            </form>
          </div>
        </section>

        {/* Tabla Adaptativa con Scroll Suave */}
        <section className="tableCard">
          <div className="tableHeaderBar">
            <span>HISTORIAL ACUMULADO // SUPABASE CLOUD</span>
            <span>TOTAL: {rows.length} ENTRADAS</span>
          </div>

          {rows.length === 0 ? (
            <div className="emptyPrompt">&gt; No hay sesiones guardadas en Supabase todavía.</div>
          ) : (
            <div className="tableScroll">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">FECHA</th>
                    <th className="th">PLATAFORMA</th>
                    <th className="th">HORAS EQ.</th>
                    <th className="th">TARIFA</th>
                    <th className="th">LIQUIDACIÓN</th>
                    <th className="th">DETALLES / NOTAS</th>
                    <th className="th" style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isAnyone = r.client === 'Anyone AI';
                    return (
                      <tr key={r.id} className="tr">
                        <td className="td" style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          {r.date}
                        </td>
                        <td className="td">
                          <span className={`badgeClient ${isAnyone ? 'badgeAnyone' : 'badgeInnodata'}`}>
                            {r.client}
                          </span>
                        </td>
                        <td className="td" style={{ fontWeight: 600 }}>{r.hours.toFixed(2)} h</td>
                        <td className="td" style={{ color: 'var(--text-dim)' }}>${r.rate_per_hour.toFixed(2)}</td>
                        <td className="td" style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                          ${r.total_pay.toFixed(2)} USD
                        </td>
                        <td className="td" style={{ color: '#a0aab8', fontSize: '0.78rem' }}>
                          {r.notes || '--'}
                        </td>
                        <td className="td" style={{ textAlign: 'center' }}>
                          <form action={deleteSessionAction} style={{ display: 'inline' }}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="btnDelete">
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
    </main>
  );
}