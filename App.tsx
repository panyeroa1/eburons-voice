import React, { useState } from 'react';
import LiveAgent from './components/LiveAgent';
import ChatInterface from './components/ChatInterface';
import ThinkingMode from './components/ThinkingMode';
import Transcriber from './components/Transcriber';
import Settings from './components/Settings';
import { AppMode } from './types';
import { Mic2, MessageSquare, BrainCircuit, FileAudio, Settings as SettingsIcon } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LIVE_AGENT);

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden font-sans">
      {/* Viewport Area */}
      <div className="flex-1 overflow-hidden relative">
        {mode === AppMode.LIVE_AGENT && <LiveAgent />}
        {mode === AppMode.CHAT && <ChatInterface />}
        {mode === AppMode.THINKING && <ThinkingMode />}
        {mode === AppMode.TRANSCRIBE && <Transcriber />}
        {mode === AppMode.SETTINGS && <Settings />}
      </div>

      {/* Bottom Navigation - Mobile First */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 grid grid-cols-5 px-2 z-50">
        <NavButton 
            active={mode === AppMode.LIVE_AGENT} 
            onClick={() => setMode(AppMode.LIVE_AGENT)} 
            icon={<Mic2 />} 
            label="Orus" 
        />
        <NavButton 
            active={mode === AppMode.CHAT} 
            onClick={() => setMode(AppMode.CHAT)} 
            icon={<MessageSquare />} 
            label="Chat" 
        />
        <NavButton 
            active={mode === AppMode.THINKING} 
            onClick={() => setMode(AppMode.THINKING)} 
            icon={<BrainCircuit />} 
            label="Think" 
        />
        <NavButton 
            active={mode === AppMode.TRANSCRIBE} 
            onClick={() => setMode(AppMode.TRANSCRIBE)} 
            icon={<FileAudio />} 
            label="Logs" 
        />
        <NavButton 
            active={mode === AppMode.SETTINGS} 
            onClick={() => setMode(AppMode.SETTINGS)} 
            icon={<SettingsIcon />} 
            label="Config" 
        />
      </div>
    </div>
  );
};

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
            active ? 'text-amber-500' : 'text-zinc-600 hover:text-zinc-400'
        }`}
    >
        <div className={`p-1 rounded-full ${active ? 'bg-amber-500/10' : ''}`}>
            {React.cloneElement(icon as React.ReactElement<any>, { className: active ? "w-6 h-6" : "w-5 h-5" })}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
);

export default App;