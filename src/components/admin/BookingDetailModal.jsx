import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { bookingsApi } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { Modal, StatusBadge, Loading, ErrorState, ConfirmDialog, Field } from '../common/ui';
import { formatCurrency, formatDate, formatDateTime, formatTime, PAYMENT_METHOD, todayISO } from '../../utils/format';

export default function BookingDetailModal({ bookingId, onClose, onChanged }) {
  const { can } = useAuth();
  const [b, setB] = useState(null);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => { setError(null); bookingsApi.get(bookingId).then(r => setB(r.data)).catch(setError); };
  useEffect(() => { if (bookingId) { setB(null); load(); } }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setBusy(true);
    try {
      const res = action === 'cancel' ? await bookingsApi.cancel(b.id, reason) : await bookingsApi.setStatus(b.id, action);
      toast.success(res.message); setB(res.data); setAction(null); setReason(''); onChanged?.();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const active = b && ['pending', 'reserved', 'confirmed'].includes(b.booking_status);
  const travelled = b && b.travel_date <= todayISO();

  return (
    <Modal open={!!bookingId} title={b ? `Booking ${b.booking_number}` : 'Booking'} size="lg" onClose={onClose} footer={b && (
      <>
        {b.payment && (can('payments.view') || can('payments.verify')) && <Link className="btn btn-outline btn-sm" to={`/admin/payments?q=${b.booking_number}`}>Open payment</Link>}
        {can('bookings.manage') && active && travelled && b.booking_status === 'confirmed' && <button className="btn btn-outline btn-sm" onClick={() => setAction('completed')}>Mark completed</button>}
        {can('bookings.manage') && active && travelled && <button className="btn btn-outline btn-sm" onClick={() => setAction('no_show')}>Mark no-show</button>}
        {can('bookings.manage') && active && <button className="btn btn-danger btn-sm" onClick={() => setAction('cancel')}>Cancel booking</button>}
      </>
    )}>
      {error ? <ErrorState error={error} onRetry={load} /> : !b ? <Loading /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <StatusBadge kind="booking" value={b.booking_status} /><StatusBadge kind="payment" value={b.payment_status} />
            <span className="ui-badge ui-tone-grey">{b.source === 'admin' ? 'Counter booking' : 'Website'}</span>
          </div>
          <div className="ad-split" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <dl className="ad-kv">
              <dt>Route</dt><dd>{b.from_city} → {b.to_city}</dd>
              <dt>Travel date</dt><dd>{formatDate(b.travel_date)}</dd>
              <dt>Boarding</dt><dd>{b.boarding_stop_name} · {formatTime(b.boarding_at)}</dd>
              <dt>Dropping</dt><dd>{b.dropping_stop_name}{b.dropping_at ? ` · ${formatTime(b.dropping_at)}` : ''}</dd>
              <dt>Bus</dt><dd>{b.vehicle_name} · {b.registration_number}</dd>
              <dt>Trip</dt><dd><Link to={`/admin/trips/${b.trip_id}`}>View trip & seat map</Link></dd>
            </dl>
            <dl className="ad-kv">
              <dt>Contact</dt><dd>{b.contact_name}</dd>
              <dt>Phone</dt><dd>{b.contact_phone}</dd>
              <dt>Email</dt><dd>{b.contact_email || '—'}</dd>
              <dt>Fare / seat</dt><dd>{formatCurrency(b.fare_per_seat)}</dd>
              <dt>Total</dt><dd><strong>{formatCurrency(b.total_amount)}</strong></dd>
              <dt>Created</dt><dd>{formatDateTime(b.created_at)}</dd>
            </dl>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Seat</th><th>Passenger</th><th>Age</th><th>Gender</th><th>Mobile</th><th className="num">Fare</th></tr></thead>
              <tbody>{b.passengers.map(p => <tr key={p.id}><td><strong>{p.seat_number}</strong></td><td>{p.name}</td><td>{p.age}</td><td style={{ textTransform: 'capitalize' }}>{p.gender}</td><td>{p.mobile || '—'}</td><td className="num">{formatCurrency(p.fare)}</td></tr>)}</tbody>
            </table>
          </div>
          {b.payment && (
            <dl className="ad-kv">
              <dt>Payment</dt><dd>{PAYMENT_METHOD[b.payment.payment_method]} · <StatusBadge kind="payment" value={b.payment.payment_status} /> · {formatCurrency(b.payment.amount)}</dd>
              {b.payment.upi_reference && <><dt>Customer UPI ref</dt><dd className="ad-mono">{b.payment.upi_reference}</dd></>}
              {b.payment.transaction_reference && <><dt>Txn reference</dt><dd className="ad-mono">{b.payment.transaction_reference}</dd></>}
              {b.payment.verified_by_name && <><dt>Verified by</dt><dd>{b.payment.verified_by_name} · {formatDateTime(b.payment.verified_at)}</dd></>}
              {b.payment.remarks && <><dt>Remarks</dt><dd>{b.payment.remarks}</dd></>}
            </dl>
          )}
          {b.booking_status === 'cancelled' && <p className="gt-note gt-note-warn">Cancelled {formatDateTime(b.cancelled_at)} by {b.cancelled_by_type}{b.cancellation_reason ? `: ${b.cancellation_reason}` : ''}</p>}
        </div>
      )}
      <ConfirmDialog open={!!action} busy={busy}
        title={action === 'cancel' ? 'Cancel booking?' : action === 'completed' ? 'Mark as completed?' : 'Mark as no-show?'}
        tone={action === 'completed' ? 'primary' : 'danger'}
        confirmLabel={action === 'cancel' ? 'Cancel booking' : 'Confirm'}
        message={action === 'cancel'
          ? (b?.payment_status === 'paid' || b?.payment_status === 'verification_pending' ? 'Seats will be released and the payment will be marked Refund Pending.' : 'Seats will be released for other customers.')
          : action === 'no_show' ? 'Seats are released. Unpaid bookings are closed without payment.' : null}
        onConfirm={() => { if (action === 'cancel' && reason.trim().length < 3) { toast.error('Enter a cancellation reason'); return; } run(); }}
        onClose={() => { setAction(null); setReason(''); }}>
        {action === 'cancel' && <Field label="Reason" required><input className="form-control" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Customer called to cancel" /></Field>}
      </ConfirmDialog>
    </Modal>
  );
}
