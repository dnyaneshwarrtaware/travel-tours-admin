import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { vehiclesApi, operatorsApi, seatLayoutsApi } from '../../services/adminService';
import { PageHeader, FormModal, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState } from '../../components/common/ui';
import { busLabel } from '../../utils/format';

const TYPES = [
  { value: 'bus', label: 'Bus (Seater)' }, { value: 'sleeper_bus', label: 'Sleeper Bus' }, { value: 'luxury_bus', label: 'Luxury Bus' },
  { value: 'mini_bus', label: 'Mini Bus' }, { value: 'tempo_traveller', label: 'Tempo Traveller' }, { value: 'suv', label: 'SUV' }, { value: 'sedan', label: 'Sedan' },
];
const REG_RE = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;
const parseAmenities = (a) => (Array.isArray(a) ? a : (() => { try { return JSON.parse(a || '[]'); } catch { return []; } })());

export default function AdminVehicles() {
  const list = useData(() => vehiclesApi.list(), []);
  const operators = useData(() => operatorsApi.list(), []);
  const layouts = useData(() => seatLayoutsApi.list(), []);
  const [editing, setEditing] = useState(null);

  const fields = [
    { name: 'registration_number', label: 'Vehicle Number', required: true, placeholder: 'MH12AB1234',
      validate: v => (REG_RE.test(String(v || '').toUpperCase().replace(/[\s-]/g, '')) ? null : 'Enter a valid number, e.g. MH12AB1234') },
    { name: 'name', label: 'Vehicle Name', required: true, placeholder: 'Ganraj Express' },
    { name: 'type', label: 'Vehicle Type', type: 'select', required: true, options: TYPES },
    { name: 'operator_id', label: 'Operator', type: 'select', options: (operators.data || []).filter(o => o.is_active).map(o => ({ value: o.id, label: o.name })) },
    { name: 'seat_layout_id', label: 'Seat Layout', type: 'select', required: true, span: true,
      hint: 'Total seats and seater/sleeper come from the layout',
      options: (layouts.data || []).filter(l => l.is_active).map(l => ({ value: l.id, label: `${l.name} · ${l.active_seats} ${l.seat_type === 'sleeper' ? 'berths' : 'seats'}` })) },
    { name: 'is_ac', label: 'AC', type: 'checkbox', checkLabel: 'Air conditioned (AC)' },
    { name: 'is_active', label: 'Active', type: 'checkbox', checkLabel: 'Active (can run trips)' },
    { name: 'amenities', label: 'Amenities', span: true, placeholder: 'AC, Charging Point, Water Bottle', hint: 'Comma separated' },
    { name: 'description', label: 'Description', type: 'textarea', span: true },
  ];

  const save = async (v) => {
    const body = {
      ...v, registration_number: String(v.registration_number).toUpperCase(), is_ac: !!v.is_ac, is_active: !!v.is_active,
      seat_layout_id: Number(v.seat_layout_id), operator_id: v.operator_id ? Number(v.operator_id) : null,
      amenities: String(v.amenities || '').split(',').map(s => s.trim()).filter(Boolean),
    };
    const res = editing.id ? await vehiclesApi.update(editing.id, body) : await vehiclesApi.create(body);
    toast.success(res.message); setEditing(null); list.reload();
  };

  return (
    <div className="ad-page">
      <PageHeader title="Vehicles" subtitle="Buses that run trips. Seats come from the assigned seat layout."
        actions={<button className="btn btn-navy btn-sm" onClick={() => setEditing({ type: 'bus', is_ac: true, is_active: true })}><Plus size={16} /> Add Vehicle</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={4} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No vehicles yet" />
          : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Vehicle No.</th><th>Name</th><th>Type</th><th>Operator</th><th>Seat Layout</th><th className="num">Seats</th><th className="num">Upcoming trips</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.map(v => (
                    <tr key={v.id} className={v.is_active ? '' : 'is-muted'}>
                      <td className="ad-mono"><strong>{v.registration_number}</strong></td>
                      <td>{v.name}</td>
                      <td>{busLabel(v)}<small>{TYPES.find(t => t.value === v.type)?.label}</small></td>
                      <td>{v.operator_name || '—'}</td>
                      <td>{v.seat_layout_name || <span className="ui-badge ui-tone-red">Not set</span>}</td>
                      <td className="num">{v.capacity}</td>
                      <td className="num">{v.upcoming_trips}</td>
                      <td><ActiveBadge active={v.is_active} /></td>
                      <td><div className="ad-actions">
                        <button className="btn btn-outline btn-xs" onClick={() => setEditing({ ...v, is_ac: !!v.is_ac, is_active: !!v.is_active, amenities: parseAmenities(v.amenities).join(', ') })}>Edit</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      <FormModal open={!!editing} title={editing?.id ? `Edit ${editing.registration_number}` : 'Add Vehicle'} fields={fields} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />
    </div>
  );
}
