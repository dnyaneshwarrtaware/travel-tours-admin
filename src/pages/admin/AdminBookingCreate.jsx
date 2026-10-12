import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { tripsApi, bookingsApi } from '../../services/adminService';
import { tripService } from '../../services/bookingService';
import { PageHeader } from '../../components/admin/AdminUI';
import { Loading, ErrorState, EmptyState, Field } from '../../components/common/ui';
import SeatMap from '../../components/common/SeatMap';
import { formatCurrency, formatTime, todayISO } from '../../utils/format';

const emptyPax = (seat_id) => ({ seat_id, name: '', age: '', gender: '', mobile: '' });

// Counter booking by staff. Fare, seat availability and statuses are decided by the API.
export default function AdminBookingCreate() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [date, setDate] = useState(todayISO());
  const trips = useData(() => tripsApi.list({ date_from: date, date_to: date, limit: 100 }), [date]);
  const [tripId, setTripId] = useState('');
  const [trip, setTrip] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [boardingId, setBoardingId] = useState('');
  const [droppingId, setDroppingId] = useState('');
  const [selected, setSelected] = useState([]);
  const [pax, setPax] = useState([]);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [method, setMethod] = useState('CASH');
  const [paidNow, setPaidNow] = useState(false);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTrip(null); setSeatMap(null); setSelected([]); setPax([]);
    if (!tripId) return;
    Promise.all([tripService.get(tripId), tripService.seats(tripId)])
      .then(([t, s]) => {
        setTrip(t.data); setSeatMap(s.data);
        setBoardingId(String(t.data.stops.find(x => x.boarding_allowed)?.id || ''));
        setDroppingId(String([...t.data.stops].reverse().find(x => x.dropping_allowed)?.id || ''));
      })
      .catch(err => toast.error(err.message));
  }, [tripId]);

  const idx = useMemo(() => Object.fromEntries((trip?.stops || []).map((s, i) => [s.id, i])), [trip]);
  const fare = trip?.fares.find(f => f.from_stop_id === Number(boardingId) && f.to_stop_id === Number(droppingId))?.fare;
  const seatNo = (id) => seatMap?.seats.find(s => s.id === id)?.seat_number;

  const toggle = (s) => {
    if (!['AVAILABLE'].includes(s.status) && !selected.includes(s.id)) return;
    setSelected(sel => {
      const next = sel.includes(s.id) ? sel.filter(x => x !== s.id) : [...sel, s.id];
      setPax(p => next.map(id => p.find(x => x.seat_id === id) || emptyPax(id)));
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected.length) { toast.error('Select at least one seat'); return; }
    if (fare === undefined) { toast.error('No fare configured for the selected segment'); return; }
    if (!/^[6-9]\d{9}$/.test(contact.phone)) { toast.error('Enter a valid 10-digit contact number'); return; }
    if (pax.some(p => !p.name.trim() || !p.age || !p.gender)) { toast.error('Fill name, age and gender for each passenger'); return; }
    setBusy(true);
    try {
      const res = await bookingsApi.create({
        trip_id: Number(tripId), boarding_stop_id: Number(boardingId), dropping_stop_id: Number(droppingId),
        passengers: pax.map(p => ({ ...p, age: Number(p.age), mobile: p.mobile || null })),
        contact: { ...contact, email: contact.email || null }, payment_method: method,
        mark_paid_now: paidNow, transaction_reference: reference || null,
      });
      toast.success(res.message);
      navigate(`/admin/bookings?q=${res.data.booking_number}`);
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) tripService.seats(tripId).then(s => { setSeatMap(s.data); setSelected([]); setPax([]); });
    } finally { setBusy(false); }
  };

  const bookable = (trips.data || []).filter(t => ['scheduled', 'boarding'].includes(t.status));

  return (
    <div className="ad-page">
      <PageHeader title="New counter booking" subtitle={<><Link to="/admin/bookings">Bookings</Link> / book a seat for a walk-in or phone customer</>} />
      <form className="ad-split" onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="ad-card ad-card-pad">
            <div className="ui-grid">
              <Field label="Travel date"><input type="date" className="form-control" min={todayISO()} value={date} onChange={e => { setDate(e.target.value); setTripId(''); }} /></Field>
              <Field label="Trip">
                <select className="form-control" value={tripId} onChange={e => setTripId(e.target.value)} disabled={trips.loading}>
                  <option value="">{trips.loading ? 'Loading…' : bookable.length ? 'Select trip' : 'No open trips on this date'}</option>
                  {bookable.map(t => <option key={t.id} value={t.id}>{formatTime(t.departure_time)} · {t.from_city} → {t.to_city} · {t.vehicle_name} ({t.available_seats} free)</option>)}
                </select>
              </Field>
              {trip && <>
                <Field label="Boarding">
                  <select className="form-control" value={boardingId} onChange={e => setBoardingId(e.target.value)}>
                    {trip.stops.filter(s => s.boarding_allowed).map(s => <option key={s.id} value={s.id}>{s.stop_name} · {formatTime(s.departure_at)}</option>)}
                  </select>
                </Field>
                <Field label="Dropping">
                  <select className="form-control" value={droppingId} onChange={e => setDroppingId(e.target.value)}>
                    {trip.stops.filter(s => s.dropping_allowed && idx[s.id] > idx[Number(boardingId)]).map(s => <option key={s.id} value={s.id}>{s.stop_name} · {formatTime(s.arrival_at)}</option>)}
                  </select>
                </Field>
              </>}
            </div>
            {trips.error && <ErrorState error={trips.error} onRetry={trips.reload} />}
          </div>
          {tripId && !seatMap ? <Loading /> : seatMap && (
            <div className="ad-card ad-card-pad"><SeatMap layout={seatMap.layout} seats={seatMap.seats} selected={selected} onToggle={toggle} /></div>
          )}
          {!tripId && <EmptyState title="Choose a trip" message="Select the date and trip to see available seats." />}
          {pax.length > 0 && (
            <div className="ad-card ad-card-pad">
              {pax.map((p, i) => (
                <div key={p.seat_id} className="gt-pax">
                  <div className="gt-pax-head"><span>Passenger {i + 1}</span><span className="badge badge-navy">Seat {seatNo(p.seat_id)}</span></div>
                  <div className="gt-pax-grid">
                    <Field label="Name" required><input className="form-control" value={p.name} onChange={e => setPax(ps => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
                    <Field label="Age" required><input className="form-control" type="number" min={1} max={120} value={p.age} onChange={e => setPax(ps => ps.map((x, j) => (j === i ? { ...x, age: e.target.value } : x)))} /></Field>
                    <Field label="Gender" required>
                      <select className="form-control" value={p.gender} onChange={e => setPax(ps => ps.map((x, j) => (j === i ? { ...x, gender: e.target.value } : x)))}>
                        <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Mobile"><input className="form-control" inputMode="numeric" maxLength={10} value={p.mobile} onChange={e => setPax(ps => ps.map((x, j) => (j === i ? { ...x, mobile: e.target.value.replace(/\D/g, '') } : x)))} /></Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="ad-card ad-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Contact & payment</h3>
          <Field label="Contact name" required><input className="form-control" value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} /></Field>
          <Field label="Contact mobile" required><input className="form-control" inputMode="numeric" maxLength={10} value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Email"><input className="form-control" type="email" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} /></Field>
          <Field label="Payment method">
            <select className="form-control" value={method} onChange={e => setMethod(e.target.value)}><option value="CASH">Cash</option><option value="UPI_QR">UPI QR</option></select>
          </Field>
          {can('payments.verify') && (
            <label className="ui-check"><input type="checkbox" checked={paidNow} onChange={e => setPaidNow(e.target.checked)} /> Payment received now ({method === 'CASH' ? 'cash collected' : 'UPI verified'})</label>
          )}
          {paidNow && <Field label={method === 'CASH' ? 'Receipt number' : 'UPI transaction ID'}><input className="form-control" value={reference} onChange={e => setReference(e.target.value)} /></Field>}
          <div className="gt-total"><span>{selected.length} × {fare !== undefined ? formatCurrency(fare) : '—'}</span><strong>{fare !== undefined ? formatCurrency(fare * selected.length) : '—'}</strong></div>
          <p className="ui-muted" style={{ fontSize: '0.8rem' }}>The final amount is calculated by the server from the configured segment fare.</p>
          <button type="submit" className="btn btn-navy" disabled={busy || !selected.length}>{busy ? 'Creating…' : 'Create booking'}</button>
        </aside>
      </form>
    </div>
  );
}
