// Display helpers. Values are always computed by the backend; these only format them.

export const formatCurrency = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// 'HH:MM[:SS]' or 'YYYY-MM-DD HH:MM:SS' → '06:00 AM'
export const formatTime = (t) => {
  if (!t) return '—';
  const time = String(t).includes(' ') ? String(t).split(' ')[1] : String(t);
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

const parseDate = (d) => {
  if (!d) return null;
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return new Date(s.includes('T') ? s : s.replace(' ', 'T'));
};

// '2026-10-15' → '15 Oct 2026'
export const formatDate = (d, opts = {}) => {
  const date = parseDate(d);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
};

export const formatDateTime = (d) => {
  const date = parseDate(d);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, ${formatTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`)}`;
};

export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// Date of a 'YYYY-MM-DD HH:MM:SS' differs from the travel date → show "+1 day"
export const dayOffset = (dateTime, travelDate) => {
  if (!dateTime || !travelDate) return 0;
  return Math.round((parseDate(dateTime.slice(0, 10)) - parseDate(travelDate)) / 86400000);
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDaysISO = (iso, n) => {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const BOOKING_STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  reserved: { label: 'Reserved', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  completed: { label: 'Completed', tone: 'blue' },
  no_show: { label: 'No Show', tone: 'grey' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  verification_pending: { label: 'Verification Pending', tone: 'violet' },
  paid: { label: 'Paid', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
  refund_pending: { label: 'Refund Pending', tone: 'amber' },
  refunded: { label: 'Refunded', tone: 'blue' },
  not_applicable: { label: 'Not Applicable', tone: 'grey' },
};

export const TRIP_STATUS = {
  scheduled: { label: 'Scheduled', tone: 'blue' },
  boarding: { label: 'Boarding', tone: 'amber' },
  running: { label: 'Running', tone: 'violet' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
};

export const PAYMENT_METHOD = { CASH: 'Cash', UPI_QR: 'UPI QR' };

export const busLabel = (v) => [v.is_ac ? 'AC' : 'Non-AC', v.seat_type === 'sleeper' ? 'Sleeper' : 'Seater'].join(' ');
