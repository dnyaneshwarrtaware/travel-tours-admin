import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { tripsApi, routesApi, vehiclesApi } from '../../services/adminService';
import { PageHeader, Toolbar, FormModal, Pagination } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, StatusBadge, ConfirmDialog, Field } from '../../components/common/ui';
import { formatDate, formatTime, formatCurrency, todayISO, addDaysISO, TRIP_STATUS } from '../../utils/format';

const NEXT = { scheduled: ['boarding', 'cancelled'], boarding: ['running', 'cancelled'], running: ['completed'], completed: [], cancelled: [] };

export default function AdminTrips() {
  const [filters, setFilters] = useState({ date_from: todayISO(), date_to: addDaysISO(todayISO(), 6), route_id: '', status: '', page: 1 });
  const list = useData(() => tripsApi.list(filters), [JSON.stringify(filters)]);
  const routes = useData(() => routesApi.list({ status: 'active' }), []);
  const vehicles = useData(() => vehiclesApi.list(), []);
  const [creating, setCreating] = useState(null);
  const [statusChange, setStatusChange] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: k === 'page' ? v : 1 }));

  const fields = [
    { name: 'route_id', label: 'Route', type: 'select', required: true, span: true, options: (routes.data || []).map(r => ({ value: r.id, label: `${r.from_city} → ${r.to_city}${r.name ? ` · ${r.name}` : ''}` })) },
    { name: 'vehicle_id', label: 'Vehicle', type: 'select', required: true, span: true, options: (vehicles.data || []).filter(v => v.is_active && v.seat_layout_id).map(v => ({ value: v.id, label: `${v.registration_number} · ${v.name} (${v.capacity} seats)` })) },
    { name: 'travel_date', label: 'Travel Date', type: 'date', required: true, validate: v => (v < todayISO() ? 'Travel date cannot be in the past' : null) },
    { name: 'departure_time', label: 'Departure', type: 'time', required: true },
    { name: 'arrival_time', label: 'Arrival (optional)', type: 'time', hint: 'Defaults to the route timings' },
    { name: 'fare_adjustment_pct', label: 'Fare adjustment %', type: 'number', min: -90, max: 300, hint: 'e.g. -10 for a non-AC service' },
    { name: 'notes', label: 'Notes', type: 'textarea', span: true },
  ];

  const create = async (v) => {
    const res = await tripsApi.create({ ...v, route_id: Number(v.route_id), vehicle_id: Number(v.vehicle_id), fare_adjustment_pct: v.fare_adjustment_pct || 0 });
    toast.success(res.message); setCreating(null); list.reload();
  };

  const changeStatus = async () => {
    setBusy(true);
    try {
      const res = await tripsApi.setStatus(statusChange.trip.id, statusChange.status, reason);
      toast.success(res.message); setStatusChange(null); setReason(''); list.reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="ad-page">
      <PageHeader title="Trips" subtitle="A vehicle running a route on a date. Use Schedules to create trips in bulk."
        actions={<button className="btn btn-navy btn-sm" onClick={() => setCreating({ travel_date: addDaysISO(todayISO(), 1) })}><Plus size={16} /> Create Trip</button>} />
      <div className="ad-card">
        <Toolbar>
          <input type="date" className="form-control" value={filters.date_from} onChange={e => setF('date_from', e.target.value)} aria-label="From date" />
          <input type="date" className="form-control" value={filters.date_to} onChange={e => setF('date_to', e.target.value)} aria-label="To date" />
          <select className="form-control" value={filters.route_id} onChange={e => setF('route_id', e.target.value)}>
            <option value="">All routes</option>
            {(routes.data || []).map(r => <option key={r.id} value={r.id}>{r.from_city} → {r.to_city}</option>)}
          </select>
          <select className="form-control" value={filters.status} onChange={e => setF('status', e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(TRIP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Toolbar>
        {list.loading ? <div className="ad-card-pad"><Loading rows={5} /></div>
          : list.error ? <ErrorState title="Unable to load trips." error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No trips in this period" message="Change the dates or create a trip." />
          : (
            <>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Date</th><th>Route</th><th>Departure</th><th>Vehicle</th><th className="num">Seats</th><th className="num">Bookings</th><th className="num">Collected</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {list.data.map(t => (
                      <tr key={t.id}>
                        <td><strong>{formatDate(t.travel_date, { year: undefined, weekday: 'short' })}</strong></td>
                        <td>{t.from_city} → {t.to_city}{Number(t.fare_adjustment_pct) ? <small>Fare {t.fare_adjustment_pct > 0 ? '+' : ''}{Number(t.fare_adjustment_pct)}%</small> : null}</td>
                        <td>{formatTime(t.departure_time)}<small>Arr {formatTime(t.arrival_time)}</small></td>
                        <td>{t.vehicle_name}<small className="ad-mono">{t.registration_number}</small></td>
                        <td className="num">{t.total_seats - t.available_seats}/{t.total_seats}</td>
                        <td className="num">{t.booking_count}</td>
                        <td className="num">{formatCurrency(t.paid_amount)}</td>
                        <td><StatusBadge kind="trip" value={t.status} /></td>
                        <td><div className="ad-actions">
                          <Link className="btn btn-outline btn-xs" to={`/admin/trips/${t.id}`}>Seats & passengers</Link>
                          {NEXT[t.status].map(s => (
                            <button key={s} className={`btn btn-xs ${s === 'cancelled' ? 'btn-ghost' : 'btn-outline'}`} onClick={() => setStatusChange({ trip: t, status: s })}>
                              {s === 'cancelled' ? 'Cancel' : `Mark ${TRIP_STATUS[s].label}`}
                            </button>
                          ))}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={list.meta} onPage={p => setF('page', p)} />
            </>
          )}
      </div>

      <FormModal open={!!creating} title="Create Trip" fields={fields} initial={creating} onClose={() => setCreating(null)} onSubmit={create} submitLabel="Create trip" />
      <ConfirmDialog
        open={!!statusChange} busy={busy}
        title={statusChange?.status === 'cancelled' ? 'Cancel this trip?' : `Mark trip as ${TRIP_STATUS[statusChange?.status]?.label}?`}
        tone={statusChange?.status === 'cancelled' ? 'danger' : 'primary'}
        confirmLabel={statusChange?.status === 'cancelled' ? 'Cancel trip & bookings' : 'Update status'}
        message={statusChange?.status === 'cancelled'
          ? `All ${statusChange?.trip.booking_count} active booking(s) on this trip will be cancelled, seats released, and paid bookings flagged for refund.`
          : statusChange?.status === 'completed' ? 'Confirmed bookings on this trip will be marked completed. Completed trips cannot accept new bookings.' : null}
        onConfirm={changeStatus} onClose={() => { setStatusChange(null); setReason(''); }}
      >
        {statusChange?.status === 'cancelled' && <Field label="Reason"><input className="form-control" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Vehicle breakdown" /></Field>}
      </ConfirmDialog>
    </div>
  );
}
