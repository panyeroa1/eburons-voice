import React, { useEffect, useRef, useState } from 'react';
import { useLiveApi } from '../hooks/useLiveApi';
import AudioVisualizer from './AudioVisualizer';
import { Mic, PhoneOff, Radio, Loader2, RefreshCw } from 'lucide-react';

const LiveAgent: React.FC = () => {
  const { connect, disconnect, sendText, status, transcription } = useLiveApi();
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishedRef = useRef(false);
  const lastUserActivityRef = useRef<number>(Date.now());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [disconnect]);

  // Track User Activity (Volume based) - Updates frequently
  useEffect(() => {
    if (status.volume > 0.02) {
      lastUserActivityRef.current = Date.now();
    }
  }, [status.volume]);

  // Auto-Director Logic - Runs on state changes
  useEffect(() => {
    if (!status.isConnected) {
        isFinishedRef.current = false;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        return;
    }

    // 1. Check for Finish Keywords in User Transcription
    if (transcription.toLowerCase().match(/(wrap up|finish|conclusion|stop)/)) {
        if (!isFinishedRef.current) {
            isFinishedRef.current = true;
            // Silent command to wrap up
            sendText("[SYSTEM] Okay, please wrap up now with a strong, memorable conclusion.");
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            return;
        }
    }

    // 2. Auto-Continue Logic
    // Only trigger if the topic is not concluded
    if (!isFinishedRef.current) {
        if (status.isSpeaking) {
            // Agent is speaking: Clear timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        } else {
            // Agent is silent: Reset and Start Timer
            // We reset on every state change to ensure we don't interrupt a conversational turn.
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            
            silenceTimerRef.current = setTimeout(() => {
                // Check if user has been silent recently (avoid interrupting user)
                const timeSinceUserActivity = Date.now() - lastUserActivityRef.current;
                
                // Only auto-continue if user has been silent for > 1.5 seconds
                // Reduced from 2000ms to 1000ms for tighter, more continuous flow
                if (timeSinceUserActivity > 1500) {
                    // Send specific continue prompt as requested by user
                    sendText("[SYSTEM] IGNORE SILENCE. Keep speaking. Don't stop."); 
                }
            }, 1000); // 1s silence triggers continuation check
        }
    } else {
        // If finished, ensure no timers are running
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }

  }, [status.isConnected, status.isSpeaking, transcription, sendText]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-zinc-900 to-black text-white relative overflow-hidden">
      {/* Header */}
      <div className="p-6 flex justify-between items-center z-10">
        <div>
          <h2 className="text-xs font-mono text-amber-500 tracking-widest">EBURON SYSTEM</h2>
          <h1 className="text-2xl font-bold tracking-tight text-white"> <span className="text-zinc-500 text-sm font-normal">v1.9</span></h1>
        </div>
        <div className="flex items-center gap-3">
            {status.isConnected && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700">
                    <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-zinc-400">LIVE</span>
                </div>
            )}
            {status.isReconnecting && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-900/30 border border-amber-700/50">
                    <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                    <span className="text-[10px] font-mono text-amber-400">RECONNECTING</span>
                </div>
            )}
            <div className={`w-3 h-3 rounded-full transition-colors duration-500 
                ${status.isConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' 
                : status.isReconnecting ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]'
                : 'bg-red-900'}`}>
            </div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <AudioVisualizer 
            isActive={status.isConnected} 
            volume={status.volume} 
            isSpeaking={status.isSpeaking} 
        />
        
        {status.isConnected && (
            <div className="mt-8 text-center px-6 h-24 flex flex-col items-center gap-2">
                 {transcription && (
                     <p className="text-zinc-400 text-sm font-mono animate-pulse">
                         {transcription}
                     </p>
                 )}
                 
                 {status.isSpeaking && !transcription && (
                     <p className="text-cyan-500 text-xs font-mono tracking-widest">EBURON IS SPEAKING...</p>
                 )}

                 {/* Start Prompt - Shows when connected, silent, and no transcription yet */}
                 {!status.isSpeaking && !transcription && !status.error && (
                     <p className="text-amber-500 text-sm font-bold tracking-wide animate-bounce">
                         INITIALIZING BROADCAST...
                     </p>
                 )}

                 {status.error && (
                     <p className="text-red-500 text-xs font-mono bg-red-900/20 px-2 py-1 rounded animate-in fade-in slide-in-from-bottom-1">{status.error}</p>
                 )}
            </div>
        )}

        {!status.isConnected && !status.isConnecting && !status.isReconnecting && (
             <div className="mt-8 px-8 text-center max-w-md">
                 <p className="text-zinc-500 text-xs tracking-widest font-mono">
                    {status.error ? "SYSTEM ERROR - PLEASE RESTART" : "SYSTEM STANDBY"}
                 </p>
                 <p className="text-zinc-600 text-[10px] mt-2 font-mono uppercase">
                     Press Start to Begin Intelligence Feed
                 </p>
                 {status.error && (
                     <p className="text-red-400 text-sm mt-2">{status.error}</p>
                 )}
             </div>
        )}
        
        {status.isReconnecting && (
            <div className="mt-8 text-center px-6">
                <p className="text-amber-500 text-xs font-mono tracking-widest animate-pulse">ATTEMPTING RECONNECTION...</p>
                <p className="text-zinc-500 text-xs mt-1">{status.error}</p>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 pb-12 z-10 flex justify-center items-center gap-6">
         {!status.isConnected ? (
             <button 
                onClick={connect}
                disabled={status.isConnecting || status.isReconnecting}
                className={`group relative inline-flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg 
                    ${status.isConnecting || status.isReconnecting
                        ? 'bg-zinc-800 cursor-wait' 
                        : 'bg-amber-600 hover:bg-amber-500 hover:shadow-amber-500/30 active:scale-95'
                    }`}
             >
                {status.isConnecting || status.isReconnecting ? (
                    <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                ) : (
                    <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                )}
                
                <span className="absolute -bottom-8 text-xs font-mono text-zinc-500 group-hover:text-white transition-colors whitespace-nowrap">
                    {status.isConnecting ? 'CONNECTING...' : status.isReconnecting ? 'RETRYING...' : 'START SESSION'}
                </span>
             </button>
         ) : (
            <button 
                onClick={disconnect}
                className="group relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 transition-all duration-300 shadow-lg active:scale-95"
             >
                <PhoneOff className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                <span className="absolute -bottom-8 text-xs font-mono text-red-500 group-hover:text-red-400 transition-colors whitespace-nowrap">END SESSION</span>
             </button>
         )}
      </div>

      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
           }}>
      </div>
    </div>
  );
};

export default LiveAgent;