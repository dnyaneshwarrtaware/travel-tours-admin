import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Ticket, IndianRupee, Route, Bus, Hourglass, CalendarClock, ArrowUpRight } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { adminService } from '../../services/adminService';
import { ErrorState, StatusBadge } from '../../components/common/ui';
import { formatCurrency, formatDate, formatTime, PAYMENT_METHOD } from '../../utils/format';
import { SERIES, AXIS, GRID, shortDate, rupees } from '../../components/admin/charts';
import styles from './AdminDashboard.module.css';

const StatCard = ({ icon: Icon, label, value, sub, color = 'navy', link }) => (
  <div className={`${styles.statCard} ${styles[`stat_${color}`]}`}>
    <div className={styles.statIcon}><Icon size={20} /></div>
    <div className={styles.statBody}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
    {link && <Link to={link} className={styles.statLink} aria-label={`Open ${label}`}><ArrowUpRight size={16} /></Link>}
  </div>
);

export default function AdminDashboard() {
  const { data, loading, error, reload } = useData(() => adminService.getDashboard(), []);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.pageHeader}><h1>Dashboard</h1></div>
      <div className={styles.statsGrid}>{[...Array(6)].map((_, i) => <div key={i} className={`skeleton ${styles.statSkeleton}`} />)}</div>
    </div>
  );
  if (error) return <ErrorState title="Unable to load dashboard" error={error} onRetry={reload} />;

  const s = data.stats;
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Dashboard</h1>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {s.verification_pending > 0 && (
        <div className={styles.warnings}>
          <Link to="/admin/payments?status=verification_pending" className={styles.warningItem}><Hourglass size={16} /> {s.verification_pending} UPI payment(s) waiting for verification</Link>
          {s.refund_pending > 0 && <Link to="/admin/payments?status=refund_pending" className={styles.warningItem}>{s.refund_pending} refund(s) pending</Link>}
        </div>
      )}

      <div className={styles.statsGrid}>
        <StatCard icon={Ticket} label="Today's Bookings" value={s.today_bookings} sub={`${s.today_seats} seats`} link="/admin/bookings" />
        <StatCard icon={IndianRupee} label="Today's Revenue" value={formatCurrency(s.today_revenue)} sub={`${formatCurrency(s.month_revenue)} this month`} color="jade" link="/admin/reports/revenue" />
        <StatCard icon={Hourglass} label="Pending Payments" value={s.pending_payments} sub={`${s.verification_pending} UPI to verify`} color="saffron" link="/admin/payments?status=action_needed" />
        <StatCard icon={CalendarClock} label="Upcoming Trips" value={s.upcoming_trips} sub={`${s.today_trips} today`} color="sky" link="/admin/trips" />
        <StatCard icon={Route} label="Active Routes" value={s.active_routes} link="/admin/routes" />
        <StatCard icon={Bus} label="Active Vehicles" value={s.active_vehicles} link="/admin/vehicles" />
      </div>

      <div className={styles.chartsRow} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className={styles.chartCard}>
          <h3>Bookings · last 14 days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.trend} margin={{ left: -20, right: 4 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip labelFormatter={shortDate} formatter={v => [v, 'Bookings']} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="bookings" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartCard}>
          <h3>Revenue collected · last 14 days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.trend} margin={{ left: 0, right: 4 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} interval="preserveStartEnd" />
              <YAxis tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} {...AXIS} />
              <Tooltip labelFormatter={shortDate} formatter={v => [rupees(v), 'Revenue']} cursor={{ fill: '#f5f5f4' }} />
              <Bar dataKey="revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.listCard}>
          <div className={styles.listCardHeader}><h3>Payments needing action</h3><Link to="/admin/payments?status=action_needed" className={styles.viewAll}>View all</Link></div>
          {!data.pending_payments.length ? <p className={styles.noData}>All caught up</p> : (
            <div className={styles.recentList}>
              {data.pending_payments.map(p => (
                <div key={p.id} className={styles.recentItem}>
                  <div className={styles.recentInfo}><strong>{p.booking_number}</strong><span>{p.contact_name} · {PAYMENT_METHOD[p.payment_method]}</span></div>
                  <div className={styles.recentMeta}><strong>{formatCurrency(p.amount)}</strong><StatusBadge kind="payment" value={p.payment_status} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.listCard}>
          <div className={styles.listCardHeader}><h3>Recent bookings</h3><Link to="/admin/bookings" className={styles.viewAll}>View all</Link></div>
          <div className={styles.recentList}>
            {data.recent_bookings.map(b => (
              <div key={b.id} className={styles.recentItem}>
                <div className={styles.recentInfo}><strong>{b.booking_number} · {b.contact_name}</strong><span>{b.from_city} → {b.to_city} · {formatDate(b.travel_date, { year: undefined })} · {b.seat_count} seat(s)</span></div>
                <div className={styles.recentMeta}><strong>{formatCurrency(b.total_amount)}</strong><StatusBadge kind="booking" value={b.booking_status} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.listCard}>
          <div className={styles.listCardHeader}><h3>Next departures</h3><Link to="/admin/trips" className={styles.viewAll}>Trips</Link></div>
          <div className={styles.recentList}>
            {data.upcoming_trips.map(t => (
              <Link key={t.id} to={`/admin/trips/${t.id}`} className={styles.recentItem}>
                <div className={styles.recentInfo}><strong>{t.from_city} → {t.to_city}</strong><span>{formatDate(t.travel_date, { year: undefined })} · {formatTime(t.departure_time)} · {t.registration_number}</span></div>
                <div className={styles.recentMeta}><strong>{t.seats_booked}/{t.capacity}</strong><span className="ui-muted" style={{ fontSize: '0.7rem' }}>booked</span></div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.listCard}>
        <div className={styles.listCardHeader}><h3>Routes · bookings in the last 30 days</h3></div>
        <div className={styles.routeList}>
          {data.route_stats.map((r, i) => (
            <div key={r.route} className={styles.routeItem}>
              <span className={styles.routeRank}>{i + 1}</span>
              <div className={styles.routeInfo}><strong>{r.route}</strong><span>{r.bookings} bookings</span></div>
              <span className={styles.routeRevenue}>{formatCurrency(r.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
