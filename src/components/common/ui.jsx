import { useEffect, useRef } from 'react';
import { X, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { BOOKING_STATUS, PAYMENT_STATUS, TRIP_STATUS } from '../../utils/format';

export function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ui-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`ui-modal ui-modal-${size}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="ui-modal-head">
          <h3>{title}</h3>
          <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Confirmation built into the page (no window.confirm)
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'primary', busy, onConfirm, onClose, children }) {
  return (
    <Modal open={open} title={title} onClose={onClose} size="sm" footer={(
      <>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Back</button>
        <button type="button" className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-navy'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </>
    )}>
      {message && <p className="ui-muted">{message}</p>}
      {children}
    </Modal>
  );
}

export const Loading = ({ label = 'Loading…', rows = 0 }) => (rows
  ? <div className="ui-skeleton-list">{[...Array(rows)].map((_, i) => <div key={i} className="skeleton ui-skeleton-row" />)}</div>
  : <div className="ui-state"><div className="spinner" /><p>{label}</p></div>);

export const EmptyState = ({ title = 'Nothing here yet', message, action, icon: Icon = Inbox }) => (
  <div className="ui-state">
    <Icon size={36} className="ui-state-icon" />
    <h4>{title}</h4>
    {message && <p>{message}</p>}
    {action}
  </div>
);

export const ErrorState = ({ title = 'Unable to load data', error, onRetry }) => (
  <div className="ui-state ui-state-error" role="alert">
    <AlertTriangle size={36} className="ui-state-icon" />
    <h4>{title}</h4>
    <p>{error?.message || 'Please try again.'}</p>
    {onRetry && <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}><RefreshCw size={14} /> Try again</button>}
  </div>
);

const MAPS = { booking: BOOKING_STATUS, payment: PAYMENT_STATUS, trip: TRIP_STATUS };
export const StatusBadge = ({ kind = 'booking', value }) => {
  const s = MAPS[kind]?.[value] || { label: value || '—', tone: 'grey' };
  return <span className={`ui-badge ui-tone-${s.tone}`}>{s.label}</span>;
};

export const Field = ({ label, error, hint, children, required, className = '' }) => (
  <label className={`ui-field ${className}`}>
    {label && <span className="ui-field-label">{label}{required && <span className="ui-req"> *</span>}</span>}
    {children}
    {hint && !error && <span className="ui-field-hint">{hint}</span>}
    {error && <span className="form-error">{error}</span>}
  </label>
);
