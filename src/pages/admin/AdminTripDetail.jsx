import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { tripsApi } from '../../services/adminService';
import { PageHeader } from '../../components/admin/AdminUI';
import { Loading, ErrorState, StatusBadge, EmptyState } from '../../components/common/ui';
import SeatMap from '../../components/common/SeatMap';
import RouteTimeline from '../../components/common/RouteTimeline';
import { formatDate, formatTime, PAYMENT_METHOD } from '../../utils/format';

export default function AdminTripDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const trip = useData(() => tripsApi.get(id), [id]);
  const [busy, setBusy] = useState(false);

  if (trip.loading) return <Loading />;
  if (trip.error) return <ErrorState error={trip.error} onRetry={trip.reload} />;
  const t = trip.data;
  const editable = can('trips.manage') && ['scheduled', 'boarding'].includes(t.status);

  // Admin can block/unblock free seats (e.g. reserved for staff)
  const onSeat = async (s) => {
    if (s.status === 'BOOKED') { toast(`Seat ${s.seat_number}: booking ${s.booking_number}`); return; }
    if (!editable || busy) return;
    if (s.status === 'LOCKED') { toast('This seat is on hold by a customer checking out'); return; }
    const block = s.status === 'AVAILABLE';
    if (!block && !s.admin_blocked) { toast('This seat is disabled in the seat layout'); return; }
    setBusy(true);
    try { const res = await tripsApi.blockSeats(t.id, [s.id], block); toast.success(`Seat ${s.seat_number}: ${res.message.toLowerCase()}`); trip.reload(); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="ad-page">
      <PageHeader title={`${t.from_city} → ${t.to_city}`}
        subtitle={<><Link to="/admin/trips">Trips</Link> / {formatDate(t.travel_date)} · {formatTime(t.departure_time)} · {t.vehicle.name} ({t.vehicle.registration_number})</>}
        actions={<StatusBadge kind="trip" value={t.status} />} />
      <div className="ad-stats">
        <div className="ad-stat"><span>Seats</span><strong>{t.total_seats}</strong></div>
        <div className="ad-stat"><span>Available</span><strong>{t.available_seats}</strong></div>
        <div className="ad-stat"><span>Passengers</span><strong>{t.manifest.length}</strong></div>
        <div className="ad-stat"><span>Fare adj.</span><strong>{Number(t.fare_adjustment_pct) || 0}%</strong></div>
      </div>
      <div className="ad-split">
        <div className="ad-card ad-card-pad">
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Seat map</h3>
          {editable && <p className="ui-muted" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>Click an available seat to block it for this trip; click a blocked seat to release it.</p>}
          <div className="seatmap-admin">
            <SeatMap layout={t.seat_map.layout} seats={t.seat_map.seats} mode="admin" onToggle={onSeat}
              renderTitle={s => (s.booking_number ? `Seat ${s.seat_number} · ${s.booking_number}` : `Seat ${s.seat_number} · ${s.status.toLowerCase()}`)} />
          </div>
        </div>
        <div className="ad-card ad-card-pad">
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Stops</h3>
          <RouteTimeline stops={t.stops} travelDate={t.travel_date} compact />
          {t.notes && <p className="gt-note" style={{ marginTop: '1rem' }}>{t.notes}</p>}
        </div>
      </div>
      <div className="ad-card">
        <div className="ad-card-head"><h3>Passenger manifest</h3></div>
        {!t.manifest.length ? <EmptyState title="No passengers yet" /> : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Seat</th><th>Passenger</th><th>Boarding → Dropping</th><th>Booking</th><th>Phone</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>
                {t.manifest.map((m, i) => (
                  <tr key={i}>
                    <td><strong>{m.seat_number}</strong></td>
                    <td>{m.name}<small>{m.age} · {m.gender}</small></td>
                    <td>{m.boarding} → {m.dropping}</td>
                    <td className="ad-mono"><Link to={`/admin/bookings?q=${m.booking_number}`}>{m.booking_number}</Link></td>
                    <td>{m.contact_phone}</td>
                    <td>{PAYMENT_METHOD[m.payment_method]}<br /><StatusBadge kind="payment" value={m.payment_status} /></td>
                    <td><StatusBadge kind="booking" value={m.booking_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
