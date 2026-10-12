import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { paymentsApi } from '../../services/adminService';
import { PageHeader, Toolbar, Pagination } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, StatusBadge, Modal, Field } from '../../components/common/ui';
import { formatCurrency, formatDate, formatDateTime, PAYMENT_STATUS, PAYMENT_METHOD } from '../../utils/format';

// Which action applies to a payment (mirrors the server rules; the server enforces them)
const primaryAction = (p) => {
  if (p.booking_status === 'cancelled') return p.payment_status === 'refund_pending' ? 'refund' : null;
  if (p.payment_method === 'UPI_QR' && ['verification_pending', 'failed'].includes(p.payment_status)) return 'verify';
  if (p.payment_method === 'CASH' && ['pending', 'failed'].includes(p.payment_status)) return 'mark_paid';
  if (p.payment_status === 'refund_pending') return 'refund';
  return null;
};
const LABEL = { verify: 'Verify', mark_paid: 'Mark Paid', refund: 'Mark Refunded', reject: 'Reject' };

export default function AdminPayments() {
  const { can } = useAuth();
  const [params] = useSearchParams();
  const [f, setF] = useState({ q: params.get('q') || '', status: params.get('status') || '', method: '', page: 1 });
  const list = useData(() => paymentsApi.list(f), [JSON.stringify(f)]);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));
  const summary = Object.fromEntries((list.meta?.summary || []).map(s => [s.payment_status, s]));

  const openPayment = (p) => { setActive(p); setForm({ transaction_reference: p.transaction_reference || '', remarks: p.remarks || '', amount: p.amount }); };

  const run = async (action) => {
    if (action === 'reject' && !form.remarks?.trim()) { toast.error('Add a remark explaining the rejection'); return; }
    setBusy(true);
    try {
      const body = { transaction_reference: form.transaction_reference, remarks: form.remarks };
      if (action === 'verify' || action === 'mark_paid') body.amount = form.amount;
      const fn = { verify: paymentsApi.verify, mark_paid: paymentsApi.markPaid, reject: paymentsApi.reject, refund: paymentsApi.refund, update: paymentsApi.update }[action];
      const res = await fn(active.id, body);
      toast.success(res.message); setActive(null); list.reload();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const canAct = can('payments.verify');
  const action = active && primaryAction(active);

  return (
    <div className="ad-page">
      <PageHeader title="Payments" subtitle="Cash and UPI QR payments. UPI payments must be verified against your bank/UPI app before confirming." />
      <div className="ad-stats">
        {['verification_pending', 'pending', 'paid', 'refund_pending'].map(s => (
          <button key={s} type="button" className="ad-stat" style={{ textAlign: 'left', cursor: 'pointer', borderColor: f.status === s ? 'var(--navy)' : undefined }} onClick={() => set('status', f.status === s ? '' : s)}>
            <span>{PAYMENT_STATUS[s].label}</span>
            <strong>{summary[s]?.count || 0}</strong>
            <small className="ui-muted">{formatCurrency(summary[s]?.amount || 0)}</small>
          </button>
        ))}
      </div>
      <div className="ad-card">
        <Toolbar>
          <div className="gt-search-input ad-search" style={{ padding: '0 0.6rem' }}><Search size={15} /><input placeholder="Booking ID, name, phone or UTR" value={f.q} onChange={e => set('q', e.target.value)} style={{ padding: '0.5rem 0', fontWeight: 500, fontSize: '0.875rem' }} /></div>
          <select className="form-control" value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="">All statuses</option><option value="action_needed">Needs action</option>
            {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="form-control" value={f.method} onChange={e => set('method', e.target.value)}>
            <option value="">All methods</option>{Object.entries(PAYMENT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Toolbar>
        {list.loading ? <div className="ad-card-pad"><Loading rows={6} /></div>
          : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No payments found" />
          : (
            <>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Booking</th><th>Customer</th><th>Method</th><th className="num">Amount</th><th>Customer ref</th><th>Status</th><th className="num">Action</th></tr></thead>
                  <tbody>
                    {list.data.map(p => {
                      const a = primaryAction(p);
                      return (
                        <tr key={p.id}>
                          <td className="ad-mono"><strong>{p.booking_number}</strong><small>{p.from_city} → {p.to_city} · {formatDate(p.travel_date, { year: undefined })}</small></td>
                          <td>{p.contact_name}<small>{p.contact_phone}</small></td>
                          <td>{PAYMENT_METHOD[p.payment_method]}</td>
                          <td className="num">{formatCurrency(p.amount)}</td>
                          <td className="ad-mono">{p.upi_reference || p.transaction_reference || '—'}</td>
                          <td><StatusBadge kind="payment" value={p.payment_status} />{p.booking_status === 'cancelled' && <small>Booking cancelled</small>}</td>
                          <td><div className="ad-actions">
                            {canAct && a ? <button className={`btn btn-xs ${a === 'refund' ? 'btn-outline' : 'btn-success'}`} onClick={() => openPayment(p)}>{LABEL[a]}</button>
                              : <button className="btn btn-outline btn-xs" onClick={() => openPayment(p)}>View</button>}
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination meta={list.meta} onPage={p => set('page', p)} />
            </>
          )}
      </div>

      <Modal open={!!active} title={active ? `${PAYMENT_METHOD[active.payment_method]} payment · ${active.booking_number}` : ''} onClose={() => setActive(null)} footer={active && canAct && (
        <>
          {active.payment_method === 'UPI_QR' && active.payment_status === 'verification_pending' && active.booking_status !== 'cancelled' && (
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => run('reject')}>Reject Payment</button>
          )}
          <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => run('update')}>Save reference & remarks</button>
          {action && <button className={`btn btn-sm ${action === 'refund' ? 'btn-navy' : 'btn-success'}`} disabled={busy} onClick={() => run(action)}>
            {busy ? 'Please wait…' : action === 'verify' ? 'Verify Payment' : action === 'mark_paid' ? `Mark ${formatCurrency(active.amount)} Paid` : 'Mark Refunded'}
          </button>}
        </>
      )}>
        {active && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <dl className="ad-kv">
              <dt>Customer</dt><dd>{active.contact_name} · {active.contact_phone}</dd>
              <dt>Journey</dt><dd>{active.from_city} → {active.to_city}, {formatDate(active.travel_date)}</dd>
              <dt>Booking amount</dt><dd><strong>{formatCurrency(active.booking_amount)}</strong> ({active.seat_count} seat{active.seat_count > 1 ? 's' : ''})</dd>
              <dt>Status</dt><dd><StatusBadge kind="payment" value={active.payment_status} /> <StatusBadge kind="booking" value={active.booking_status} /></dd>
              {active.upi_reference && <><dt>Customer UTR</dt><dd className="ad-mono">{active.upi_reference}</dd></>}
              {active.payment_date && <><dt>Paid / claimed at</dt><dd>{formatDateTime(active.payment_date)}</dd></>}
              {active.verified_by_name && <><dt>Last action by</dt><dd>{active.verified_by_name} · {formatDateTime(active.verified_at)}</dd></>}
            </dl>
            {action === 'verify' && <p className="gt-note gt-note-warn">Check your bank / UPI app for a credit of {formatCurrency(active.amount)}{active.upi_reference ? ` with UTR ${active.upi_reference}` : ''} before verifying.</p>}
            {canAct ? (
              <div className="ui-grid">
                {(action === 'verify' || action === 'mark_paid') && (
                  <Field label="Amount received" hint="Must match the booking amount"><input className="form-control" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field>
                )}
                <Field label="Transaction reference" hint={active.payment_method === 'CASH' ? 'e.g. receipt number' : 'Bank UTR'}><input className="form-control" value={form.transaction_reference} maxLength={100} onChange={e => setForm({ ...form, transaction_reference: e.target.value })} /></Field>
                <Field label="Remarks" className="ui-span-2"><textarea className="form-control" rows={2} value={form.remarks} maxLength={1000} onChange={e => setForm({ ...form, remarks: e.target.value })} /></Field>
              </div>
            ) : <p className="ui-muted">You can view payments but not change them.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
