import { useState } from 'react';
import { MessageCircle, School, UserRound, UsersRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Chat from '../components/Chat';

const tabs = [
  { id: 'campus', label: 'Campus', icon: UsersRound },
  { id: 'department', label: 'Department', icon: School },
  { id: 'direct', label: 'Single', icon: UserRound },
  { id: 'teacher', label: 'Teacher', icon: MessageCircle },
];

const Messages = () => {
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('user');
  const [activeTab, setActiveTab] = useState(initialUserId ? 'direct' : 'campus');

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <section className="surface p-4">
        <h1 className="text-2xl font-black text-white">Messages</h1>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
            <button
              key={tab.id}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} />
              {tab.label}
            </button>
            );
          })}
        </div>
      </section>

      <Chat mode={activeTab} initialUserId={initialUserId} />
    </main>
  );
};

export default Messages;
