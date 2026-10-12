import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { routesApi, locationsApi } from '../../services/adminService';
import { useData } from '../../hooks/useData';

const toRow = (s) => ({
  id: s.id, location_id: s.location_id, stop_name: s.stop_name,
  arrival_time: s.arrival_time?.slice(0, 5) || '', departure_time: s.departure_time?.slice(0, 5) || '',
  boarding_allowed: !!s.boarding_allowed, dropping_allowed: !!s.dropping_allowed, landmark: s.landmark || '',
});

/**
 * Ordered stop list for a route. The first stop must be the origin and the
 * last the destination (validated again by the API).
 */
export default function StopsEditor({ route, onSaved }) {
  const { data: allLocations } = useData(() => locationsApi.list(), []);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setRows(route.stops.filter(s => s.is_active).map(toRow)); setDirty(false); }, [route]);

  const update = (i, k, v) => { setRows(r => r.map((x, j) => (j === i ? { ...x, [k]: v } : x))); setDirty(true); };
  const move = (i, d) => { setRows(r => { const n = [...r]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; }); setDirty(true); };
  const remove = (i) => { setRows(r => r.filter((_, j) => j !== i)); setDirty(true); };
  const add = () => {
    setRows(r => [...r.slice(0, -1), { id: null, location_id: '', stop_name: '', arrival_time: '', departure_time: '', boarding_allowed: true, dropping_allowed: true, landmark: '' }, r[r.length - 1]]);
    setDirty(true);
  };

  const validate = () => {
    if (rows.length < 2) return 'A route needs at least 2 stops';
    if (Number(rows[0].location_id) !== route.from_location_id) return `The first stop must be ${route.from_city}`;
    if (Number(rows[rows.length - 1].location_id) !== route.to_location_id) return `The last stop must be ${route.to_city}`;
    const ids = rows.map(r => Number(r.location_id));
    if (new Set(ids).size !== ids.length) return 'A location can appear only once on a route';
    for (const [i, r] of rows.entries()) {
      if (!r.location_id) return `Stop ${i + 1}: select a location`;
      if (!r.stop_name.trim()) return `Stop ${i + 1}: enter a stop name`;
      if (i === 0 && !r.departure_time) return 'The first stop needs a departure time';
      if (i === rows.length - 1 && !r.arrival_time) return 'The last stop needs an arrival time';
      if (i > 0 && i < rows.length - 1 && !r.arrival_time && !r.departure_time) return `Add a time for ${r.stop_name}`;
    }
    return null;
  };

  const save = async () => {
    const msg = validate();
    if (msg) { toast.error(msg); return; }
    setBusy(true);
    try {
      const res = await routesApi.saveStops(route.id, rows.map((r, i) => ({
        ...r, location_id: Number(r.location_id),
        boarding_allowed: i === rows.length - 1 ? false : r.boarding_allowed,
        dropping_allowed: i === 0 ? false : r.dropping_allowed,
      })));
      toast.success(res.message); setDirty(false); onSaved?.();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const onLocation = (i, id) => {
    const loc = allLocations?.find(l => l.id === Number(id));
    setRows(r => r.map((x, j) => (j === i ? { ...x, location_id: id, stop_name: x.stop_name || loc?.city || '' } : x)));
    setDirty(true);
  };

  return (
    <div>
      <div className="ad-stop-head"><span>#</span><span>Location</span><span>Stop name / point</span><span>Arrival</span><span>Departure</span><span>Boarding</span><span>Dropping</span><span /></div>
      <div className="ad-stops">
        {rows.map((r, i) => {
          const first = i === 0; const last = i === rows.length - 1;
          return (
            <div key={r.id || `new-${i}`} className="ad-stop">
              <span className="ad-stop-num">{i + 1}</span>
              <select className="form-control" value={r.location_id} onChange={e => onLocation(i, e.target.value)} disabled={first || last} aria-label="Location">
                <option value="">Select</option>
                {(allLocations || []).map(l => <option key={l.id} value={l.id}>{l.city === l.name ? l.city : `${l.city} – ${l.name}`}</option>)}
              </select>
              <input className="form-control" value={r.stop_name} onChange={e => update(i, 'stop_name', e.target.value)} placeholder="e.g. Satara Bus Stand" aria-label="Stop name" />
              <input className="form-control" type="time" value={r.arrival_time} disabled={first} onChange={e => update(i, 'arrival_time', e.target.value)} aria-label="Arrival time" />
              <input className="form-control" type="time" value={r.departure_time} disabled={last} onChange={e => update(i, 'departure_time', e.target.value)} aria-label="Departure time" />
              <label className="ui-check"><input type="checkbox" checked={!last && r.boarding_allowed} disabled={first || last} onChange={e => update(i, 'boarding_allowed', e.target.checked)} /> Board</label>
              <label className="ui-check"><input type="checkbox" checked={!first && r.dropping_allowed} disabled={first || last} onChange={e => update(i, 'dropping_allowed', e.target.checked)} /> Drop</label>
              <span className="ad-stop-actions">
                <button type="button" className="ui-icon-btn" disabled={i <= 1 || last} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={16} /></button>
                <button type="button" className="ui-icon-btn" disabled={first || i >= rows.length - 2} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={16} /></button>
                <button type="button" className="ui-icon-btn" disabled={first || last} onClick={() => remove(i)} aria-label="Remove stop"><Trash2 size={16} /></button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="gt-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={add}><Plus size={15} /> Add intermediate stop</button>
        <button type="button" className="btn btn-navy btn-sm" onClick={save} disabled={busy || !dirty}><Save size={15} /> {busy ? 'Saving…' : 'Save stops'}</button>
      </div>
      <p className="ui-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Times are the reference schedule; each trip shifts them to its own departure time. Overnight times (e.g. 21:00 → 01:00) roll over automatically.
        Removing a stop used by bookings deactivates it instead of deleting it.
      </p>
    </div>
  );
}
