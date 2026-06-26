import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword, updateProfile } from '../api/system';
import { getPosts, deletePost } from '../api/posts';
import { uploadToCloud } from '../api/uploads';

const departments = ['computer', 'civil', 'electrical', 'mechanical', 'textile'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const tabs = ['overview', 'edit profile', 'settings', 'posts'];

const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileForm, setProfileForm] = useState(user || {});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [posts, setPosts] = useState([]);
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState('');

  const myPosts = useMemo(() => posts.filter((post) => String(post.userId?._id || post.userId) === String(user?._id)), [posts, user?._id]);

  useEffect(() => {
    getPosts().then((data) => setPosts(data.posts || [])).catch(() => {});
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  const uploadImage = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const data = await uploadToCloud(file);
      setProfileForm((current) => ({ ...current, [field]: data.url }));
      showToast('Image uploaded');
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    const data = await updateProfile(profileForm);
    setUser(data.user);
    setProfileForm(data.user);
    showToast('Profile saved');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    await changePassword(passwordForm);
    setPasswordForm({ currentPassword: '', newPassword: '' });
    showToast('Password changed');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      {toast && <div className="fixed right-4 top-20 z-50 rounded-md bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-xl">{toast}</div>}
      <section className="surface overflow-hidden">
        <div className="h-48 bg-slate-800">
          {profileForm.coverPhoto && <img className="h-full w-full object-cover" src={profileForm.coverPhoto} alt="Cover" />}
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="-mt-20 flex h-32 w-32 items-center justify-center rounded-lg border-4 border-slate-900 bg-slate-800 text-5xl font-black text-cyan-200">
            {profileForm.profilePicture ? <img className="h-full w-full rounded object-cover" src={profileForm.profilePicture} alt={user.name} /> : user?.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white">{user?.name}</h1>
            <p className="capitalize text-slate-400">{user?.role} - {user?.department} - semester {user?.semester}</p>
            {user?.role === 'student' && <p className="mt-1 text-sm font-semibold text-cyan-200">Roll: {user?.rollNumber || 'Not set'}</p>}
          </div>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-3">
          {tabs.map((tab) => (
            <button key={tab} className={`rounded-md px-4 py-2 text-sm font-bold capitalize ${activeTab === tab ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' && (
        <section className="surface p-5">
          <h2 className="text-lg font-black text-white">About</h2>
          <p className="mt-3 text-slate-300">{user?.bio || 'No bio added yet.'}</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Department: <span className="capitalize text-white">{user?.department}</span></p>
            <p>Semester: <span className="text-white">{user?.semester}</span></p>
            {user?.role === 'student' && <p>Roll Number: <span className="text-white">{user?.rollNumber || 'Not set'}</span></p>}
            <p>Phone: <span className="text-white">{user?.phone}</span></p>
            <p>Contact: <span className="text-white">{user?.contactInfo || 'Not set'}</span></p>
          </div>
        </section>
      )}

      {activeTab === 'edit profile' && (
        <section className="surface p-5">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={submitProfile}>
            {['name', 'age', 'phone', 'contactInfo'].map((field) => (
              <input key={field} className="input" placeholder={field} value={profileForm[field] || ''} onChange={(e) => setProfileForm({ ...profileForm, [field]: e.target.value })} />
            ))}
            {user?.role === 'student' && (
              <input className="input" placeholder="Roll Number" value={profileForm.rollNumber || ''} onChange={(e) => setProfileForm({ ...profileForm, rollNumber: e.target.value })} />
            )}
            <label className="btn btn-muted cursor-pointer">{uploading === 'profilePicture' ? 'Uploading...' : 'Upload Profile Picture'}<input className="hidden" type="file" accept="image/*" onChange={(e) => uploadImage(e, 'profilePicture')} /></label>
            <label className="btn btn-muted cursor-pointer">{uploading === 'coverPhoto' ? 'Uploading...' : 'Upload Cover Photo'}<input className="hidden" type="file" accept="image/*" onChange={(e) => uploadImage(e, 'coverPhoto')} /></label>
            <select className="input" value={profileForm.department || ''} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}>
              {departments.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <select className="input" value={profileForm.semester || '1'} onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}>
              {semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
            </select>
            <textarea className="input md:col-span-2" rows="4" placeholder="Bio" value={profileForm.bio || ''} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
            <button className="btn btn-primary md:col-span-2">Save Profile</button>
          </form>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="surface p-5">
          <h2 className="text-lg font-black text-white">Change Password</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submitPassword}>
            <input className="input" type="password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
            <input className="input" type="password" placeholder="New password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            <button className="btn btn-primary">Update</button>
          </form>
        </section>
      )}

      {activeTab === 'posts' && (
        <section className="surface p-5">
          <h2 className="text-lg font-black text-white">My Posts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {myPosts.map((post) => (
              <div key={post._id} className="rounded-lg border border-white/10 bg-slate-950 p-3">
                <p className="text-sm text-slate-300">{post.caption || 'Media post'}</p>
                <p className="mt-2 text-xs text-slate-500">{post.likesCount || 0} likes - {post.commentsCount || 0} comments</p>
                <button className="btn btn-danger mt-3 py-1" onClick={() => deletePost(post._id).then(() => setPosts((items) => items.filter((item) => item._id !== post._id)))}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default Profile;
