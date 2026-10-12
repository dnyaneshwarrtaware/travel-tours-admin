import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { locationsApi } from '../../services/adminService';
import { PageHeader, Toolbar, FormModal, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, ConfirmDialog } from '../../components/common/ui';

const FIELDS = [
  { name: 'name', label: 'Location Name', required: true, placeholder: 'e.g. Satara' },
  { name: 'city', label: 'City', required: true },
  { name: 'state', label: 'State', required: true },
  { name: 'latitude', label: 'Latitude', type: 'number', step: 'any', min: -90, max: 90 },
  { name: 'longitude', label: 'Longitude', type: 'number', step: 'any', min: -180, max: 180 },
  { name: 'is_popular', label: 'Popular', type: 'checkbox', checkLabel: 'Show as a popular city' },
  { name: 'is_active', label: 'Active', type: 'checkbox', checkLabel: 'Active (available in search)' },
];

export default function AdminLocations() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const list = useData(() => locationsApi.list({ q, status }), [q, status]);
  const [editing, setEditing] = useState(null);
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (v) => {
    const body = { ...v, is_popular: !!v.is_popular, is_active: !!v.is_active };
    const res = editing.id ? await locationsApi.update(editing.id, body) : await locationsApi.create(body);
    toast.success(res.message); setEditing(null); list.reload();
  };

  const doToggle = async () => {
    setBusy(true);
    try {
      const res = await locationsApi.setStatus(toggle.id, !toggle.is_active);
      toast.success(res.message); setToggle(null); list.reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="ad-page">
      <PageHeader title="Locations" subtitle="Cities and towns used as route stops and in customer search"
        actions={<button className="btn btn-navy btn-sm" onClick={() => setEditing({ state: 'Maharashtra', is_active: true })}><Plus size={16} /> Add Location</button>} />
      <div className="ad-card">
        <Toolbar>
          <div className="gt-search-input ad-search" style={{ padding: '0 0.6rem' }}><Search size={15} /><input placeholder="Search name or city" value={q} onChange={e => setQ(e.target.value)} style={{ padding: '0.5rem 0', fontWeight: 500, fontSize: '0.875rem' }} /></div>
          <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </Toolbar>
        {list.loading ? <div className="ad-card-pad"><Loading rows={4} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No locations found" />
          : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Location</th><th>City</th><th>State</th><th>Slug</th><th className="num">Routes</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.map(l => (
                    <tr key={l.id} className={l.is_active ? '' : 'is-muted'}>
                      <td><strong>{l.name}</strong>{l.is_popular ? <small>Popular</small> : null}</td>
                      <td>{l.city}</td><td>{l.state}</td><td className="ad-mono">{l.slug}</td>
                      <td className="num">{l.route_count}</td>
                      <td><ActiveBadge active={l.is_active} /></td>
                      <td><div className="ad-actions">
                        <button className="btn btn-outline btn-xs" onClick={() => setEditing({ ...l, is_active: !!l.is_active, is_popular: !!l.is_popular })}>Edit</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => setToggle(l)}>{l.is_active ? 'Deactivate' : 'Activate'}</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <FormModal open={!!editing} title={editing?.id ? `Edit ${editing.name}` : 'Add Location'} fields={FIELDS} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />
      <ConfirmDialog open={!!toggle} title={toggle?.is_active ? 'Deactivate location?' : 'Activate location?'} busy={busy}
        tone={toggle?.is_active ? 'danger' : 'primary'} confirmLabel={toggle?.is_active ? 'Deactivate' : 'Activate'}
        message={toggle?.is_active ? `${toggle?.name} will no longer appear in customer search. Existing routes and bookings are not changed.` : `${toggle?.name} will be available again.`}
        onConfirm={doToggle} onClose={() => setToggle(null)} />
    </div>
  );
}
