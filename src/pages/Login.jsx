import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../api/auth';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi(formData);
      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="surface w-full max-w-md p-6">
        <p className="badge mb-4 inline-flex">University Forum</p>
        <h1 className="text-3xl font-black text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in with your email or phone number.</p>
        {error && <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-200">
            Email or Phone
            <input
              className="input mt-2"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Password
            <input
              className="input mt-2"
              type="password"
              name="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </label>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          Need a student account? <Link className="font-semibold text-cyan-300" to="/register">Register</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
