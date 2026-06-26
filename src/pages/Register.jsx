import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register as registerApi } from '../api/auth';

const departments = ['computer', 'civil', 'electrical', 'mechanical', 'textile'];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    phone: '',
    department: '',
    semester: '1',
    formNumber: '',
    rollNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const setField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await registerApi(formData);
      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <section className="surface mx-auto max-w-3xl p-6">
        <p className="badge mb-4 inline-flex">Student Registration</p>
        <h1 className="text-3xl font-black text-white">Create your forum account</h1>
        <p className="mt-2 text-sm text-slate-400">Teacher accounts are created by admins from the admin dashboard.</p>
        {error && <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {[
            ['name', 'Full Name', 'text'],
            ['email', 'Email', 'email'],
            ['age', 'Age', 'text'],
            ['phone', 'Phone', 'tel'],
            ['formNumber', 'Form Number', 'text'],
            ['rollNumber', 'Roll Number', 'number'],
          ].map(([field, label, type]) => (
            <label key={field} className="block text-sm font-semibold text-slate-200">
              {label}
              <input className="input mt-2" type={type} value={formData[field]} onChange={(e) => setField(field, e.target.value)} required={field !== 'formNumber' && field !== 'rollNumber'} />
            </label>
          ))}
          <label className="block text-sm font-semibold text-slate-200">
            Department
            <select className="input mt-2" value={formData.department} onChange={(e) => setField('department', e.target.value)} required>
              <option value="">Select department</option>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            Semester
            <select className="input mt-2" value={formData.semester} onChange={(e) => setField('semester', e.target.value)}>
              {Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200 md:col-span-2">
            Password
            <input className="input mt-2" type="password" minLength="6" value={formData.password} onChange={(e) => setField('password', e.target.value)} required />
          </label>
          <button className="btn btn-primary md:col-span-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Register as Student'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          Already registered? <Link className="font-semibold text-cyan-300" to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
