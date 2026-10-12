import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useData } from '../../hooks/useData';
import { reportsApi } from '../../services/adminService';
import { PageHeader, Toolbar } from '../../components/admin/AdminUI';
import { Loading, ErrorState, EmptyState } from '../../components/common/ui';
import { formatCurrency, todayISO, addDaysISO } from '../../utils/format';
import { SERIES, AXIS, GRID, shortDate, rupees } from '../../components/admin/charts';

const TITLES = { bookings: 'Booking Report', revenue: 'Revenue Report', routes: 'Route Report', vehicles: 'Vehicle Report' };

const Table = ({ cols, rows }) => (
  <div className="ad-table-wrap">
    <table className="ad-table">
      <thead><tr>{cols.map(c => <th key={c.key} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(c => <td key={c.key} className={c.num ? 'num' : ''}>{c.fmt ? c.fmt(r[c.key], r) : r[c.key]}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

export default function AdminReports() {
  const { type = 'bookings' } = useParams();
  const [range, setRange] = useState({ from: addDaysISO(todayISO(), -29), to: todayISO() });
  const rep = useData(() => reportsApi.get(type, range), [type, range.from, range.to]);
  const d = rep.data;

  return (
    <div className="ad-page">
      <PageHeader title={TITLES[type] || 'Reports'} />
      <div className="ad-tabs">{Object.entries(TITLES).map(([k, v]) => <NavLink key={k} to={`/admin/reports/${k}`} className={({ isActive }) => (isActive ? 'is-active' : '')}>{v}</NavLink>)}</div>
      <div className="ad-card">
        <Toolbar>
          <input type="date" className="form-control" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} aria-label="From" />
          <input type="date" className="form-control" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} aria-label="To" />
          <span className="ui-muted" style={{ fontSize: '0.8rem' }}>{type === 'bookings' ? 'By booking date' : type === 'revenue' ? 'By payment date' : 'By travel date'}</span>
        </Toolbar>
        <div className="ad-card-pad">
          {rep.loading ? <Loading /> : rep.error ? <ErrorState error={rep.error} onRetry={rep.reload} /> : (
            <>
              {type === 'bookings' && (!d.daily.length ? <EmptyState title="No bookings in this period" /> : <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={d.daily} margin={{ left: -20 }}>
                    <CartesianGrid {...GRID} /><XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} /><YAxis allowDecimals={false} {...AXIS} />
                    <Tooltip labelFormatter={shortDate} /><Bar dataKey="bookings" name="Bookings" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
                <Table rows={d.daily} cols={[{ key: 'date', label: 'Date' }, { key: 'bookings', label: 'Bookings', num: true }, { key: 'seats', label: 'Seats', num: true }, { key: 'confirmed', label: 'Confirmed', num: true }, { key: 'pending', label: 'Pending', num: true }, { key: 'cancelled', label: 'Cancelled', num: true }, { key: 'booked_value', label: 'Booked value', num: true, fmt: formatCurrency }]} />
              </>)}
              {type === 'revenue' && <>
                <div className="ad-stats" style={{ marginBottom: '1rem' }}>
                  <div className="ad-stat"><span>Collected</span><strong>{formatCurrency(d.daily.reduce((a, r) => a + Number(r.total), 0))}</strong></div>
                  <div className="ad-stat"><span>Cash pending</span><strong>{formatCurrency(d.outstanding.cash_pending)}</strong></div>
                  <div className="ad-stat"><span>UPI to verify</span><strong>{formatCurrency(d.outstanding.verification_pending)}</strong></div>
                  <div className="ad-stat"><span>Refunds pending</span><strong>{formatCurrency(d.outstanding.refund_pending)}</strong></div>
                </div>
                {!d.daily.length ? <EmptyState title="No payments collected in this period" /> : <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={d.daily}>
                      <CartesianGrid {...GRID} /><XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} /><YAxis tickFormatter={v => `₹${Math.round(v / 1000)}k`} {...AXIS} />
                      <Tooltip labelFormatter={shortDate} formatter={v => rupees(v)} /><Legend />
                      <Bar dataKey="cash" name="Cash" stackId="a" fill={SERIES[0]} stroke="#fff" strokeWidth={2} maxBarSize={22} />
                      <Bar dataKey="upi_qr" name="UPI QR" stackId="a" fill={SERIES[1]} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table rows={d.daily} cols={[{ key: 'date', label: 'Date' }, { key: 'payments', label: 'Payments', num: true }, { key: 'cash', label: 'Cash', num: true, fmt: formatCurrency }, { key: 'upi_qr', label: 'UPI QR', num: true, fmt: formatCurrency }, { key: 'total', label: 'Total', num: true, fmt: formatCurrency }]} />
                </>}
              </>}
              {type === 'routes' && <Table rows={d.rows} cols={[{ key: 'route', label: 'Route' }, { key: 'trips', label: 'Trips', num: true }, { key: 'bookings', label: 'Bookings', num: true }, { key: 'seats_sold', label: 'Seats sold', num: true }, { key: 'cancellations', label: 'Cancellations', num: true }, { key: 'revenue', label: 'Revenue (paid)', num: true, fmt: formatCurrency }]} />}
              {type === 'vehicles' && <Table rows={d.rows} cols={[{ key: 'registration_number', label: 'Vehicle', fmt: (v, r) => <><strong>{v}</strong><small>{r.name}</small></> }, { key: 'trips', label: 'Trips', num: true }, { key: 'seats_sold', label: 'Seats sold', num: true }, { key: 'occupancy_pct', label: 'Occupancy', num: true, fmt: v => `${v}%` }, { key: 'revenue', label: 'Revenue (paid)', num: true, fmt: formatCurrency }]} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
