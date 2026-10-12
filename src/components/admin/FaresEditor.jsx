import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { routesApi } from '../../services/adminService';

/**
 * Segment fare matrix: rows = boarding stops, columns = later dropping stops.
 * Empty cell = no fare (segment cannot be booked).
 */
export default function FaresEditor({ route, onSaved }) {
  const stops = useMemo(() => route.stops.filter(s => s.is_active).sort((a, b) => a.stop_order - b.stop_order), [route]);
  const original = useMemo(() => {
    const m = {};
    route.fares.filter(f => f.is_active).forEach(f => { m[`${f.from_stop_id}-${f.to_stop_id}`] = String(f.fare); });
    return m;
  }, [route]);
  const [values, setValues] = useState(original);
  const [busy, setBusy] = useState(false);
  useEffect(() => setValues(original), [original]);

  const boards = stops.filter(s => s.boarding_allowed);
  const drops = stops.filter(s => s.dropping_allowed);
  const invalid = (v) => v !== '' && v !== undefined && (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 100000);
  const changed = Object.keys({ ...original, ...values }).filter(k => (values[k] ?? '') !== (original[k] ?? ''));

  const save = async () => {
    if (changed.some(k => invalid(values[k]))) { toast.error('Fares must be numbers between 0 and 100000 (no negative fares)'); return; }
    setBusy(true);
    try {
      const fares = changed.map(k => { const [a, b] = k.split('-').map(Number); return { from_stop_id: a, to_stop_id: b, fare: values[k] === '' ? null : Number(values[k]) }; });
      const res = await routesApi.saveFares(route.id, fares);
      toast.success(res.message); onSaved?.();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  if (stops.length < 2) return <p className="ui-muted">Add stops to this route first.</p>;

  return (
    <div>
      <div className="ad-table-wrap">
        <table className="ad-matrix">
          <thead>
            <tr><th className="row">From ↓ / To →</th>{drops.map(d => <th key={d.id}>{d.stop_name}</th>)}</tr>
          </thead>
          <tbody>
            {boards.map(b => (
              <tr key={b.id}>
                <th className="row">{b.stop_name}</th>
                {drops.map(d => {
                  const key = `${b.id}-${d.id}`;
                  if (d.stop_order <= b.stop_order) return <td key={key} className="na">—</td>;
                  const v = values[key] ?? '';
                  return (
                    <td key={key}>
                      <input
                        inputMode="decimal" value={v} placeholder="—" aria-label={`Fare ${b.stop_name} to ${d.stop_name}`}
                        className={`${invalid(v) ? 'is-invalid' : ''} ${(original[key] ?? '') !== v ? 'is-dirty' : ''}`}
                        onChange={e => setValues(s => ({ ...s, [key]: e.target.value.replace(/[^\d.]/g, '') }))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="gt-actions">
        <span className="ui-muted" style={{ fontSize: '0.85rem' }}>{changed.length ? `${changed.length} unsaved change(s)` : 'Fares in ₹ per seat. Leave a cell empty to stop selling that segment.'}</span>
        <button type="button" className="btn btn-navy btn-sm" disabled={!changed.length || busy} onClick={save}><Save size={15} /> {busy ? 'Saving…' : 'Save fares'}</button>
      </div>
    </div>
  );
}
