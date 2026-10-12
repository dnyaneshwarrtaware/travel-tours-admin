import { useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { customersApi } from '../../services/adminService';
import { PageHeader, Toolbar, Pagination } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, Modal, StatusBadge } from '../../components/common/ui';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

export default function AdminCustomers() {
  const [f, setF] = useState({ q: '', type: '', page: 1 });
  const list = useData(() => customersApi.list(f), [JSON.stringify(f)]);
  const [open, setOpen] = useState(null);
  const detail = useData(() => customersApi.get(open), [open], { enabled: !!open });
  const set = (k, v) => setF(s => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));

  return (
    <div className="ad-page">
      <PageHeader title="Customers" subtitle="Registered accounts and guest contacts from bookings" />
      <div className="ad-card">
        <Toolbar>
          <div className="gt-search-input ad-search" style={{ padding: '0 0.6rem' }}><Search size={15} /><input placeholder="Name, email or phone" value={f.q} onChange={e => set('q', e.target.value)} style={{ padding: '0.5rem 0', fontWeight: 500, fontSize: '0.875rem' }} /></div>
          <select className="form-control" value={f.type} onChange={e => set('type', e.target.value)}><option value="">All customers</option><option value="registered">Registered</option><option value="guest">Guest</option></select>
        </Toolbar>
        {list.loading ? <div className="ad-card-pad"><Loading rows={5} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No customers found" />
          : (
            <>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Customer</th><th>Phone</th><th>Type</th><th className="num">Bookings</th><th className="num">Paid</th><th>Last booking</th></tr></thead>
                  <tbody>
                    {list.data.map(c => (
                      <tr key={c.id} className="is-clickable" onClick={() => setOpen(c.id)}>
                        <td><strong>{c.name}</strong><small>{c.email || '—'}</small></td>
                        <td>{c.phone}</td>
                        <td><span className={`ui-badge ${c.is_registered ? 'ui-tone-blue' : 'ui-tone-grey'}`}>{c.is_registered ? 'Registered' : 'Guest'}</span></td>
                        <td className="num">{c.booking_count}</td>
                        <td className="num">{formatCurrency(c.total_paid)}</td>
                        <td>{c.last_booking_at ? formatDateTime(c.last_booking_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={list.meta} onPage={p => set('page', p)} />
            </>
          )}
      </div>
      <Modal open={!!open} title={detail.data?.name || 'Customer'} size="lg" onClose={() => setOpen(null)}>
        {detail.loading ? <Loading /> : detail.error ? <ErrorState error={detail.error} /> : detail.data && (
          <>
            <dl className="ad-kv" style={{ marginBottom: '1rem' }}>
              <dt>Phone</dt><dd>{detail.data.phone}</dd><dt>Email</dt><dd>{detail.data.email || '—'}</dd>
              <dt>Since</dt><dd>{formatDate(detail.data.created_at)}</dd>
            </dl>
            {!detail.data.bookings.length ? <EmptyState title="No bookings" /> : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Booking</th><th>Journey</th><th className="num">Amount</th><th>Status</th><th>Payment</th></tr></thead>
                  <tbody>{detail.data.bookings.map(b => (
                    <tr key={b.id}><td className="ad-mono">{b.booking_number}</td><td>{b.from_city} → {b.to_city}<small>{formatDate(b.travel_date)}</small></td><td className="num">{formatCurrency(b.total_amount)}</td><td><StatusBadge kind="booking" value={b.booking_status} /></td><td><StatusBadge kind="payment" value={b.payment_status} /></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
