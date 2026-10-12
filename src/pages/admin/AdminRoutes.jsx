import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { routesApi, locationsApi } from '../../services/adminService';
import { PageHeader, FormModal, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, ConfirmDialog } from '../../components/common/ui';
import { formatCurrency, formatDuration } from '../../utils/format';

export default function AdminRoutes() {
  const navigate = useNavigate();
  const list = useData(() => routesApi.list(), []);
  const locations = useData(() => locationsApi.list({ status: 'active' }), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const locOptions = (locations.data || []).map(l => ({ value: l.id, label: l.city === l.name ? l.city : `${l.city} – ${l.name}` }));
  const fields = [
    { name: 'from_location_id', label: 'From', type: 'select', required: true, options: locOptions, hidden: () => !!editing?.id && editing.upcoming_trips > 0 },
    { name: 'to_location_id', label: 'To', type: 'select', required: true, options: locOptions, hidden: () => !!editing?.id && editing.upcoming_trips > 0,
      validate: (v, all) => (v && String(v) === String(all.from_location_id) ? 'From and To cannot be the same' : null) },
    { name: 'name', label: 'Route Name (optional)', span: true, placeholder: 'e.g. Express via Satara', hint: 'Use when you run more than one route between the same cities' },
    { name: 'distance_km', label: 'Distance (km)', type: 'number', min: 0, max: 5000 },
    { name: 'is_active', label: 'Status', type: 'checkbox', checkLabel: 'Active (bookable)' },
    { name: 'is_popular', label: 'Popular', type: 'checkbox', checkLabel: 'Show on homepage' },
    { name: 'description', label: 'Description', type: 'textarea', span: true },
  ];

  const save = async (v) => {
    const body = { ...v, is_active: !!v.is_active, is_popular: !!v.is_popular, from_location_id: Number(v.from_location_id), to_location_id: Number(v.to_location_id) };
    if (editing.id) {
      const res = await routesApi.update(editing.id, body);
      toast.success(res.message); setEditing(null); list.reload();
    } else {
      const res = await routesApi.create(body);
      toast.success(res.message); setEditing(null);
      navigate(`/admin/routes/${res.data.id}`);
    }
  };

  const remove = async () => {
    setBusy(true);
    try { const res = await routesApi.remove(deleting.id); toast.success(res.message); setDeleting(null); list.reload(); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="ad-page">
      <PageHeader title="Routes" subtitle="Origin → destination routes. Open a route to manage its stops and segment fares."
        actions={<button className="btn btn-navy btn-sm" onClick={() => setEditing({ is_active: true })}><Plus size={16} /> Create Route</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={4} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No routes yet" message="Create your first route, then add its stops and fares." />
          : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Route</th><th className="num">Stops</th><th className="num">Fares</th><th className="num">From fare</th><th>Duration</th><th className="num">Upcoming trips</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.map(r => (
                    <tr key={r.id} className={r.is_active ? '' : 'is-muted'}>
                      <td><Link to={`/admin/routes/${r.id}`}><strong>{r.from_city} <ArrowRight size={13} style={{ verticalAlign: '-2px' }} /> {r.to_city}</strong></Link>{r.name && <small>{r.name}</small>}</td>
                      <td className="num">{r.stop_count}</td>
                      <td className="num">{r.fare_count ? r.fare_count : <span className="ui-badge ui-tone-red">None</span>}</td>
                      <td className="num">{r.min_fare ? formatCurrency(r.min_fare) : '—'}</td>
                      <td>{r.duration_minutes ? formatDuration(r.duration_minutes) : '—'}</td>
                      <td className="num">{r.upcoming_trips}</td>
                      <td><ActiveBadge active={r.is_active} />{r.is_popular ? <small>Popular</small> : null}</td>
                      <td><div className="ad-actions">
                        <Link className="btn btn-navy btn-xs" to={`/admin/routes/${r.id}`}>Stops & Fares</Link>
                        <button className="btn btn-outline btn-xs" onClick={() => setEditing({ ...r, is_active: !!r.is_active, is_popular: !!r.is_popular })}>Edit</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setDeleting(r)}>Delete</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <FormModal open={!!editing} title={editing?.id ? `Edit ${editing.from_city} → ${editing.to_city}` : 'Create Route'} fields={fields} initial={editing}
        onClose={() => setEditing(null)} onSubmit={save} submitLabel={editing?.id ? 'Save' : 'Create & add stops'} />
      <ConfirmDialog open={!!deleting} title="Delete route?" tone="danger" confirmLabel="Delete route" busy={busy}
        message={`${deleting?.from_city} → ${deleting?.to_city} will be removed from the website. Routes with upcoming active bookings cannot be deleted - deactivate them instead.`}
        onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  );
}
