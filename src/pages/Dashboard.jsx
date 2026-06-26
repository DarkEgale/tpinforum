import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  changePassword,
  createNotice,
  createResult,
  createTeacher,
  deleteNotice,
  deleteResult,
  deleteUser,
  getAnalytics,
  getNotices,
  getResults,
  getUsers,
  updateProfile,
  updateUserStatus,
} from '../api/system';
import { getPosts, deletePost } from '../api/posts';
import { uploadToCloud } from '../api/uploads';
import { SOCKET_URL } from '../api/config';

const departments = ['computer', 'civil', 'electrical', 'mechanical', 'textile'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

const emptyTeacher = { name: '', email: '', age: '', phone: '', department: 'computer', semester: 'all', password: 'teacher123', contactInfo: '' };
const emptyNotice = { title: '', description: '', department: 'all', semester: 'all', attachment: '', targetStudentId: '' };
const emptyResult = { rollNumber: '', subject: '', marks: '', grade: '', gpa: '', department: 'computer', semester: '1', resultStatus: 'pass', failedSubjects: '' };

const StatCard = ({ label, value }) => (
  <div className="surface p-4">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black text-white">{value ?? 0}</p>
  </div>
);

const Section = ({ title, children, action }) => (
  <section className="surface p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-black text-white">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const socket = io(SOCKET_URL, { withCredentials: true });

const Dashboard = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [notices, setNotices] = useState([]);
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [teacherForm, setTeacherForm] = useState(emptyTeacher);
  const [noticeForm, setNoticeForm] = useState(emptyNotice);
  const [resultForm, setResultForm] = useState(emptyResult);
  const [profileForm, setProfileForm] = useState(user || {});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [search, setSearch] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('all');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [newResultNotification, setNewResultNotification] = useState(null);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const dashboardTabs = [
    { id: 'profile', label: 'Profile' },
    isAdmin && { id: 'analytics', label: 'Analytics' },
    (isAdmin || isTeacher) && { id: 'students', label: 'Students' },
    isAdmin && { id: 'teachers', label: 'Teachers' },
    { id: 'notices', label: 'Notices' },
    { id: 'results', label: 'Results' },
    { id: 'posts', label: isStudent ? 'My Posts' : 'Posts' },
  ].filter(Boolean);

  const students = useMemo(() => users.filter((item) => item.role === 'student'), [users]);
  const teachers = useMemo(() => users.filter((item) => item.role === 'teacher'), [users]);
  const savedPosts = useMemo(() => posts.filter((post) => user?.savedPosts?.some((id) => String(id) === String(post._id))), [posts, user]);
  const myPosts = useMemo(() => posts.filter((post) => String(post.userId?._id || post.userId) === String(user?._id)), [posts, user]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const dismissResultNotification = () => {
    setNewResultNotification(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const tasks = [getNotices(), getResults(), getPosts()];
      if (isAdmin || isTeacher) tasks.push(getUsers());
      if (isAdmin) tasks.push(getAnalytics());
      const responses = await Promise.all(tasks);
      setNotices(responses[0].notices || []);
      setResults(responses[1].results || []);
      setPosts(responses[2].posts || []);
      if (isAdmin || isTeacher) setUsers(responses[3].users || []);
      if (isAdmin) setAnalytics(responses[4].analytics || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    socket.emit('userOnline', user?._id);
    
    socket.on('newResult', (data) => {
      setNewResultNotification(data);
      loadData();
    });

    return () => {
      socket.off('newResult');
    };
  }, [user?._id]);

  const submitProfile = async (e) => {
    e.preventDefault();
    const data = await updateProfile(profileForm);
    setUser(data.user);
    showToast('Profile updated');
  };

  const uploadProfileImage = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const data = await uploadToCloud(file, field);
      setProfileForm((current) => ({ ...current, [field]: data.url }));
      if (data.user) {
        setUser(data.user);
      }
      showToast('Image uploaded');
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const uploadNoticeAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('noticeAttachment');
    try {
      const data = await uploadToCloud(file);
      setNoticeForm((current) => ({ ...current, attachment: data.url }));
      showToast('Attachment uploaded');
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    await changePassword(passwordForm);
    setPasswordForm({ currentPassword: '', newPassword: '' });
    showToast('Password changed');
  };

  const submitTeacher = async (e) => {
    e.preventDefault();
    await createTeacher(teacherForm);
    setTeacherForm(emptyTeacher);
    showToast('Teacher account created');
    loadData();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const submitNotice = async (e) => {
    e.preventDefault();
    await createNotice(noticeForm);
    setNoticeForm(emptyNotice);
    showToast('Notice published');
    loadData();
  };

  const submitResult = async (e) => {
    e.preventDefault();
    await createResult({
      ...resultForm,
      failedSubjects: resultForm.resultStatus === 'failed'
        ? resultForm.failedSubjects.split(',').map((subject) => subject.trim()).filter(Boolean)
        : [],
      gpa: resultForm.resultStatus === 'pass' ? resultForm.gpa : '',
    });
    setResultForm(emptyResult);
    showToast('Result published');
    loadData();
  };

  const handleResultDepartmentChange = (department) => {
    setResultForm({ ...resultForm, department, semester: resultForm.semester || '1' });
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = [student.name, student.email, student.department, student.rollNumber].join(' ').toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = searchDepartment === 'all' || student.department === searchDepartment;
    return matchesSearch && matchesDepartment;
  });

  const noticeStudentOptions = students.filter((student) => {
    const matchesDepartment = noticeForm.department === 'all' || student.department === noticeForm.department;
    const matchesSemester = noticeForm.semester === 'all' || student.semester === noticeForm.semester;
    return matchesDepartment && matchesSemester;
  });

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-slate-800" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {toast && <div className="fixed right-4 top-20 z-50 rounded-md bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-xl">{toast}</div>}
      
      {newResultNotification && isStudent && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-cyan-400/40 bg-cyan-500/10 p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-cyan-100">New Result Published</h3>
              <p className="mt-1 text-sm text-slate-300">
                {newResultNotification.result?.studentId?.name} - {newResultNotification.result?.resultStatus || 'pass'}
              </p>
              <p className="text-xs text-slate-400">By {newResultNotification.teacherName}</p>
            </div>
            <button className="text-cyan-300 hover:text-cyan-100" onClick={dismissResultNotification}>×</button>
          </div>
        </div>
      )}

      <section className="surface overflow-hidden">
        <div className="h-36 bg-[linear-gradient(120deg,#0891b2,#14532d,#7f1d1d)]" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="-mt-16 flex h-28 w-28 items-center justify-center rounded-lg border-4 border-slate-900 bg-slate-800 text-4xl font-black text-cyan-200">
            {user?.profilePicture ? <img className="h-full w-full rounded object-cover" src={user.profilePicture} alt={user.name} /> : user?.name?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-white">{user?.name}</h1>
            <p className="capitalize text-slate-400">{user?.role} dashboard - {user?.department} - semester {user?.semester}</p>
          </div>
          <div className="flex gap-2">
            <span className="badge capitalize">{user?.status || 'active'}</span>
            <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </section>

      <section className="surface p-3">
        <div className="flex gap-2 overflow-x-auto">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.id}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {isAdmin && activeTab === 'analytics' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(analytics).map(([key, value]) => <StatCard key={key} label={key} value={value} />)}
        </div>
      )}

      <div className="space-y-6">
        {activeTab === 'profile' && (
          <Section title="Profile and Settings">
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitProfile}>
              {['name', 'age', 'phone', 'contactInfo'].map((field) => (
                <input key={field} className="input" placeholder={field} value={profileForm[field] || ''} onChange={(e) => setProfileForm({ ...profileForm, [field]: e.target.value })} />
              ))}
              <label className="btn btn-muted cursor-pointer">
                {uploading === 'profilePicture' ? 'Uploading...' : 'Upload Profile Picture'}
                <input className="hidden" type="file" accept="image/*" onChange={(e) => uploadProfileImage(e, 'profilePicture')} />
              </label>
              <label className="btn btn-muted cursor-pointer">
                {uploading === 'coverPhoto' ? 'Uploading...' : 'Upload Cover Photo'}
                <input className="hidden" type="file" accept="image/*" onChange={(e) => uploadProfileImage(e, 'coverPhoto')} />
              </label>
              <select className="input" value={profileForm.department || ''} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <select className="input" value={profileForm.semester || '1'} onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}>
                {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
              </select>
              <textarea className="input md:col-span-2" rows="3" placeholder="Bio" value={profileForm.bio || ''} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
              <button className="btn btn-primary md:col-span-2">Save Profile</button>
            </form>
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submitPassword}>
              <input className="input" type="password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              <input className="input" type="password" placeholder="New password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
              <button className="btn btn-muted">Change Password</button>
            </form>
          </Section>
        )}

          {(isAdmin || isTeacher) && activeTab === 'students' && (
            <Section title="Students List and Search">
              <div className="mb-4 flex flex-wrap gap-3">
                <input className="input flex-1" placeholder="Search students by name, email, department, roll" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="input" value={searchDepartment || 'all'} onChange={(e) => setSearchDepartment(e.target.value)}>
                  <option value="all">All Departments</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-slate-400">
                    <tr><th className="p-2">Name</th><th>Email</th><th>Department</th><th>Semester</th><th>Roll Number</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student._id} className="border-t border-white/10">
                        <td className="p-2 font-semibold text-white">{student.name}</td>
                        <td>{student.email}</td>
                        <td>{student.department}</td>
                        <td>{student.semester}</td>
                        <td>{student.rollNumber || '-'}</td>
                        <td className="capitalize">{student.status}</td>
                        <td className="space-x-2">
                          {isAdmin && <button className="btn btn-muted py-1" onClick={() => updateUserStatus(student._id, student.status === 'active' ? 'suspended' : 'active').then(loadData)}>Toggle</button>}
                          {isAdmin && <button className="btn btn-danger py-1" onClick={() => deleteUser(student._id).then(loadData)}>Delete</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {isAdmin && activeTab === 'teachers' && (
            <Section title="Register Teacher and Manage Teachers">
              <form className="mb-5 grid gap-3 md:grid-cols-2" onSubmit={submitTeacher}>
                {Object.keys(emptyTeacher).map((field) => (
                  field === 'department'
                    ? <select key={field} className="input" value={teacherForm[field]} onChange={(e) => setTeacherForm({ ...teacherForm, [field]: e.target.value })}>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>
                    : <input key={field} className="input" placeholder={field} value={teacherForm[field]} onChange={(e) => setTeacherForm({ ...teacherForm, [field]: e.target.value })} required={field !== 'contactInfo'} />
                ))}
                <button className="btn btn-primary md:col-span-2">Create Teacher</button>
              </form>
              <div className="grid gap-3 md:grid-cols-2">
                {teachers.map((teacher) => (
                  <div key={teacher._id} className="rounded-lg border border-white/10 bg-slate-950 p-3">
                    <p className="font-bold text-white">{teacher.name}</p>
                    <p className="text-sm text-slate-400">{teacher.email} - {teacher.department}</p>
                    <div className="mt-3 flex gap-2">
                      <button className="btn btn-muted py-1" onClick={() => updateUserStatus(teacher._id, teacher.status === 'active' ? 'blocked' : 'active').then(loadData)}>Block/Unblock</button>
                      <button className="btn btn-danger py-1" onClick={() => deleteUser(teacher._id).then(loadData)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(isAdmin || isTeacher) && activeTab === 'notices' && (
            <Section title="Publish Notice">
              <form className="grid gap-3 md:grid-cols-2" onSubmit={submitNotice}>
                <input className="input" placeholder="Title" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} required />
                <label className="btn btn-muted cursor-pointer">
                  {uploading === 'noticeAttachment' ? 'Uploading...' : noticeForm.attachment ? 'Attachment Uploaded' : 'Upload Attachment'}
                  <input className="hidden" type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={uploadNoticeAttachment} />
                </label>
                <select className="input" value={noticeForm.department} onChange={(e) => setNoticeForm({ ...noticeForm, department: e.target.value })}>
                  <option value="all">All departments</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <select className="input" value={noticeForm.semester} onChange={(e) => setNoticeForm({ ...noticeForm, semester: e.target.value })}>
                  <option value="all">All semesters</option>
                  {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                </select>
                <select className="input md:col-span-2" value={noticeForm.targetStudentId} onChange={(e) => setNoticeForm({ ...noticeForm, targetStudentId: e.target.value })}>
                  <option value="">Send to selected department/semester</option>
                  {noticeStudentOptions.map((student) => (
                    <option key={student._id} value={student._id}>{student.name} - Roll {student.rollNumber || 'N/A'} - {student.department}</option>
                  ))}
                </select>
                <textarea className="input md:col-span-2" rows="3" placeholder="Description" value={noticeForm.description} onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })} required />
                <button className="btn btn-primary md:col-span-2">Publish Notice</button>
              </form>
            </Section>
          )}

          {activeTab === 'notices' && (
          <Section title="Notices">
            <div className="grid gap-3">
              {notices.map((notice) => (
                <article key={notice._id} className="rounded-lg border border-white/10 bg-slate-950 p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-bold text-white">{notice.title || 'Notice'}</h3>
                    <span className="badge">{notice.targetStudentId ? `To ${notice.targetStudentId.name}` : `${notice.department} / ${notice.semester}`}</span>
                  </div>
                  {notice.userId && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-500 text-sm font-black text-slate-950">
                        {notice.userId.profilePicture ? <img className="h-full w-full rounded object-cover" src={notice.userId.profilePicture} alt={notice.userId.name} /> : notice.userId.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{notice.userId.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{notice.userId.department} Department</p>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-slate-300">{notice.notice}</p>
                  {notice.attachment && <a className="mt-2 inline-block text-sm font-semibold text-cyan-300" href={notice.attachment} target="_blank" rel="noreferrer">Attachment</a>}
                  {(isAdmin || isTeacher) && <button className="btn btn-danger mt-3 py-1" onClick={() => deleteNotice(notice._id).then(loadData)}>Delete</button>}
                </article>
              ))}
            </div>
          </Section>
          )}

          {(isAdmin || isTeacher) && activeTab === 'results' && (
            <Section title="Publish Results">
              <form className="grid gap-3 md:grid-cols-2" onSubmit={submitResult}>
                <select className="input" value={resultForm.department} onChange={(e) => handleResultDepartmentChange(e.target.value)}>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <input className="input" placeholder="Roll Number" value={resultForm.rollNumber} onChange={(e) => setResultForm({ ...resultForm, rollNumber: e.target.value })} required />
                <select className="input" value={resultForm.semester} onChange={(e) => setResultForm({ ...resultForm, semester: e.target.value })}>
                  {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                </select>
                <select className="input" value={resultForm.resultStatus} onChange={(e) => setResultForm({ ...resultForm, resultStatus: e.target.value, gpa: e.target.value === 'failed' ? '' : resultForm.gpa, failedSubjects: e.target.value === 'pass' ? '' : resultForm.failedSubjects })}>
                  <option value="pass">Pass</option>
                  <option value="failed">Failed</option>
                </select>
                {resultForm.resultStatus === 'pass' ? (
                  <input className="input" placeholder="GPA (optional)" type="number" step="0.01" min="0" max="4" value={resultForm.gpa} onChange={(e) => setResultForm({ ...resultForm, gpa: e.target.value })} />
                ) : (
                  <textarea className="input md:col-span-2" rows="3" placeholder="Failed subjects (comma separated)" value={resultForm.failedSubjects} onChange={(e) => setResultForm({ ...resultForm, failedSubjects: e.target.value })} required />
                )}
                <button className="btn btn-primary md:col-span-2">Publish Result</button>
              </form>
            </Section>
          )}

          {activeTab === 'results' && (
          <Section title={isStudent ? 'My Results' : 'Results Management'}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-2">Student</th>
                    <th>Roll Number</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Status</th>
                    <th>GPA / Failed Subjects</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result._id} className="border-t border-white/10">
                      <td className="p-2 font-semibold text-white">{result.studentId?.name || (isStudent ? user?.name : 'Unregistered student')}</td>
                      <td>{result.rollNumber || result.studentId?.rollNumber || '-'}</td>
                      <td>{result.department}</td>
                      <td>{result.semester}</td>
                      <td><span className="badge capitalize">{result.resultStatus || 'pass'}</span></td>
                      <td>{(result.resultStatus || 'pass') === 'pass' ? (result.gpa || 'Optional') : (result.failedSubjects?.join(', ') || result.subject || '-')}</td>
                      <td>{(isAdmin || isTeacher) && <button className="btn btn-danger py-1" onClick={() => deleteResult(result._id).then(loadData)}>Delete</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          )}

          {activeTab === 'posts' && (
          <Section title={isStudent ? 'My Posts and Saved Posts' : 'Manage Posts'}>
            <div className="grid gap-3 md:grid-cols-2">
              {(isStudent ? [...myPosts, ...savedPosts] : posts).map((post) => (
                <div key={post._id} className="rounded-lg border border-white/10 bg-slate-950 p-3">
                  <p className="text-sm text-slate-300">{post.caption || 'Media post'}</p>
                  <p className="mt-2 text-xs text-slate-500">{post.likesCount || 0} likes - {post.commentsCount || 0} comments - {post.shares || 0} shares</p>
                  {(isAdmin || String(post.userId?._id || post.userId) === String(user?._id)) && <button className="btn btn-danger mt-3 py-1" onClick={() => deletePost(post._id).then(loadData)}>Delete</button>}
                </div>
              ))}
            </div>
          </Section>
          )}
      </div>
    </main>
  );
};

export default Dashboard;
