import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ImagePlus, Mic, MicOff, Paperclip, Phone, PhoneOff, Send, Video, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChatHistory, getUsers, markChatSeen } from '../api/system';
import { uploadToCloud } from '../api/uploads';
import { SOCKET_URL } from '../api/config';

const socket = io(SOCKET_URL, { withCredentials: true });
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
const roomFor = (a, b) => [a, b].sort().join(':');

const modeConfig = {
  campus: { title: 'Campus-wide Chat', room: () => 'campus-wide' },
  department: { title: 'Department Chat', room: (user) => `department:${user.department}` },
  direct: { title: 'Single Message', room: () => null },
  teacher: { title: 'Teacher Chat', room: () => null },
};

const Avatar = ({ person, online }) => (
  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-cyan-500 text-sm font-black text-slate-950">
    {person?.profilePicture
      ? <img className="h-full w-full object-cover" src={person.profilePicture} alt={person.name} />
      : <span className="flex h-full w-full items-center justify-center">{person?.name?.charAt(0) || '?'}</span>}
    {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />}
  </div>
);

const Chat = ({ mode = 'campus', compact = false, initialUserId = '' }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState(modeConfig[mode].room(user) || '');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [typing, setTyping] = useState('');
  const [online, setOnline] = useState({});
  const [uploading, setUploading] = useState(false);
  const [incoming, setIncoming] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [callStatus, setCallStatus] = useState('Ready');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const endRef = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const peer = useRef(null);
  const activePeerId = useRef(null);

  const contactUsers = useMemo(() => {
    if (mode === 'campus') return users;
    if (mode === 'department') return users.filter((item) => item.department === user?.department);
    if (mode === 'teacher') {
      return user?.role === 'student'
        ? users.filter((item) => item.role === 'teacher')
        : users.filter((item) => item.role === 'student');
    }
    return users.filter((item) => item.department === user?.department);
  }, [mode, users, user?.department, user?.role]);

  const onlineContacts = contactUsers.filter((item) => online[item._id]);
  const canCall = !!selectedUser && (mode === 'direct' || mode === 'teacher');
  const memberById = useMemo(() => {
    const map = new Map(users.map((item) => [String(item._id), item]));
    if (user) map.set(String(user._id), user);
    return map;
  }, [users, user]);

  const createPeer = () => {
    const pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (event) => {
      if (event.candidate && activePeerId.current) {
        socket.emit('webrtcIceCandidate', { to: activePeerId.current, from: user._id, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
    };
    peer.current = pc;
    return pc;
  };

  const prepareMedia = async (video = true) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStream.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    return stream;
  };

  useEffect(() => {
    setSelectedUser(null);
    setActiveRoom(modeConfig[mode].room(user) || '');
    setMessages([]);
  }, [mode, user?.department]);

  useEffect(() => {
    if (!initialUserId || !users.length) return;
    const target = users.find((item) => String(item._id) === String(initialUserId));
    if (target) {
      setSelectedUser(target);
      setActiveRoom(roomFor(user._id, target._id));
    }
  }, [initialUserId, users, user?._id]);

  useEffect(() => {
    socket.emit('userOnline', user?._id);
    getUsers().then((data) => setUsers((data.users || []).filter((item) => item._id !== user?._id))).catch(() => {});

    socket.on('presenceUpdate', ({ userId, online: isOnline }) => setOnline((current) => ({ ...current, [userId]: isOnline })));
    socket.on('receiveMessage', (incomingMessage) => {
      if (incomingMessage.roomId === activeRoom) setMessages((current) => [...current, incomingMessage]);
    });
    socket.on('typing', (data) => {
      if (data.roomId === activeRoom && data.userId !== user?._id) {
        setTyping(data.name);
        window.setTimeout(() => setTyping(''), 1500);
      }
    });
    socket.on('callUser', (payload) => {
      setIncoming(payload);
      activePeerId.current = payload.from;
      setCallStatus(`${payload.fromName} is calling`);
    });
    socket.on('callRejected', () => setCallStatus('Call rejected'));
    socket.on('callEnded', endCall);
    socket.on('webrtcOffer', async (payload) => {
      activePeerId.current = payload.from;
      setPendingOffer(payload);
    });
    socket.on('webrtcAnswer', async (payload) => {
      await peer.current?.setRemoteDescription(new RTCSessionDescription(payload.answer));
      setCallStatus('Call connected');
    });
    socket.on('webrtcIceCandidate', async (payload) => {
      if (payload.candidate && peer.current) await peer.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });

    return () => {
      socket.off('presenceUpdate');
      socket.off('receiveMessage');
      socket.off('typing');
      socket.off('callUser');
      socket.off('callRejected');
      socket.off('callEnded');
      socket.off('webrtcOffer');
      socket.off('webrtcAnswer');
      socket.off('webrtcIceCandidate');
    };
  }, [activeRoom, user?._id]);

  useEffect(() => {
    if (!activeRoom) return;
    socket.emit('joinRoom', activeRoom);
    getChatHistory(activeRoom).then((data) => setMessages(data.messages || [])).catch(() => setMessages([]));
    markChatSeen(activeRoom).catch(() => {});
  }, [activeRoom]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chooseUser = (target) => {
    if (mode === 'campus' || mode === 'department') return;
    setSelectedUser(target);
    setActiveRoom(roomFor(user._id, target._id));
  };

  const startCall = async (callType) => {
    if (!selectedUser) return;
    activePeerId.current = selectedUser._id;
    const pc = createPeer();
    const stream = await prepareMedia(callType === 'video');
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('callUser', { to: selectedUser._id, from: user._id, fromName: user.name, callType });
    socket.emit('webrtcOffer', { to: selectedUser._id, from: user._id, offer, callType });
    setCallStatus(`Calling ${selectedUser.name}`);
  };

  const rejectCall = () => {
    socket.emit('callRejected', { to: incoming.from, from: user._id });
    setIncoming(null);
    setPendingOffer(null);
    setCallStatus('Call rejected');
  };

  const acceptCall = async () => {
    if (!pendingOffer) return;
    const caller = users.find((item) => item._id === pendingOffer.from);
    setSelectedUser(caller || null);
    setActiveRoom(roomFor(user._id, pendingOffer.from));
    const pc = createPeer();
    const stream = await prepareMedia(pendingOffer.callType === 'video');
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtcAnswer', { to: pendingOffer.from, from: user._id, answer });
    setIncoming(null);
    setPendingOffer(null);
    setCallStatus('Call connected');
  };

  function endCall() {
    localStream.current?.getTracks().forEach((track) => track.stop());
    peer.current?.close();
    peer.current = null;
    localStream.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    if (activePeerId.current) socket.emit('callEnded', { to: activePeerId.current, from: user?._id });
    activePeerId.current = null;
    setCallStatus('Ready');
  }

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = muted; });
    setMuted(!muted);
  };

  const toggleCamera = () => {
    localStream.current?.getVideoTracks().forEach((track) => { track.enabled = cameraOff; });
    setCameraOff(!cameraOff);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadToCloud(file);
      setFileUrl(data.url);
      setFileType(data.resourceType === 'video' ? 'video' : data.resourceType === 'image' ? 'image' : 'file');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!activeRoom || (!message.trim() && !fileUrl.trim())) return;
    socket.emit('sendMessage', {
      roomId: activeRoom,
      senderId: user._id,
      receiverId: selectedUser?._id || '',
      message: message || 'Shared a file',
      fileUrl,
      fileType: fileUrl ? fileType : '',
    });
    setMessage('');
    setFileUrl('');
    setFileType('');
  };

  const notifyTyping = () => {
    if (activeRoom) socket.emit('typing', { roomId: activeRoom, userId: user._id, name: user.name });
  };

  return (
    <section className={`surface overflow-hidden ${compact ? '' : 'mx-auto max-w-7xl'}`}>
      <div className={`grid ${compact ? 'grid-cols-1' : 'min-h-[calc(100vh-190px)] lg:grid-cols-[320px_1fr]'}`}>
        {!compact && (
          <aside className="border-r border-white/10">
            <div className="border-b border-white/10 p-4">
              <h1 className="text-xl font-black text-white">{modeConfig[mode].title}</h1>
              <p className="text-sm text-slate-400">{onlineContacts.length} online</p>
            </div>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {contactUsers.map((item) => (
                <button
                  key={item._id}
                  className={`flex w-full items-center gap-3 border-b border-white/10 p-3 text-left hover:bg-slate-800 ${selectedUser?._id === item._id ? 'bg-slate-800' : ''}`}
                  onClick={() => chooseUser(item)}
                >
                  <Avatar person={item} online={online[item._id]} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-white">{item.name}</span>
                    <span className="block truncate text-xs capitalize text-slate-400">{item.role} - {item.department} - {online[item._id] ? 'online' : 'offline'}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="flex min-h-[520px] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              {selectedUser && <Avatar person={selectedUser} online={online[selectedUser._id]} />}
              <div>
                <h2 className="font-black text-white">{selectedUser ? selectedUser.name : modeConfig[mode].title}</h2>
                <p className="text-sm text-slate-400">{typing ? `${typing} is typing...` : selectedUser ? `${online[selectedUser._id] ? 'Online' : 'Offline'} - ${callStatus}` : activeRoom}</p>
              </div>
            </div>
            {callStatus !== 'Ready' && canCall && (
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-muted h-10 w-10 rounded-full p-0" type="button" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>{muted ? <MicOff size={18} /> : <Mic size={18} />}</button>
                <button className="btn btn-muted h-10 w-10 rounded-full p-0" type="button" onClick={toggleCamera} title={cameraOff ? 'Camera on' : 'Camera off'}>{cameraOff ? <VideoOff size={18} /> : <Video size={18} />}</button>
                <button className="btn btn-danger h-10 w-10 rounded-full p-0" type="button" onClick={endCall} title="End call"><PhoneOff size={18} /></button>
              </div>
            )}
          </div>

          {incoming && (
            <div className="border-b border-cyan-400/40 bg-cyan-500/10 p-3">
              <p className="text-sm font-bold text-cyan-100">Incoming {incoming.callType} call from {incoming.fromName}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-primary gap-2 py-1" type="button" onClick={acceptCall}><Phone size={16} /> Accept</button>
                <button className="btn btn-danger gap-2 py-1" type="button" onClick={rejectCall}><PhoneOff size={16} /> Reject</button>
              </div>
            </div>
          )}

          {(callStatus !== 'Ready' || incoming || pendingOffer) && canCall && (
            <div className="grid gap-2 border-b border-white/10 bg-slate-950 p-3 md:grid-cols-2">
              <video className="aspect-video w-full rounded-md bg-black object-cover" ref={localVideo} autoPlay muted playsInline />
              <video className="aspect-video w-full rounded-md bg-black object-cover" ref={remoteVideo} autoPlay playsInline />
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!activeRoom && <div className="rounded-lg border border-white/10 bg-slate-950 p-5 text-sm text-slate-400">Select a contact to open this chat.</div>}
            {messages.map((item) => {
              const own = String(item.senderId) === String(user?._id);
              const sender = memberById.get(String(item.senderId));
              const showSender = mode === 'campus' || mode === 'department';
              return (
                <div key={item._id || `${item.createdAt}-${item.message}`} className={`flex items-end gap-2 ${own ? 'justify-end' : 'justify-start'}`}>
                  {!own && (
                    <Link to={`/profile/${item.senderId}`}>
                      <Avatar person={sender || { name: 'User' }} online={online[item.senderId]} />
                    </Link>
                  )}
                  <div className={`max-w-[78%] rounded-lg p-3 ${own ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-100'}`}>
                    {showSender && (
                      <Link to={`/profile/${item.senderId}`} className={`mb-1 block text-xs font-bold ${own ? 'text-slate-800' : 'text-cyan-300'}`}>
                        {sender?.name || 'User'}
                      </Link>
                    )}
                    <p className="text-sm">{item.message}</p>
                    {item.fileUrl && (
                      item.fileType === 'image'
                        ? <img className="mt-2 max-h-48 rounded-md object-cover" src={item.fileUrl} alt="Shared attachment" />
                        : item.fileType === 'video'
                          ? <video className="mt-2 max-h-48 rounded-md" src={item.fileUrl} controls />
                          : <a className="mt-2 block text-sm font-semibold underline" href={item.fileUrl} target="_blank" rel="noreferrer">Open file</a>
                    )}
                    <p className="mt-1 text-[11px] opacity-70">{new Date(item.createdAt || Date.now()).toLocaleTimeString()} {own && item.seenBy?.length > 1 ? '- seen' : ''}</p>
                  </div>
                  {own && (
                    <Link to={`/profile/${user._id}`}>
                      <Avatar person={user} online />
                    </Link>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {incoming && (
            <div className="border-b border-cyan-400/40 bg-cyan-500/10 p-3">
              <p className="text-sm font-bold text-cyan-100">Incoming {incoming.callType} call from {incoming.fromName}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-primary gap-2 py-1" type="button" onClick={acceptCall}><Phone size={16} /> Accept</button>
                <button className="btn btn-danger gap-2 py-1" type="button" onClick={rejectCall}><PhoneOff size={16} /> Reject</button>
              </div>
            </div>
          )}

          {callStatus !== 'Ready' && (
            <div className="border-b border-white/10 bg-slate-950 p-3">
              <p className="text-center text-sm font-semibold text-cyan-300">{callStatus}</p>
            </div>
          )}

          <form className="space-y-2 border-t border-white/10 p-4" onSubmit={sendMessage}>
            {fileUrl && <p className="text-xs font-semibold text-cyan-300">Attachment ready</p>}
            <div className="flex gap-2">
              <input className="input" value={message} onChange={(e) => { setMessage(e.target.value); notifyTyping(); }} placeholder="Type a message" disabled={!activeRoom} />
              {canCall && callStatus === 'Ready' && !incoming && (
                <>
                  <button className="btn btn-muted h-10 w-10 rounded-full p-0" type="button" onClick={() => startCall('audio')} title="Audio call"><Phone size={18} /></button>
                  <button className="btn btn-muted h-10 w-10 rounded-full p-0" type="button" onClick={() => startCall('video')} title="Video call"><Video size={18} /></button>
                </>
              )}
              <label className="btn btn-muted h-10 w-10 cursor-pointer p-0" title={uploading ? 'Uploading' : 'Attach file'}>
                {uploading ? <ImagePlus className="animate-pulse" size={18} /> : <Paperclip size={18} />}
                <input className="hidden" type="file" accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleUpload} />
              </label>
              <button className="btn btn-primary h-10 w-10 p-0" disabled={!activeRoom} title="Send"><Send size={18} /></button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Chat;
