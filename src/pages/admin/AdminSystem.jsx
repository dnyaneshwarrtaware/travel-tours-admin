import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { usersApi, rolesApi, notificationsApi, auditLogsApi, adminService } from '../../services/adminService';
import { PageHeader, Toolbar, FormModal, ActiveBadge, Pagination } from '../../components/admin/AdminUI';
import { Loading, EmptyState, ErrorState, Field } from '../../components/common/ui';
import { formatDateTime } from '../../utils/format';

// ---------------------------------------------------------------- Users
export function AdminUsers() {
  const { user } = useAuth();
  const list = useData(() => usersApi.list(), []);
  const roles = useData(() => rolesApi.list(), []);
  const [editing, setEditing] = useState(null);
  const pwd = (v) => (v && (v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v)) ? 'At least 8 characters with letters and numbers' : null);
  const fields = [
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'role_id', label: 'Role', type: 'select', required: true, options: (roles.data?.roles || []).map(r => ({ value: r.id, label: r.display_name })) },
    { name: 'password', label: editing?.id ? 'New password (optional)' : 'Password', type: 'password', required: !editing?.id, validate: pwd },
    { name: 'is_active', label: 'Active', type: 'checkbox', checkLabel: 'Active (can sign in)' },
  ];
  const save = async (v) => {
    const body = { ...v, role_id: Number(v.role_id), is_active: !!v.is_active };
    if (!body.password) delete body.password;
    const res = editing.id ? await usersApi.update(editing.id, body) : await usersApi.create(body);
    toast.success(res.message); setEditing(null); list.reload();
  };
  return (
    <div className="ad-page">
      <PageHeader title="Users" subtitle="Admin panel staff accounts"
        actions={<button className="btn btn-navy btn-sm" onClick={() => setEditing({ is_active: true })}><Plus size={16} /> Add User</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={3} /></div> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : (
          <div className="ad-table-wrap"><table className="ad-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th>Status</th><th /></tr></thead>
            <tbody>{list.data.map(u => (
              <tr key={u.id} className={u.is_active ? '' : 'is-muted'}>
                <td><strong>{u.name}</strong>{u.id === user?.id && <small>You</small>}</td><td>{u.email}</td><td>{u.role_name}</td>
                <td>{u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</td><td><ActiveBadge active={u.is_active} /></td>
                <td><div className="ad-actions"><button className="btn btn-outline btn-xs" onClick={() => setEditing({ ...u, is_active: !!u.is_active, password: '' })}>Edit</button></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <FormModal open={!!editing} title={editing?.id ? `Edit ${editing.name}` : 'Add User'} fields={fields} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />
    </div>
  );
}

// ---------------------------------------------------------------- Roles & permissions
export function AdminRoles() {
  const { can, user } = useAuth();
  const data = useData(() => rolesApi.list(), []);
  const [grants, setGrants] = useState({});
  const [busy, setBusy] = useState(null);
  useEffect(() => { if (data.data) setGrants(Object.fromEntries(data.data.roles.map(r => [r.id, new Set(r.permissions)]))); }, [data.data]);
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  const { roles, permissions } = data.data;
  const editable = can('roles.manage');
  const toggle = (rid, p) => setGrants(g => { const s = new Set(g[rid]); s.has(p) ? s.delete(p) : s.add(p); return { ...g, [rid]: s }; });
  const save = async (r) => {
    setBusy(r.id);
    try { const res = await rolesApi.savePermissions(r.id, [...grants[r.id]]); toast.success(res.message); data.reload(); }
    catch (err) { toast.error(err.message); } finally { setBusy(null); }
  };
  return (
    <div className="ad-page">
      <PageHeader title="Roles & Permissions" subtitle={editable ? 'Tick what each role may do. Super Admin always has full access.' : 'Read-only: only a Super Admin can change permissions.'} />
      <div className="ad-card"><div className="ad-table-wrap">
        <table className="ad-table ad-perm-table">
          <thead><tr><th>Permission</th>{roles.map(r => <th key={r.id}>{r.display_name}<small style={{ textTransform: 'none' }}>{r.user_count} user(s)</small></th>)}</tr></thead>
          <tbody>
            {permissions.map(p => (
              <tr key={p.name}>
                <td>{p.description}<small className="ad-mono">{p.name}</small></td>
                {roles.map(r => (
                  <td key={r.id}><input type="checkbox" aria-label={`${r.display_name}: ${p.name}`} checked={!!grants[r.id]?.has(p.name)}
                    disabled={!editable || r.locked || r.name === user?.role} onChange={() => toggle(r.id, p.name)} /></td>
                ))}
              </tr>
            ))}
            {editable && <tr><td /> {roles.map(r => <td key={r.id}>{!r.locked && r.name !== user?.role && <button className="btn btn-navy btn-xs" disabled={busy === r.id} onClick={() => save(r)}><Save size={13} /> Save</button>}</td>)}</tr>}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}

// ---------------------------------------------------------------- Notifications
export function AdminNotifications() {
  const list = useData(() => notificationsApi.list(), []);
  const readAll = async () => { await notificationsApi.readAll(); list.reload(); };
  const open = (n) => { if (!n.is_read) notificationsApi.read(n.id).catch(() => {}); };
  return (
    <div className="ad-page">
      <PageHeader title="Notifications" subtitle={list.meta ? `${list.meta.unread} unread` : ''} actions={<button className="btn btn-outline btn-sm" onClick={readAll}>Mark all read</button>} />
      <div className="ad-card">
        {list.loading ? <div className="ad-card-pad"><Loading rows={4} /></div> : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No notifications" /> : (
            <div className="ad-table-wrap"><table className="ad-table"><tbody>
              {list.data.map(n => (
                <tr key={n.id} className={n.is_read ? 'is-muted' : ''}>
                  <td style={{ width: 12 }}>{!n.is_read && <span className="ui-badge ui-tone-red">New</span>}</td>
                  <td><strong>{n.title}</strong>{n.message && <small>{n.message}</small>}</td>
                  <td>{formatDateTime(n.created_at)}</td>
                  <td>{n.link && <div className="ad-actions"><Link className="btn btn-outline btn-xs" to={n.link} onClick={() => open(n)}>Open</Link></div>}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Audit logs
export function AdminAuditLogs() {
  const [f, setF] = useState({ module: '', action: '', from: '', to: '', page: 1 });
  const list = useData(() => auditLogsApi.list(f), [JSON.stringify(f)]);
  const [open, setOpen] = useState(null);
  const set = (k, v) => setF(s => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));
  const json = (v) => { if (!v) return '—'; try { return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v, null, 2); } catch { return String(v); } };
  return (
    <div className="ad-page">
      <PageHeader title="Audit Logs" subtitle="Who changed what, and when" />
      <div className="ad-card">
        <Toolbar>
          <select className="form-control" value={f.module} onChange={e => set('module', e.target.value)}><option value="">All modules</option>{(list.meta?.modules || []).map(m => <option key={m} value={m}>{m}</option>)}</select>
          <input className="form-control" placeholder="Action contains…" value={f.action} onChange={e => set('action', e.target.value)} />
          <input type="date" className="form-control" value={f.from} onChange={e => set('from', e.target.value)} aria-label="From" />
          <input type="date" className="form-control" value={f.to} onChange={e => set('to', e.target.value)} aria-label="To" />
        </Toolbar>
        {list.loading ? <div className="ad-card-pad"><Loading rows={6} /></div> : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
          : !list.data.length ? <EmptyState title="No audit entries" /> : (
            <>
              <div className="ad-table-wrap"><table className="ad-table">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Record</th><th>IP</th></tr></thead>
                <tbody>{list.data.map(a => (
                  <Fragment key={a.id}>
                    <tr className="is-clickable" onClick={() => setOpen(open === a.id ? null : a.id)}>
                      <td>{formatDateTime(a.created_at)}</td><td>{a.user_name || '—'}<small>{a.user_type}</small></td>
                      <td className="ad-mono">{a.action}</td><td>{a.module}</td><td>{a.record_id ?? '—'}</td><td className="ad-mono">{a.ip_address || '—'}</td>
                    </tr>
                    {open === a.id && (
                      <tr key={`${a.id}-d`}><td colSpan={6}><div className="ui-grid">
                        <Field label="Old value"><pre className="ad-json">{json(a.old_values)}</pre></Field>
                        <Field label="New value"><pre className="ad-json">{json(a.new_values)}</pre></Field>
                      </div></td></tr>
                    )}
                  </Fragment>
                ))}</tbody>
              </table></div>
              <Pagination meta={list.meta} onPage={p => set('page', p)} />
            </>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Settings
export function AdminSettings() {
  const list = useData(() => adminService.getSettings(), []);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (list.data) setValues(Object.fromEntries(list.data.map(s => [s.key, s.value ?? '']))); }, [list.data]);
  if (list.loading) return <Loading />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  const groups = list.data.reduce((g, s) => ((g[s.group_name] ||= []).push(s), g), {});
  const save = async () => {
    const changed = list.data.filter(s => (s.value ?? '') !== values[s.key]).map(s => ({ key: s.key, value: values[s.key] }));
    if (!changed.length) { toast('No changes'); return; }
    setBusy(true);
    try { const res = await adminService.saveSettings(changed); toast.success(res.message); list.reload(); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="ad-page">
      <PageHeader title="Settings" subtitle="Company details shown on the website. Payment methods are under QR Settings."
        actions={<button className="btn btn-navy btn-sm" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save settings'}</button>} />
      {Object.entries(groups).map(([g, items]) => (
        <div key={g} className="ad-card">
          <div className="ad-card-head"><h3 style={{ textTransform: 'capitalize' }}>{g}</h3></div>
          <div className="ad-card-pad ui-grid">
            {items.map(s => (
              <Field key={s.key} label={s.label || s.key} hint={s.type === 'json' ? 'JSON' : undefined} className={s.type === 'json' ? 'ui-span-2' : ''}>
                {s.type === 'json'
                  ? <textarea className="form-control ad-mono" rows={4} value={values[s.key] ?? ''} onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))} />
                  : <input className="form-control" value={values[s.key] ?? ''} onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))} />}
              </Field>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
