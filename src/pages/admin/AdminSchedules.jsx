import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { schedulesApi, routesApi, vehiclesApi } from '../../services/adminService';
import { PageHeader, FormModal, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, Modal, Field } from '../../components/common/ui';
import { formatDate, formatTime, todayISO, addDaysISO } from '../../utils/format';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const daysLabel = (s) => { const d = String(s).split(',').map(Number); return d.length === 7 ? 'Daily' : d.map(x => DAY[x]).join(', '); };

export default function AdminSchedules() {
  const list = useData(() => schedulesApi.list(), []);
  const routes = useData(() => routesApi.list({ status: 'active' }), []);
  const vehicles = useData(() => vehiclesApi.list(), []);
  const [editing, setEditing] = useState(null);
  const [gen, setGen] = useState(null);
  const [busy, setBusy] = useState(false);

  const fields = [
    { name: 'route_id', label: 'Route', type: 'select', required: true, span: true, options: (routes.data || []).map(r => ({ value: r.id, label: `${r.from_city} → ${r.to_city}${r.name ? ` · ${r.name}` : ''}` })) },
    { name: 'vehicle_id', label: 'Vehicle', type: 'select', required: true, span: true, options: (vehicles.data || []).filter(v => v.is_active && v.seat_layout_id).map(v => ({ value: v.id, label: `${v.registration_number} · ${v.name}` })) },
    { name: 'departure_time', label: 'Departure', type: 'time', required: true },
    { name: 'arrival_time', label: 'Arrival', type: 'time' },
    { name: 'days_of_week', label: 'Runs on', type: 'days', required: true, span: true },
    { name: 'start_date', label: 'Start date', type: 'date', required: true },
    { name: 'end_date', label: 'End date', type: 'date', required: true, validate: (v, a) => (a.start_date && v < a.start_date ? 'End date must be after start date' : null) },
    { name: 'fare_adjustment_pct', label: 'Fare adjustment %', type: 'number', min: -90, max: 300 },
    { name: 'is_active', label: 'Active', type: 'checkbox', checkLabel: 'Active' },
  ];

  const save = async (v) => {
    const body = { ...v, route_id: Number(v.route_id), vehicle_id: Number(v.vehicle_id), days_of_week: v.days_of_week.join(','), is_active: !!v.is_active, fare_adjustment_pct: v.fare_adjustment_pct || 0 };
    const res = editing.id ? await schedulesApi.update(editing.id, body) : await schedulesApi.create(body);
    toast.success(res.message); setEditing(null); list.reload();
  };

  const generate = async () => {
    setBusy(true);
    try {
      const res = await schedulesApi.generate(gen.id, gen.from, gen.to);
      toast.success(res.message);
      if (res.data.skipped.length) toast(res.data.skipped.slice(0, 3).map(s => `${s.date}: ${s.reason}`).join('\n'), { duration: 6000 });
      setGen(null); list.reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="ad-page">
      <PageHeader title="Schedules" subtitle="Recurring departures. Generate trips from a schedule for a date range."
        actions={<button className="btn btn-navy btn-sm" onClick={() => setEditing({ days_of_week: [0, 1, 2, 3, 4, 5, 6], start_date: todayISO(), end_date: addDaysISO(todayISO(), 90), is_active: true })}><Plus size={16} /> New Schedule</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={4} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No schedules yet" />
          : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Route</th><th>Departure</th><th>Vehicle</th><th>Runs on</th><th>Valid</th><th className="num">Upcoming trips</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.map(s => (
                    <tr key={s.id} className={s.is_active ? '' : 'is-muted'}>
                      <td><strong>{s.from_city} → {s.to_city}</strong>{Number(s.fare_adjustment_pct) ? <small>Fare {Number(s.fare_adjustment_pct)}%</small> : null}</td>
                      <td>{formatTime(s.departure_time)}<small>Arr {formatTime(s.arrival_time)}</small></td>
                      <td>{s.vehicle_name}<small className="ad-mono">{s.registration_number}</small></td>
                      <td>{daysLabel(s.days_of_week)}</td>
                      <td>{formatDate(s.start_date)} – {formatDate(s.end_date)}<small>Trips until {s.last_trip_date ? formatDate(s.last_trip_date) : '—'}</small></td>
                      <td className="num">{s.upcoming_trips}</td>
                      <td><ActiveBadge active={s.is_active} /></td>
                      <td><div className="ad-actions">
                        <button className="btn btn-navy btn-xs" disabled={!s.is_active} onClick={() => setGen({ id: s.id, from: todayISO(), to: addDaysISO(todayISO(), 30) })}>Generate trips</button>
                        <button className="btn btn-outline btn-xs" onClick={() => setEditing({ ...s, departure_time: s.departure_time?.slice(0, 5), arrival_time: s.arrival_time?.slice(0, 5), days_of_week: String(s.days_of_week).split(',').map(Number), is_active: !!s.is_active })}>Edit</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <FormModal open={!!editing} title={editing?.id ? 'Edit Schedule' : 'New Schedule'} fields={fields} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />
      <Modal open={!!gen} title="Generate trips" size="sm" onClose={() => setGen(null)} footer={(
        <><button className="btn btn-ghost" onClick={() => setGen(null)}>Cancel</button><button className="btn btn-navy" disabled={busy} onClick={generate}>{busy ? 'Generating…' : 'Generate'}</button></>
      )}>
        {gen && (
          <div className="ui-grid">
            <Field label="From"><input type="date" className="form-control" min={todayISO()} value={gen.from} onChange={e => setGen({ ...gen, from: e.target.value })} /></Field>
            <Field label="To"><input type="date" className="form-control" min={gen.from} value={gen.to} onChange={e => setGen({ ...gen, to: e.target.value })} /></Field>
            <p className="ui-muted ui-span-2" style={{ fontSize: '0.85rem' }}>Existing trips are skipped, and dates where the vehicle is already busy are reported.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
