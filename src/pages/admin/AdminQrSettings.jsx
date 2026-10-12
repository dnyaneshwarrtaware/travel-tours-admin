import { useEffect, useRef, useState } from 'react';
import { Upload, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { paymentSettingsApi } from '../../services/adminService';
import { assetUrl } from '../../services/api';
import { PageHeader } from '../../components/admin/AdminUI';
import { Loading, ErrorState, Field } from '../../components/common/ui';
import { formatDateTime } from '../../utils/format';

const MAX_MB = 2;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

function SettingCard({ setting, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const isQr = setting.payment_method === 'UPI_QR';

  useEffect(() => setForm({ display_name: setting.display_name || '', upi_id: setting.upi_id || '', instructions: setting.instructions || '', status: setting.status }), [setting]);

  const save = async () => {
    if (!form.display_name.trim()) { toast.error('Display name is required'); return; }
    if (isQr && form.upi_id && !UPI_RE.test(form.upi_id)) { toast.error('Enter a valid UPI ID, e.g. ganrajtraveling@upi'); return; }
    setBusy(true);
    try {
      const body = { display_name: form.display_name, instructions: form.instructions, status: form.status };
      if (isQr) body.upi_id = form.upi_id;
      const res = await paymentSettingsApi.update(setting.payment_method, body);
      toast.success(res.message); onSaved();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const upload = async (file) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) { toast.error('QR must be a PNG, JPG or WEBP image'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`QR image must be under ${MAX_MB} MB`); return; }
    setUploading(true);
    try { const res = await paymentSettingsApi.uploadQr(file); toast.success(res.message); onSaved(); }
    catch (err) { toast.error(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="ad-card">
      <div className="ad-card-head">
        <h3>{isQr ? 'UPI / QR Payment' : 'Cash Payment'}</h3>
        <span className={`ui-badge ${setting.status === 'ACTIVE' ? 'ui-tone-green' : 'ui-tone-grey'}`}>{setting.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="ad-card-pad ad-split" style={{ gridTemplateColumns: isQr ? 'minmax(0,1fr) 260px' : '1fr' }}>
        <div className="ui-grid">
          {isQr && <Field label="UPI ID" required className="ui-span-2"><input className="form-control" value={form.upi_id || ''} onChange={e => setForm({ ...form, upi_id: e.target.value.trim() })} placeholder="ganrajtraveling@upi" /></Field>}
          <Field label="Display Name" required className="ui-span-2"><input className="form-control" value={form.display_name || ''} onChange={e => setForm({ ...form, display_name: e.target.value })} /></Field>
          <Field label="Instructions" className="ui-span-2" hint="Shown to customers at checkout"><textarea className="form-control" rows={3} value={form.instructions || ''} onChange={e => setForm({ ...form, instructions: e.target.value })} /></Field>
          <Field label="Status">
            <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          </Field>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn btn-navy btn-sm" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save Settings'}</button>
          </div>
          {setting.updated_by_name && <p className="ui-muted ui-span-2" style={{ fontSize: '0.8rem' }}>Last updated by {setting.updated_by_name} · {formatDateTime(setting.updated_at)}</p>}
        </div>
        {isQr && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            {setting.qr_image ? <img className="ad-qr-preview" src={assetUrl(setting.qr_image)} alt="Current UPI QR code" /> : <div className="ad-dropzone ad-qr-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No QR uploaded</div>}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => upload(e.target.files?.[0])} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload size={15} /> {uploading ? 'Uploading…' : setting.qr_image ? 'Replace QR' : 'Upload QR'}
            </button>
            <p className="ui-muted" style={{ fontSize: '0.75rem', textAlign: 'center' }}>PNG, JPG or WEBP · max {MAX_MB} MB. Use the QR from your bank / UPI merchant app.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminQrSettings() {
  const settings = useData(() => paymentSettingsApi.list(), []);
  return (
    <div className="ad-page">
      <PageHeader title="QR Settings" subtitle="Payment methods shown to customers at checkout. Only active methods are offered." />
      {settings.loading ? <Loading /> : settings.error ? <ErrorState error={settings.error} onRetry={settings.reload} />
        : settings.data.map(s => <SettingCard key={s.payment_method} setting={s} onSaved={settings.reload} />)}
      <p className="gt-note">Online payment gateways (e.g. Razorpay) are planned for Phase 2. In Phase 1, UPI payments are verified manually from the Payments page.</p>
    </div>
  );
}
