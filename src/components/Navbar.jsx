import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { SOCKET_URL } from '../api/config';

const socket = io(SOCKET_URL, { withCredentials: true });

const navItems = [
  { to: '/', label: 'Feed' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/result-search', label: 'Result Search' },
  { to: '/messages', label: 'Messages' },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const pushNotification = (notification) => {
    const item = { id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), ...notification };
    setNotifications((current) => [item, ...current].slice(0, 12));
    setToast(item);
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!user?._id) return undefined;

    socket.emit('userOnline', user._id);
    socket.on('noticePublished', (notice) => {
      if (user.role === 'student') {
        const targetId = notice.targetStudentId?._id || notice.targetStudentId;
        const isTargetedToSomeoneElse = targetId && String(targetId) !== String(user._id);
        const matchesDepartment = notice.department === 'all' || notice.department === user.department;
        const matchesSemester = notice.semester === 'all' || notice.semester === user.semester;
        if (isTargetedToSomeoneElse || (!targetId && (!matchesDepartment || !matchesSemester))) return;
      }
      pushNotification({
        title: 'New notice published',
        message: notice.title || notice.notice || 'A notice was published',
        to: '/dashboard',
      });
    });
    socket.on('newPost', (post) => {
      if (String(post.userId?._id || post.userId) === String(user._id)) return;
      pushNotification({
        title: 'New post published',
        message: `${post.userId?.name || 'Someone'} shared a post`,
        to: '/',
      });
    });
    socket.on('newResult', (data) => {
      pushNotification({
        title: 'New result published',
        message: `${data.teacherName || 'Teacher'} published your result`,
        to: '/dashboard',
      });
    });

    return () => {
      socket.off('noticePublished');
      socket.off('newPost');
      socket.off('newResult');
    };
  }, [user?._id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      {toast && (
        <button
          className="fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-cyan-400/30 bg-slate-900 px-4 py-3 text-left shadow-xl shadow-black/30"
          onClick={() => toast.to && navigate(toast.to)}
        >
          <p className="text-sm font-black text-cyan-200">{toast.title}</p>
          <p className="mt-1 text-xs text-slate-300">{toast.message}</p>
        </button>
      )}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <NavLink to="/" className="mr-auto text-lg font-black tracking-normal text-cyan-300">
          TPINFORUM
        </NavLink>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button className="btn btn-muted relative h-10 w-10 sm:h-10 sm:w-10 p-0 font-bold" onClick={() => setOpenNotifications((value) => !value)} title="Notifications">
              <Bell size={18} className="sm:hidden" />
              <Bell size={20} className="hidden sm:block" />
              {!!notifications.length && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400" />}
            </button>
            {openNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-slate-900 shadow-xl shadow-black/30">
                <div className="flex items-center justify-between border-b border-white/10 p-3">
                  <h2 className="text-sm font-black text-white">Notifications</h2>
                  <button className="text-slate-400 hover:text-white" onClick={() => setOpenNotifications(false)}><X size={16} /></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length ? notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="block w-full border-b border-white/10 p-3 text-left hover:bg-slate-800"
                      onClick={() => {
                        setOpenNotifications(false);
                        if (notification.to) navigate(notification.to);
                      }}
                    >
                      <p className="text-sm font-semibold text-white">{notification.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{notification.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{notification.time}</p>
                    </button>
                  )) : <p className="p-4 text-sm text-slate-400">No live notifications yet.</p>}
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white sm:font-semibold">{user?.name}</p>
            <p className="text-xs capitalize text-slate-400 sm:text-xs">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
