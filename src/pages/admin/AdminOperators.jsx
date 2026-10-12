import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { operatorsApi } from '../../services/adminService';
import { PageHeader, FormModal, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState } from '../../components/common/ui';

const FIELDS = [
  { name: 'name', label: 'Operator Name', required: true, span: true },
  { name: 'contact_person', label: 'Contact Person' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'is_active', label: 'Active', type: 'checkbox', checkLabel: 'Active' },
  { name: 'address', label: 'Address', type: 'textarea', span: true },
];

export default function AdminOperators() {
  const list = useData(() => operatorsApi.list(), []);
  const [editing, setEditing] = useState(null);

  const save = async (v) => {
    const body = { ...v, is_active: !!v.is_active };
    const res = editing.id ? await operatorsApi.update(editing.id, body) : await operatorsApi.create(body);
    toast.success(res.message); setEditing(null); list.reload();
  };

  return (
    <div className="ad-page">
      <PageHeader title="Operators" subtitle="Companies that own or run vehicles"
        actions={<button className="btn btn-navy btn-sm" onClick={() => setEditing({ is_active: true })}><Plus size={16} /> Add Operator</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={3} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No operators yet" />
          : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Operator</th><th>Contact</th><th>Phone</th><th>Email</th><th className="num">Vehicles</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.map(o => (
                    <tr key={o.id} className={o.is_active ? '' : 'is-muted'}>
                      <td><strong>{o.name}</strong>{o.address && <small>{o.address}</small>}</td>
                      <td>{o.contact_person || '—'}</td><td>{o.phone || '—'}</td><td>{o.email || '—'}</td>
                      <td className="num">{o.vehicle_count}</td><td><ActiveBadge active={o.is_active} /></td>
                      <td><div className="ad-actions"><button className="btn btn-outline btn-xs" onClick={() => setEditing({ ...o, is_active: !!o.is_active })}>Edit</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <FormModal open={!!editing} title={editing?.id ? `Edit ${editing.name}` : 'Add Operator'} fields={FIELDS} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />
    </div>
  );
}
