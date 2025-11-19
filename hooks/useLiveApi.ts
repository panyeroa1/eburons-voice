
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ORUS_SYSTEM_PROMPT, DECOBU_SECURITY_CONTENT, TRAFFICKING_SYSTEM_CONTENT } from '../constants';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { LiveStatus } from '../types';

export const useLiveApi = () => {
  const [status, setStatus] = useState<LiveStatus>({
    isConnected: false,
    isSpeaking: false,
    isListening: false,
    volume: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const [transcription, setTranscription] = useState<string>('');

  const connect = useCallback(async () => {
    try {
        if(!process.env.API_KEY) {
            throw new Error("API_KEY not found in environment");
        }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts - Ensure they are running (fix for Network/Autoplay errors)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if (inputCtx.state === 'suspended') await inputCtx.resume();

      audioContextRef.current = audioCtx;
      inputAudioContextRef.current = inputCtx;

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prepare System Instruction with Topic and Voice Config
      let systemInstruction = ORUS_SYSTEM_PROMPT;
      
      // 1. Inject Knowledge Topic
      const selectedTopic = localStorage.getItem('eburon_topic') || 'Trafficking Early Warning System';
      if (selectedTopic === 'Decobu Messenger') {
          systemInstruction += "\n\n" + "CURRENT TOPIC BRIEFING:\n" + DECOBU_SECURITY_CONTENT;
      } else if (selectedTopic === 'Trafficking Early Warning System') {
          systemInstruction += "\n\n" + "CURRENT TOPIC BRIEFING:\n" + TRAFFICKING_SYSTEM_CONTENT;
      }

      // 2. Inject Voice Style and Language
      const voiceStyle = localStorage.getItem('eburon_voice_style') || 'Dutch Flemish expressive';
      const language = localStorage.getItem('eburon_language') || 'English';

      systemInstruction += `\n\n*** VOICE IDENTITY & LANGUAGE PROTOCOL (CRITICAL) ***
      1. VOICE STYLE/ACCENT: You must strictly adopt a "${voiceStyle}" accent, tone, and persona. 
         - Even if speaking English, you must sound like a native speaker of that region speaking English.
         - Use culturally relevant mannerisms or interjections if they fit the style (e.g., "Allee" for Flemish, "Lah" for Taglish) but keep them subtle.
      2. OUTPUT LANGUAGE: You must speak in "${language}".
         - Example: If Style is "Dutch Flemish" and Language is "English", speak English with a heavy Flemish accent.
         - Example: If Style is "Turkish" and Language is "Turkish", speak natural Turkish.
      
      CURRENT CONFIGURATION:
      - Style: ${voiceStyle}
      - Language: ${language}
      `;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }, // Charon for authoritative tone
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            setStatus(s => ({ ...s, isConnected: true, isListening: true, error: undefined }));
            
            // Setup Input Processing
            if (!inputAudioContextRef.current) return;
            
            const inputContext = inputAudioContextRef.current;
            const source = inputContext.createMediaStreamSource(stream);
            const processor = inputContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setStatus(s => ({...s, volume: rms}));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContext.destination);
            
            sourceRef.current = source;
            processorRef.current = processor;

            // IMMEDIATE START TRIGGER
            // Send a text command to kickstart the agent immediately after connection.
            sessionPromise.then(session => {
                // Cast to any to handle missing type definition for send method
                const s = session as any;
                if (typeof s.send === 'function') {
                    s.send({
                        clientContent: {
                            turns: [{ role: 'user', parts: [{ text: "Start the presentation now. Follow the 8-minute structure, ensuring you cover all key points, and always end with a strong recap and conclusion." }] }],
                            turnComplete: true
                        }
                    });
                }
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const audioData = msg.serverContent.modelTurn.parts[0].inlineData.data;
              if (audioContextRef.current) {
                setStatus(s => ({...s, isSpeaking: true}));
                
                const ctx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(
                  base64ToUint8Array(audioData),
                  ctx
                );

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                // Schedule playback
                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                    nextStartTimeRef.current = currentTime;
                }
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;

                source.onended = () => {
                    // Simple check if queue is empty to toggle talking state
                    if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
                         setStatus(s => ({...s, isSpeaking: false}));
                    }
                };
              }
            }

            // Handle transcription
            if (msg.serverContent?.inputTranscription?.text) {
                 setTranscription(prev => `User: ${msg.serverContent?.inputTranscription?.text}`);
            }
            
            if (msg.serverContent?.interrupted) {
                nextStartTimeRef.current = 0;
                setStatus(s => ({...s, isSpeaking: false}));
            }
          },
          onclose: () => {
            setStatus(s => ({ ...s, isConnected: false, isListening: false }));
          },
          onerror: (e) => {
            console.error("Live API Error", e);
            setStatus(s => ({ ...s, error: "Network/Connection Error. Please retry." }));
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Failed to connect", error);
      setStatus(s => ({ ...s, error: error.message }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
          if(session.close) session.close();
      }).catch(() => {}); // Ignore close errors
    }
    
    if (sourceRef.current) sourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();

    setStatus({
      isConnected: false,
      isSpeaking: false,
      isListening: false,
      volume: 0
    });
    setTranscription('');
  }, []);

  const sendText = useCallback((text: string) => {
      if (sessionRef.current) {
          sessionRef.current.then((session: any) => {
              // Safely check if send method exists before calling
              // This prevents "session.send is not a function" errors on incompatible SDK versions
              if (typeof session.send === 'function') {
                  session.send({ 
                      clientContent: { 
                          turns: [{ role: 'user', parts: [{ text }] }], 
                          turnComplete: true 
                      } 
                  });
              }
              // If session.send is not available, we silently ignore the request to avoid crashing the app.
          });
      }
  }, []);

  return {
    connect,
    disconnect,
    sendText,
    status,
    transcription
  };
};
