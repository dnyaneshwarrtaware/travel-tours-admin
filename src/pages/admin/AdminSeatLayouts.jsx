import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { seatLayoutsApi } from '../../services/adminService';
import { PageHeader, ActiveBadge } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, Modal, Field } from '../../components/common/ui';
import SeatMap from '../../components/common/SeatMap';

// Preview only - the server generates the real seats with the same numbering rule
const previewSeats = ({ seat_type, decks, rows_count, cols_count }) => {
  const out = []; let id = 0;
  (Number(decks) === 2 ? ['lower', 'upper'] : ['lower']).forEach(deck => {
    let n = 0;
    for (let r = 1; r <= rows_count; r++) {
      for (let c = 1; c <= cols_count; c++) {
        n++; const num = String(n).padStart(2, '0');
        out.push({ id: ++id, deck, row_no: r, col_no: c, seat_type, status: 'AVAILABLE',
          seat_number: seat_type === 'sleeper' || Number(decks) === 2 ? `${deck === 'lower' ? 'L' : 'U'}${num}` : num });
      }
    }
  });
  return out;
};

export default function AdminSeatLayouts() {
  const list = useData(() => seatLayoutsApi.list(), []);
  const [creating, setCreating] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);

  const grid = creating && {
    seat_type: creating.seat_type, decks: Number(creating.decks), rows_count: Math.min(20, Math.max(1, Number(creating.rows_count) || 1)),
    cols_count: Math.min(5, Math.max(2, Number(creating.cols_count) || 2)), aisle_after_col: Number(creating.aisle_after_col) || 1,
  };
  const preview = useMemo(() => (grid ? previewSeats(grid) : []), [creating]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    if (!creating.name?.trim()) { toast.error('Enter a layout name'); return; }
    if (grid.aisle_after_col >= grid.cols_count) { toast.error('Aisle must be inside the row'); return; }
    setBusy(true);
    try {
      const res = await seatLayoutsApi.create({ name: creating.name.trim(), description: creating.description, ...grid });
      toast.success(`${res.message} (${res.data.total_seats} seats)`); setCreating(null); list.reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const open = async (l) => {
    try { const res = await seatLayoutsApi.get(l.id); setViewing(res.data); } catch (err) { toast.error(err.message); }
  };

  const toggleSeat = async (s) => {
    try {
      const res = await seatLayoutsApi.setSeat(viewing.id, s.id, !s.is_active);
      toast.success(`Seat ${s.seat_number}: ${res.message.toLowerCase()}`);
      setViewing(v => ({ ...v, seats: v.seats.map(x => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)) }));
      list.reload();
    } catch (err) { toast.error(err.message); }
  };

  const toggleLayout = async (l) => {
    try { const res = await seatLayoutsApi.update(l.id, { is_active: !l.is_active }); toast.success(res.message); list.reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="ad-page">
      <PageHeader title="Seat Layouts" subtitle="Seat plans assigned to vehicles"
        actions={<button className="btn btn-navy btn-sm" onClick={() => setCreating({ name: '', seat_type: 'seater', decks: 1, rows_count: 10, cols_count: 4, aisle_after_col: 2 })}><Plus size={16} /> New Layout</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={2} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No seat layouts" />
          : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead><tr><th>Layout</th><th>Type</th><th>Grid</th><th className="num">Seats in service</th><th className="num">Vehicles</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.map(l => (
                    <tr key={l.id} className={l.is_active ? '' : 'is-muted'}>
                      <td><strong>{l.name}</strong>{l.description && <small>{l.description}</small>}</td>
                      <td style={{ textTransform: 'capitalize' }}>{l.seat_type}</td>
                      <td>{l.decks === 2 ? '2 decks · ' : ''}{l.rows_count} rows × {l.cols_count}</td>
                      <td className="num">{l.active_seats} / {l.total_seats}</td>
                      <td className="num">{l.vehicle_count}</td>
                      <td><ActiveBadge active={l.is_active} /></td>
                      <td><div className="ad-actions">
                        <button className="btn btn-outline btn-xs" onClick={() => open(l)}>View seats</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => toggleLayout(l)}>{l.is_active ? 'Deactivate' : 'Activate'}</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <Modal open={!!creating} title="New seat layout" size="lg" onClose={() => setCreating(null)} footer={(
        <><button className="btn btn-ghost" onClick={() => setCreating(null)}>Cancel</button><button className="btn btn-navy" onClick={create} disabled={busy}>{busy ? 'Creating…' : `Create ${preview.length} seats`}</button></>
      )}>
        {creating && (
          <div className="ad-split">
            <div className="ui-grid">
              <Field label="Layout name" required className="ui-span-2"><input className="form-control" value={creating.name} onChange={e => setCreating({ ...creating, name: e.target.value })} placeholder="AC Seater 2+2 (40)" /></Field>
              <Field label="Seat type"><select className="form-control" value={creating.seat_type} onChange={e => setCreating({ ...creating, seat_type: e.target.value })}><option value="seater">Seater</option><option value="sleeper">Sleeper</option></select></Field>
              <Field label="Decks"><select className="form-control" value={creating.decks} onChange={e => setCreating({ ...creating, decks: e.target.value })}><option value={1}>1 (single)</option><option value={2}>2 (lower + upper)</option></select></Field>
              <Field label="Rows per deck"><input className="form-control" type="number" min={1} max={20} value={creating.rows_count} onChange={e => setCreating({ ...creating, rows_count: e.target.value })} /></Field>
              <Field label="Seats per row"><input className="form-control" type="number" min={2} max={5} value={creating.cols_count} onChange={e => setCreating({ ...creating, cols_count: e.target.value })} /></Field>
              <Field label="Aisle after seat" hint="e.g. 2 for 2+2 seating"><input className="form-control" type="number" min={1} max={4} value={creating.aisle_after_col} onChange={e => setCreating({ ...creating, aisle_after_col: e.target.value })} /></Field>
              <Field label="Description" className="ui-span-2"><input className="form-control" value={creating.description || ''} onChange={e => setCreating({ ...creating, description: e.target.value })} /></Field>
            </div>
            <div><p className="ui-muted" style={{ marginBottom: '0.5rem' }}>Preview · {preview.length} seats</p><SeatMap layout={grid} seats={preview} mode="admin" /></div>
          </div>
        )}
      </Modal>

      <Modal open={!!viewing} title={viewing?.name} size="lg" onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <p className="ui-muted" style={{ marginBottom: '1rem' }}>Click a seat to take it out of service (e.g. crew seat) or bring it back. This applies to every trip using this layout; existing bookings are kept.</p>
            <SeatMap layout={viewing} mode="admin" seats={viewing.seats.map(s => ({ ...s, status: s.is_active ? 'AVAILABLE' : 'BLOCKED' }))} onToggle={toggleSeat} />
          </>
        )}
      </Modal>
    </div>
  );
}
