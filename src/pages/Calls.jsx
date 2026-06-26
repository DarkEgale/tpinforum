import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getUsers } from '../api/system';
import { SOCKET_URL } from '../api/config';

const socket = io(SOCKET_URL, { withCredentials: true });
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

const Calls = ({ embedded = false }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const peer = useRef(null);
  const activePeerId = useRef(null);

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
    socket.emit('userOnline', user?._id);
    getUsers().then((data) => setUsers((data.users || []).filter((item) => item._id !== user?._id))).catch(() => {});

    socket.on('callUser', (payload) => {
      setIncoming(payload);
      activePeerId.current = payload.from;
      setStatus(`${payload.fromName} is calling`);
    });
    socket.on('callRejected', () => setStatus('Call rejected'));
    socket.on('callEnded', endCall);
    socket.on('webrtcOffer', async (payload) => {
      activePeerId.current = payload.from;
      const pc = createPeer();
      const stream = await prepareMedia(payload.callType === 'video');
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtcAnswer', { to: payload.from, from: user._id, answer });
      setStatus('Call connected');
    });
    socket.on('webrtcAnswer', async (payload) => {
      await peer.current?.setRemoteDescription(new RTCSessionDescription(payload.answer));
      setStatus('Call connected');
    });
    socket.on('webrtcIceCandidate', async (payload) => {
      if (payload.candidate && peer.current) await peer.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });

    return () => {
      socket.off('callUser');
      socket.off('callRejected');
      socket.off('callEnded');
      socket.off('webrtcOffer');
      socket.off('webrtcAnswer');
      socket.off('webrtcIceCandidate');
    };
  }, [user?._id]);

  const startCall = async (callType) => {
    if (!target) return;
    activePeerId.current = target._id;
    const pc = createPeer();
    const stream = await prepareMedia(callType === 'video');
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('callUser', { to: target._id, from: user._id, fromName: user.name, callType });
    socket.emit('webrtcOffer', { to: target._id, from: user._id, offer, callType });
    setStatus(`Calling ${target.name}`);
  };

  const acceptCall = () => {
    setTarget(users.find((item) => item._id === incoming.from) || null);
    setIncoming(null);
    setStatus('Accepting call');
  };

  const rejectCall = () => {
    socket.emit('callRejected', { to: incoming.from, from: user._id });
    setIncoming(null);
    setStatus('Call rejected');
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
    setStatus('Call ended');
  }

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = muted; });
    setMuted(!muted);
  };

  const toggleCamera = () => {
    localStream.current?.getVideoTracks().forEach((track) => { track.enabled = cameraOff; });
    setCameraOff(!cameraOff);
  };

  const shareScreen = async () => {
    if (!peer.current || !navigator.mediaDevices.getDisplayMedia) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = peer.current.getSenders().find((item) => item.track?.kind === 'video');
    if (sender) sender.replaceTrack(screenTrack);
  };

  const Container = embedded ? 'section' : 'main';

  return (
    <Container className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl space-y-6 px-4 py-6'}>
      <section className="surface p-5">
        <h1 className="text-2xl font-black text-white">Audio and Video Calls</h1>
        <p className="mt-2 text-sm text-slate-400">WebRTC calling with Socket.IO signaling, STUN ICE config, accept, reject, end, mute, camera toggle, and screen sharing.</p>
      </section>

      {incoming && (
        <section className="surface border-cyan-400/50 p-5">
          <h2 className="font-black text-white">Incoming {incoming.callType} call</h2>
          <p className="text-slate-400">{incoming.fromName}</p>
          <div className="mt-4 flex gap-3">
            <button className="btn btn-primary" onClick={acceptCall}>Accept</button>
            <button className="btn btn-danger" onClick={rejectCall}>Reject</button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="surface overflow-hidden">
          <div className="border-b border-white/10 p-4">
            <h2 className="font-black text-white">Contacts</h2>
          </div>
          {users.map((item) => (
            <button key={item._id} className={`block w-full border-b border-white/10 p-3 text-left hover:bg-slate-800 ${target?._id === item._id ? 'bg-slate-800' : ''}`} onClick={() => setTarget(item)}>
              <p className="font-semibold text-white">{item.name}</p>
              <p className="text-xs capitalize text-slate-400">{item.role} - {item.department}</p>
            </button>
          ))}
        </aside>

        <section className="surface p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-white">{target ? target.name : 'Select a contact'}</h2>
              <p className="text-sm text-slate-400">{status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-muted" onClick={() => startCall('audio')}>Audio</button>
              <button className="btn btn-primary" onClick={() => startCall('video')}>Video</button>
              <button className="btn btn-muted" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
              <button className="btn btn-muted" onClick={toggleCamera}>{cameraOff ? 'Camera On' : 'Camera Off'}</button>
              <button className="btn btn-muted" onClick={shareScreen}>Share Screen</button>
              <button className="btn btn-danger" onClick={endCall}>End</button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <video className="aspect-video w-full rounded-lg bg-black object-cover" ref={localVideo} autoPlay muted playsInline />
            <video className="aspect-video w-full rounded-lg bg-black object-cover" ref={remoteVideo} autoPlay playsInline />
          </div>
        </section>
      </div>
    </Container>
  );
};

export default Calls;
