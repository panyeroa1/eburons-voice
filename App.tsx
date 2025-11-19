
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
        {/* 
            PERSISTENCE LAYER:
            LiveAgent remains mounted to keep the connection/audio session alive.
            We explicitly pass the mode so LiveAgent can switch to a Mini Player view
            when navigating away, ensuring the user has control (Stop Button) and
            visual confirmation (Visualizer) on any screen.
        */}
        <div className="absolute inset-0 w-full h-full z-30 pointer-events-none">
             <LiveAgent mode={mode} />
        </div>

        {/* 
            OVERLAY LAYERS:
            These components are mounted on demand and sit "under" the Mini Player 
            but "over" the LiveAgent Full Screen view (controlled by LiveAgent's internal logic).
            We use z-20 to ensure they are below the persistent Mini Player (z-50 inside LiveAgent).
        */}
        {mode === AppMode.CHAT && (
            <div className="absolute inset-0 z-20 bg-black">
                <ChatInterface />
            </div>
        )}
        
        {mode === AppMode.THINKING && (
            <div className="absolute inset-0 z-20 bg-black">
                <ThinkingMode />
            </div>
        )}
        
        {mode === AppMode.TRANSCRIBE && (
             <div className="absolute inset-0 z-20 bg-black">
                <Transcriber />
            </div>
        )}
        
        {mode === AppMode.SETTINGS && (
             <div className="absolute inset-0 z-20 bg-black">
                <Settings />
            </div>
        )}
      </div>

      {/* Bottom Navigation - Mobile First */}
      <div className="h-20 bg-zinc-950 border-t border-zinc-800 grid grid-cols-5 px-2 z-50 relative">
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
