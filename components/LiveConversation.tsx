import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';
import { Mic, MicOff, Power, Activity, Volume2 } from 'lucide-react';

interface LiveConversationProps {
  onBack: () => void;
}

const LiveConversation: React.FC<LiveConversationProps> = ({ onBack }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Audio Context refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Playback state
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Animation frame for visualizer
  const animationFrameRef = useRef<number | null>(null);

  // Audio cues helper
  const playAudioCue = (type: 'connecting' | 'connected' | 'disconnected') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const createOsc = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'connecting') {
        // Rising tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'connected') {
        // Success chord (C5 + E5)
        createOsc(523.25, now, 0.4);
        createOsc(659.25, now, 0.4);
      } else if (type === 'disconnected') {
        // Falling tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
        console.error("Failed to play audio cue", e);
    }
  };

  const cleanupAudio = useCallback(() => {
    // Stop visualizer
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop recording
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // Stop playback
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Close session if possible (wrapper usually handles this via disconnect, but we clear ref)
    sessionPromiseRef.current = null;
    
    setIsConnected(false);
    setVolumeLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  const connectToLiveAPI = async () => {
    setError(null);
    
    try {
      // 1. Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: "You are a helpful, witty, and concise AI assistant. Keep your responses short and conversational."
        }
      };

      // 4. Connect Session
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
            onopen: () => {
                console.log("Session opened");
                setIsConnected(true);
                playAudioCue('connected');
            },
            onmessage: async (message: LiveServerMessage) => {
                // Handle Audio Output
                const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio && outputAudioContextRef.current) {
                    const ctx = outputAudioContextRef.current;
                    const audioBuffer = await decodeAudioData(
                        decode(base64Audio),
                        ctx,
                        24000,
                        1
                    );

                    // Calculate next start time for gapless playback
                    const currentTime = ctx.currentTime;
                    if (nextStartTimeRef.current < currentTime) {
                        nextStartTimeRef.current = currentTime;
                    }

                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    
                    sourcesRef.current.add(source);
                    source.onended = () => {
                        sourcesRef.current.delete(source);
                    };
                }

                // Handle Interruption
                if (message.serverContent?.interrupted) {
                    console.log("Interrupted");
                    sourcesRef.current.forEach(source => {
                        try { source.stop(); } catch (e) {}
                    });
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                }
            },
            onclose: () => {
                console.log("Session closed");
                setIsConnected(false);
            },
            onerror: (err) => {
                console.error("Session error:", err);
                setError("Connection error. Please try again.");
                cleanupAudio();
            }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

      // 5. Setup Input Processing
      const ctx = inputAudioContextRef.current;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
          if (isMuted) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Simple volume meter
          let sum = 0;
          for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
          const rms = Math.sqrt(sum / inputData.length);
          setVolumeLevel(Math.min(1, rms * 5)); // Amplify for visual

          // Send to API
          const pcmBlob = createBlob(inputData);
          sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
          });
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      
      sourceRef.current = source;
      processorRef.current = processor;

    } catch (err) {
      console.error("Setup error:", err);
      
      let errorMessage = "Failed to access microphone or connect.";
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
            errorMessage = "Microphone access denied. Please allow microphone permissions in your browser settings to use this feature.";
        } else if (err.name === 'NotFoundError' || err.message.includes('device')) {
            errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (err.name === 'NotReadableError') {
             errorMessage = "Microphone is busy or not readable. Please check if another app is using it.";
        } else {
             errorMessage = `Error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      cleanupAudio();
    }
  };

  const toggleConnection = () => {
      if (isConnected) {
          playAudioCue('disconnected');
          cleanupAudio();
      } else {
          playAudioCue('connecting');
          connectToLiveAPI();
      }
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] transition-all duration-700 ${isConnected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium uppercase tracking-wider text-slate-400">
                {isConnected ? 'Live Connected' : 'Disconnected'}
            </span>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
        {error && (
            <div className="absolute top-4 max-w-md text-center bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl text-sm mb-8 backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-top-4">
                <p className="font-semibold mb-1">Connection Failed</p>
                {error}
            </div>
        )}

        <div className="relative">
            {/* Outer Rings */}
            <div className={`absolute inset-0 border-2 border-purple-500/30 rounded-full transition-all duration-100 ${isConnected ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`} />
            <div className={`absolute inset-0 border border-purple-400/20 rounded-full transition-all duration-300 delay-75 ${isConnected ? 'scale-[2] opacity-100' : 'scale-100 opacity-0'}`} />
            
            {/* Core Circle */}
            <div 
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_50px_rgba(168,85,247,0.4)]
                ${isConnected ? 'bg-gradient-to-br from-purple-600 to-blue-600' : 'bg-slate-800 border-4 border-slate-700'}
                `}
                style={{
                    transform: isConnected ? `scale(${1 + volumeLevel * 0.5})` : 'scale(1)'
                }}
            >
                {isConnected ? (
                    <Activity size={48} className="text-white animate-pulse" />
                ) : (
                    <Power size={48} className="text-slate-500" />
                )}
            </div>
        </div>

        <p className="mt-12 text-slate-400 font-light text-lg text-center max-w-md transition-all duration-300">
            {isConnected 
                ? isMuted 
                    ? "Microphone muted" 
                    : volumeLevel > 0.05 ? "Hearing you..." : "Listening..." 
                : "Connect to start a real-time voice conversation."}
        </p>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-6 rounded-3xl flex items-center justify-center gap-8 shadow-2xl z-10 max-w-xl mx-auto w-full">
         
         {/* Mic Controls with Visual Feedback */}
         <div className="relative">
             {isConnected && !isMuted && (
                 <div 
                    className="absolute inset-0 bg-blue-500 rounded-full blur-xl transition-all duration-75 ease-out pointer-events-none"
                    style={{ 
                        transform: `scale(${1 + volumeLevel})`, 
                        opacity: Math.max(0.2, volumeLevel) 
                    }} 
                 />
             )}
             <button 
                onClick={toggleMute}
                disabled={!isConnected}
                className={`relative z-10 p-4 rounded-full transition-all border ${
                    isMuted 
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' 
                    : isConnected 
                        ? 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
             >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} className={volumeLevel > 0.1 && !isMuted ? "text-blue-300" : ""} />}
             </button>
         </div>

         <button 
            onClick={toggleConnection}
            className={`h-16 px-8 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 ${
                isConnected 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/25' 
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/25'
            }`}
         >
            {isConnected ? (
                <>End Session</>
            ) : (
                <>Start Chat <Volume2 size={20} /></>
            )}
         </button>

         <div className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-900 border border-slate-700">
             <div className="flex gap-1 items-end h-6">
                 {[1, 2, 3].map(i => (
                     <div 
                        key={i} 
                        className={`w-1.5 bg-blue-500 rounded-full transition-all duration-100`}
                        style={{ height: isConnected ? `${Math.max(20, Math.random() * 100)}%` : '20%' }}
                     />
                 ))}
             </div>
         </div>
      </div>
    </div>
  );
};

export default LiveConversation;