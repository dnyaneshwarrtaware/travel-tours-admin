import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login({ email, password }, true);
    if (res.success) { toast.success('Welcome, Admin!'); navigate('/admin/dashboard'); }
    else toast.error(res.message || 'Login failed');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-dark)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: '2.5rem', width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
          <div style={{ width: 40, height: 40, background: 'var(--navy)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--saffron)', fontWeight: 800, fontSize: '1.1rem' }}>G</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1rem' }}>Ganraj Traveling Admin</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management Panel</div>
          </div>
        </div>
        <h2 style={{ color: 'var(--navy)', marginBottom: '1.5rem', fontSize: '1.375rem' }}>Sign In to Admin</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label className="form-label">Email</label><input type="email" className="form-control" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <div><label className="form-label">Password</label><input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Enter admin password" /></div>
          <button type="submit" className="btn btn-navy" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
