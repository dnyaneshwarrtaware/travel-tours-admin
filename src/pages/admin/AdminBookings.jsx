import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { bookingsApi } from '../../services/adminService';
import { PageHeader, Toolbar, Pagination } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, StatusBadge } from '../../components/common/ui';
import BookingDetailModal from '../../components/admin/BookingDetailModal';
import { formatCurrency, formatDate, formatDateTime, formatTime, BOOKING_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../../utils/format';

export function BookingsTable({ fixed = {}, title, subtitle, showCreate = true }) {
  const { can } = useAuth();
  const [params] = useSearchParams();
  const [f, setF] = useState({ q: params.get('q') || '', booking_status: '', payment_status: '', payment_method: '', date_from: '', date_to: '', page: 1, ...fixed });
  const list = useData(() => bookingsApi.list(f), [JSON.stringify(f)]);
  const [open, setOpen] = useState(null);
  const set = (k, v) => setF(s => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));

  return (
    <div className="ad-page">
      <PageHeader title={title} subtitle={subtitle}
        actions={showCreate && can('bookings.manage') && <Link className="btn btn-navy btn-sm" to="/admin/bookings/new"><Plus size={16} /> New Booking</Link>} />
      <div className="ad-card">
        <Toolbar>
          <div className="gt-search-input ad-search" style={{ padding: '0 0.6rem' }}><Search size={15} /><input placeholder="Booking ID, name or phone" value={f.q} onChange={e => set('q', e.target.value)} style={{ padding: '0.5rem 0', fontWeight: 500, fontSize: '0.875rem' }} /></div>
          {!fixed.booking_status && (
            <select className="form-control" value={f.booking_status} onChange={e => set('booking_status', e.target.value)}>
              <option value="">All booking statuses</option>{Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          )}
          <select className="form-control" value={f.payment_status} onChange={e => set('payment_status', e.target.value)}>
            <option value="">All payment statuses</option>{Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="form-control" value={f.payment_method} onChange={e => set('payment_method', e.target.value)}>
            <option value="">All methods</option>{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" className="form-control" value={f.date_from} onChange={e => set('date_from', e.target.value)} aria-label="Travel date from" title="Travel date from" />
          <input type="date" className="form-control" value={f.date_to} onChange={e => set('date_to', e.target.value)} aria-label="Travel date to" title="Travel date to" />
        </Toolbar>
        {list.loading ? <div className="ad-card-pad"><Loading rows={6} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No bookings found" message="Try changing the filters." />
          : (
            <>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Booking</th><th>Customer</th><th>Journey</th><th>Seats</th><th className="num">Amount</th><th>Method</th><th>Booking</th><th>Payment</th></tr></thead>
                  <tbody>
                    {list.data.map(b => (
                      <tr key={b.id} className="is-clickable" onClick={() => setOpen(b.id)}>
                        <td className="ad-mono"><strong>{b.booking_number}</strong><small>{formatDateTime(b.created_at)}{b.source === 'admin' ? ' · counter' : ''}</small></td>
                        <td>{b.contact_name}<small>{b.contact_phone}</small></td>
                        <td>{b.boarding_stop_name} → {b.dropping_stop_name}<small>{formatDate(b.travel_date)} · {formatTime(b.departure_time)}</small></td>
                        <td>{b.seats}</td>
                        <td className="num">{formatCurrency(b.total_amount)}</td>
                        <td>{PAYMENT_METHOD[b.payment_method]}</td>
                        <td><StatusBadge kind="booking" value={b.booking_status} />{b.cancellation_reason && <small>{b.cancellation_reason}</small>}</td>
                        <td><StatusBadge kind="payment" value={b.payment_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={list.meta} onPage={p => set('page', p)} />
            </>
          )}
      </div>
      <BookingDetailModal bookingId={open} onClose={() => setOpen(null)} onChanged={list.reload} />
    </div>
  );
}

export default function AdminBookings() {
  return <BookingsTable title="Bookings" subtitle="All website and counter bookings. Click a row for details and actions." />;
}

export function AdminCancellations() {
  return <BookingsTable title="Cancellations" subtitle="Cancelled bookings and their refund status. Process refunds from Payments." fixed={{ booking_status: 'cancelled' }} showCreate={false} />;
}
