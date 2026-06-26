import { useState } from 'react';
import { searchResults } from '../api/system';

const departments = ['computer', 'civil', 'electrical', 'mechanical', 'textile'];

const ResultSearch = () => {
  const [form, setForm] = useState({ department: 'computer', rollNumber: '' });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const data = await searchResults(form);
      setResults(data.results || []);
      setSearched(true);
    } catch (err) {
      setResults([]);
      setError(err.response?.data?.message || 'Result search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <section className="surface p-5">
        <h1 className="text-2xl font-black text-white">Result Search</h1>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submitSearch}>
          <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <input className="input" placeholder="Roll Number" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required />
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </form>
        {error && <p className="mt-3 text-sm font-semibold text-rose-300">{error}</p>}
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-black text-white">Results</h2>
        {!searched && !results.length && <p className="mt-3 text-sm text-slate-400">Select department and enter roll number to search.</p>}
        {searched && !results.length && <p className="mt-3 text-sm text-slate-400">No result found for this department and roll number.</p>}
        {!!results.length && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-2">Student</th>
                  <th>Roll Number</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>GPA / Failed Subjects</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result._id} className="border-t border-white/10">
                    <td className="p-2 font-semibold text-white">{result.studentId?.name || 'Unregistered student'}</td>
                    <td>{result.rollNumber || result.studentId?.rollNumber || '-'}</td>
                    <td className="capitalize">{result.department}</td>
                    <td>{result.semester}</td>
                    <td><span className="badge capitalize">{result.resultStatus || 'pass'}</span></td>
                    <td>{(result.resultStatus || 'pass') === 'pass' ? (result.gpa || 'Optional') : (result.failedSubjects?.join(', ') || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default ResultSearch;
