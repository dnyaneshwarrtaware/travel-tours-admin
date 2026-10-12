import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal, Field } from '../common/ui';
import { useAuth } from '../../hooks/useAuth';

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="ad-head">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="ad-head-actions">{actions}</div>}
  </div>
);

export const Toolbar = ({ children }) => <div className="ad-toolbar">{children}</div>;

export const Pagination = ({ meta, onPage }) => {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="ad-pager">
      <span>Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
      <div>
        <button type="button" className="btn btn-outline btn-xs" disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={14} /> Prev</button>
        <button type="button" className="btn btn-outline btn-xs" disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
};

export const NoAccess = () => (
  <div className="ui-state"><h4>You don’t have access to this page</h4><p>Ask a Super Admin to grant the permission in Roles &amp; Permissions.</p></div>
);

export const RequirePerm = ({ perm, children }) => {
  const { can } = useAuth();
  return can(...[].concat(perm)) ? children : <NoAccess />;
};

export const ActiveBadge = ({ active }) => (
  <span className={`ui-badge ${active ? 'ui-tone-green' : 'ui-tone-grey'}`}>{active ? 'Active' : 'Inactive'}</span>
);

/**
 * Config-driven create/edit form.
 * fields: [{ name, label, type: text|number|email|tel|select|textarea|checkbox|time|date|days|password, options, required,
 *           hint, span, min, max, step, placeholder, validate(value, values) -> message, hidden(values) }]
 */
export function FormModal({ open, title, fields, initial, onClose, onSubmit, submitLabel = 'Save', size = 'md' }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setValues(initial || {}); setErrors({}); } }, [open, initial]);

  const set = (k, v) => setValues(s => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach(f => {
      if (f.hidden?.(values)) return;
      const v = values[f.name];
      if (f.required && (v === undefined || v === null || v === '' || (f.type === 'days' && !v.length))) errs[f.name] = `${f.label} is required`;
      else if (f.type === 'number' && v !== '' && v !== undefined && v !== null) {
        if (!Number.isFinite(Number(v))) errs[f.name] = 'Enter a number';
        else if (f.min !== undefined && Number(v) < f.min) errs[f.name] = `Must be at least ${f.min}`;
        else if (f.max !== undefined && Number(v) > f.max) errs[f.name] = `Must be at most ${f.max}`;
      }
      if (!errs[f.name] && f.validate) { const m = f.validate(v, values); if (m) errs[f.name] = m; }
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const fieldErrs = {};
      (err.errors || []).forEach(x => { fieldErrs[x.field] = x.message; });
      setErrors(fieldErrs);
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} title={title} onClose={busy ? undefined : onClose} size={size} footer={(
      <>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="submit" form="ad-form" className="btn btn-navy" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
      </>
    )}>
      <form id="ad-form" className="ui-grid" onSubmit={submit} noValidate>
        {fields.filter(f => !f.hidden?.(values)).map(f => {
          const v = values[f.name] ?? (f.type === 'checkbox' ? false : f.type === 'days' ? [] : '');
          const common = { id: `f-${f.name}`, className: 'form-control', value: v, onChange: e => set(f.name, e.target.value), placeholder: f.placeholder };
          let input;
          if (f.type === 'select') {
            input = (
              <select {...common}>
                <option value="">{f.placeholder || `Select ${f.label.toLowerCase()}`}</option>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          } else if (f.type === 'textarea') input = <textarea {...common} rows={3} />;
          else if (f.type === 'checkbox') {
            input = <span className="ui-check"><input type="checkbox" checked={!!v} onChange={e => set(f.name, e.target.checked)} /> {f.checkLabel || f.label}</span>;
          } else if (f.type === 'days') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            input = (
              <div className="ad-days">
                {days.map((d, i) => (
                  <button key={d} type="button" className={v.includes(i) ? 'is-on' : ''} aria-pressed={v.includes(i)}
                    onClick={() => set(f.name, v.includes(i) ? v.filter(x => x !== i) : [...v, i].sort())}>{d}</button>
                ))}
              </div>
            );
          } else input = <input {...common} type={f.type || 'text'} min={f.min} max={f.max} step={f.step} />;
          return (
            <Field key={f.name} label={f.type === 'checkbox' ? '' : f.label} required={f.required} hint={f.hint} error={errors[f.name]} className={f.span ? 'ui-span-2' : ''}>
              {input}
            </Field>
          );
        })}
      </form>
    </Modal>
  );
}
