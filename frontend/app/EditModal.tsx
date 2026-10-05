'use client';

import { useState } from 'react';

interface Props {
  row: { id: number; hours: number; rate_per_hour: number; notes: string | null };
  onUpdate: (formData: FormData) => Promise<void>;
}

export default function EditModal({ row, onUpdate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btnDelete"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)', marginRight: '6px' }}
      >
        ✎ EDITAR
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panelBox" style={{ width: '360px', background: '#131722', border: '1px solid var(--border-color)' }}>
            <div className="panelHeader"><span>[EDITAR REGISTRO #{row.id}]</span></div>
            <form action={async (fd) => { await onUpdate(fd); setOpen(false); }} className="formStack">
              <input type="hidden" name="id" value={row.id} />
              
              <div className="fieldGroup">
                <label className="label">HORAS:</label>
                <input type="number" step="0.01" name="hours" defaultValue={row.hours} required className="input" />
              </div>

              <div className="fieldGroup">
                <label className="label">TARIFA ($/H):</label>
                <input type="number" step="0.01" name="rate_per_hour" defaultValue={row.rate_per_hour} required className="input" />
              </div>

              <div className="fieldGroup">
                <label className="label">NOTAS:</label>
                <input type="text" name="notes" defaultValue={row.notes || ''} className="input" />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="submit" className="btnSubmit btnAnyone" style={{ flex: 1 }}>GUARDAR</button>
                <button type="button" onClick={() => setOpen(false)} className="btnDelete" style={{ padding: '0 12px' }}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}