import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { 
    ORUS_SYSTEM_PROMPT, 
    DECOBU_SECURITY_CONTENT, 
    TRAFFICKING_SYSTEM_CONTENT, 
    FLEMISH_EXPRESSIONS_CONTENT,
    TAGALOG_EXPRESSIONS_CONTENT,
    TURKISH_EXPRESSIONS_CONTENT,
    ARABIC_EXPRESSIONS_CONTENT,
    FRENCH_EXPRESSIONS_CONTENT,
    MALAYALAM_EXPRESSIONS_CONTENT,
    SPANISH_EXPRESSIONS_CONTENT,
    GERMAN_EXPRESSIONS_CONTENT,
    HINDI_EXPRESSIONS_CONTENT,
    JAPANESE_EXPRESSIONS_CONTENT,
    KOREAN_EXPRESSIONS_CONTENT,
    ITALIAN_EXPRESSIONS_CONTENT,
    RUSSIAN_EXPRESSIONS_CONTENT
} from '../constants';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { LiveStatus } from '../types';

export const useLiveApi = () => {
  const [status, setStatus] = useState<LiveStatus>({
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
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
  
  // Retry Logic Refs
  const isIntentionalDisconnectRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<(() => Promise<void>) | null>(null);
  const MAX_RETRIES = 3;

  const connect = useCallback(async () => {
    if (sessionRef.current) return; // Prevent double connection

    // Clear any pending retry timeouts if manual connect is called
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    setStatus(s => ({ 
        ...s, 
        isConnecting: !s.isReconnecting, // Only show connecting if not reconnecting
        error: s.isReconnecting ? s.error : undefined 
    }));

    isIntentionalDisconnectRef.current = false;

    try {
        if(!process.env.API_KEY) {
            throw new Error("API_KEY not found in environment");
        }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts - Ensure they are running (fix for Network/Autoplay errors)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      
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

      // Dynamic Expression Injection
      let expressionContent = "";
      
      if (voiceStyle.includes('Flemish') || voiceStyle.includes('Dutch') || language.includes('Dutch')) {
          expressionContent = FLEMISH_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Tagalog') || language.includes('Filipino') || language.includes('Tagalog')) {
          expressionContent = TAGALOG_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Turkish') || language.includes('Turkish')) {
          expressionContent = TURKISH_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Arabic') || language.includes('Arabic')) {
          expressionContent = ARABIC_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('French') || language.includes('French')) {
          expressionContent = FRENCH_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Malayalam') || language.includes('Malayalam')) {
          expressionContent = MALAYALAM_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Spanish') || language.includes('Spanish')) {
          expressionContent = SPANISH_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('German') || language.includes('German')) {
          expressionContent = GERMAN_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Hindi') || language.includes('Hindi')) {
          expressionContent = HINDI_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Japanese') || language.includes('Japanese')) {
          expressionContent = JAPANESE_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Korean') || language.includes('Korean')) {
          expressionContent = KOREAN_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Italian') || language.includes('Italian')) {
          expressionContent = ITALIAN_EXPRESSIONS_CONTENT;
      } else if (voiceStyle.includes('Russian') || language.includes('Russian')) {
          expressionContent = RUSSIAN_EXPRESSIONS_CONTENT;
      }

      if (expressionContent) {
          systemInstruction += "\n\n" + expressionContent;
      }

      systemInstruction += `\n\n*** VOICE IDENTITY & LANGUAGE PROTOCOL (CRITICAL) ***
      1. VOICE STYLE/ACCENT: You must strictly adopt a "${voiceStyle}" accent, tone, and persona. 
         - Even if speaking English, you must sound like a native speaker of that region speaking English.
         - Use culturally relevant mannerisms or interjections if they fit the style (e.g., "Allee" for Flemish, "Lah" for Taglish, "Yani" for Arabic) but keep them subtle.
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } }, // Charon for authoritative tone
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          inputAudioTranscription: {}, // Enabled for stop/start logic - Removed invalid model param
        },
        callbacks: {
          onopen: () => {
            setStatus(s => ({ 
                ...s, 
                isConnected: true, 
                isConnecting: false, 
                isReconnecting: false, 
                isListening: true, 
                error: undefined 
            }));
            
            // Reset retry count on successful connection
            reconnectAttemptRef.current = 0;
            
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
                try {
                    session.sendRealtimeInput({ media: pcmBlob });
                } catch (e) {
                    // Ignore send errors if session is closed/closing
                }
              });
            };

            source.connect(processor);
            
            // NEW: Use a GainNode with 0 gain to prevent audio loopback (echo) 
            // while keeping the ScriptProcessor active for input processing.
            const gainNode = inputContext.createGain();
            gainNode.gain.value = 0;
            processor.connect(gainNode);
            gainNode.connect(inputContext.destination);
            
            sourceRef.current = source;
            processorRef.current = processor;
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
            setStatus(s => ({ ...s, isConnected: false, isConnecting: false, isListening: false }));
            sessionRef.current = null;
            
            // Attempt Reconnect if not intentional
            if (!isIntentionalDisconnectRef.current) {
                attemptReconnect();
            }
          },
          onerror: (e) => {
            console.error("Live API Error", e);
            setStatus(s => ({ ...s, isConnected: false, isConnecting: false, isListening: false }));
            sessionRef.current = null;
            
            // Stop local streams on error
            if (sourceRef.current) sourceRef.current.disconnect();
            if (processorRef.current) processorRef.current.disconnect();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

            // Attempt Reconnect if not intentional
            if (!isIntentionalDisconnectRef.current) {
                attemptReconnect();
            }
          }
        }
      });

      sessionRef.current = sessionPromise;
      sessionPromise.catch(err => {
          console.error("Session failed to initialize", err);
          sessionRef.current = null;
          if (!isIntentionalDisconnectRef.current) {
             // Very specific connection errors might be retryable
             attemptReconnect();
          } else {
             setStatus(s => ({ ...s, isConnected: false, isConnecting: false, error: "Connection Failed. " + (err.message || "") }));
          }
      });

    } catch (error: any) {
      console.error("Failed to connect", error);
      setStatus(s => ({ ...s, isConnecting: false, error: error.message }));
      sessionRef.current = null;
      if (!isIntentionalDisconnectRef.current) {
          attemptReconnect();
      }
    }
  }, []);

  // Helper to allow recursive calls via ref
  useEffect(() => {
      connectRef.current = connect;
  }, [connect]);

  const attemptReconnect = () => {
      if (reconnectAttemptRef.current < MAX_RETRIES) {
          reconnectAttemptRef.current += 1;
          const delay = Math.min(1000 * (2 ** (reconnectAttemptRef.current - 1)), 5000); // Exponential backoff: 1s, 2s, 4s
          
          console.log(`Attempting reconnect ${reconnectAttemptRef.current}/${MAX_RETRIES} in ${delay}ms`);
          
          setStatus(s => ({ 
              ...s, 
              isReconnecting: true, 
              error: `Connection lost. Retrying (${reconnectAttemptRef.current}/${MAX_RETRIES})...` 
          }));
          
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          
          retryTimeoutRef.current = setTimeout(() => {
              if (connectRef.current) connectRef.current();
          }, delay);
      } else {
          setStatus(s => ({ 
              ...s, 
              isReconnecting: false, 
              error: "Connection failed after multiple attempts. Please check your network and try again." 
          }));
          reconnectAttemptRef.current = 0;
      }
  };

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    reconnectAttemptRef.current = 0;

    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
          if(session.close) session.close();
      }).catch(() => {}); // Ignore close errors
    }
    
    sessionRef.current = null;
    
    if (sourceRef.current) sourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();

    setStatus({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
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
              if (typeof session.send === 'function') {
                  try {
                      session.send({ 
                          clientContent: { 
                              turns: [{ role: 'user', parts: [{ text }] }], 
                              turnComplete: true 
                          } 
                      });
                  } catch (e) {
                      console.warn("Failed to send text", e);
                  }
              }
          }).catch(() => {});
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