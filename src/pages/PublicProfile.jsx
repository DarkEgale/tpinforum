import { MessageCircle, Phone, GraduationCap, Mail, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getUser } from '../api/system';

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUser(userId)
      .then((data) => setProfile(data.user))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <main className="mx-auto max-w-5xl px-4 py-6 text-slate-300">Loading profile...</main>;
  }

  if (!profile) {
    return <main className="mx-auto max-w-5xl px-4 py-6 text-slate-300">Profile not found.</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <section className="surface overflow-hidden">
        <div className="h-52 bg-slate-800">
          {profile.coverPhoto && <img className="h-full w-full object-cover" src={profile.coverPhoto} alt="Cover" />}
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <Link to={`/profile/${profile._id}`} className="-mt-20 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-slate-900 bg-slate-800 text-5xl font-black text-cyan-200">
            {profile.profilePicture ? <img className="h-full w-full object-cover" src={profile.profilePicture} alt={profile.name} /> : profile.name?.charAt(0)}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black text-white">{profile.name}</h1>
            <p className="capitalize text-slate-400">{profile.role} - {profile.department} - semester {profile.semester}</p>
            {profile.role === 'student' && <p className="mt-1 text-sm font-semibold text-cyan-200">Roll: {profile.rollNumber || 'Not set'}</p>}
          </div>
          <button className="btn btn-primary gap-2" onClick={() => navigate(`/messages?user=${profile._id}`)}>
            <MessageCircle size={18} />
            Message
          </button>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-black text-white">About</h2>
        <p className="mt-3 text-slate-300">{profile.bio || 'No bio added yet.'}</p>
        <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <p className="flex items-center gap-2"><UserRound size={16} /> <span className="capitalize">{profile.role}</span></p>
          <p className="flex items-center gap-2"><GraduationCap size={16} /> <span className="capitalize">{profile.department} / {profile.semester}</span></p>
          {profile.role === 'student' && <p className="flex items-center gap-2"><GraduationCap size={16} /> Roll {profile.rollNumber || 'Not set'}</p>}
          <p className="flex items-center gap-2"><Phone size={16} /> {profile.phone}</p>
          <p className="flex items-center gap-2"><Mail size={16} /> {profile.email}</p>
        </div>
      </section>
    </main>
  );
};

export default PublicProfile;
