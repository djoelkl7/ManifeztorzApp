import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Play, Pause, Volume2, Loader2, Square, ChevronDown, RefreshCw } from 'lucide-react';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { VOICE_OPTIONS } from '../types';

interface TextToSpeechProps {
  onBack: () => void;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ onBack }) => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [isLoading, setIsLoading] = useState(false);
  
  // Playback state
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Initialize AudioContext
  useEffect(() => {
    const initAudio = () => {
        if (!audioContextRef.current) {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
    }
    initAudio();
    
    return () => {
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch(e) {}
        }
        if (audioContextRef.current?.state !== 'closed') {
            audioContextRef.current?.close();
        }
    };
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    // Stop any current playback and reset
    handleStop();
    setAudioBuffer(null);

    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice }
                }
            }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
          if (!audioContextRef.current) {
               audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          const buffer = await decodeAudioData(
              decode(base64Audio),
              ctx,
              24000,
              1
          );
          setAudioBuffer(buffer);
          // Auto-play on generation is often expected, but we can let user click play. 
          // Let's reset offset to 0 ready for play.
          pausedAtRef.current = 0;
      } else {
        alert("No audio data received.");
      }

    } catch (error) {
      console.error("TTS Error:", error);
      alert("Failed to generate speech. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
      if (!audioBuffer || !audioContextRef.current) return;
      const ctx = audioContextRef.current;

      // Create new source
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Calculate start time
      const offset = pausedAtRef.current;
      // Protect against out of bounds
      if (offset >= audioBuffer.duration) {
          pausedAtRef.current = 0;
      }
      
      const safeOffset = pausedAtRef.current >= audioBuffer.duration ? 0 : pausedAtRef.current;

      source.start(0, safeOffset);
      startedAtRef.current = ctx.currentTime - safeOffset;

      // Handle natural finish
      source.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
          pausedAtRef.current = 0;
      };

      sourceRef.current = source;
      setIsPlaying(true);
      setIsPaused(false);
  };

  const handlePause = () => {
      if (!sourceRef.current || !audioContextRef.current) return;
      
      // Prevent onended from resetting state to "stopped"
      sourceRef.current.onended = null;
      try {
          sourceRef.current.stop();
      } catch(e) {}
      
      // Calculate elapsed time
      pausedAtRef.current = audioContextRef.current.currentTime - startedAtRef.current;
      
      setIsPlaying(false);
      setIsPaused(true);
  };

  const handleStop = () => {
      if (sourceRef.current) {
          sourceRef.current.onended = null;
          try { sourceRef.current.stop(); } catch(e) {}
          sourceRef.current = null;
      }
      pausedAtRef.current = 0;
      setIsPlaying(false);
      setIsPaused(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
          Text to Speech Studio
        </h2>
      </div>

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-6">
        
        {/* Input Card */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select Voice</label>
                    <div className="relative">
                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full appearance-none bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer"
                        >
                            {VOICE_OPTIONS.map((voice) => (
                                <option key={voice.value} value={voice.value}>
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>
            </div>

            <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to speak..."
                className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-6"
            />

            <div className="flex items-center justify-end gap-4">
                 <button 
                    onClick={handleGenerate}
                    disabled={!text.trim() || isLoading}
                    className={`flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (audioBuffer ? <RefreshCw size={20} /> : <Volume2 size={20} />)}
                    {isLoading ? "Generating..." : (audioBuffer ? "Regenerate" : "Generate Speech")}
                </button>
            </div>
        </div>

        {/* Playback Controls Area */}
        {audioBuffer && (
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-6 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-6">
                    {isPlaying ? (
                        <button 
                            onClick={handlePause}
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 transition-all shadow-lg"
                        >
                            <Pause size={28} fill="currentColor" />
                        </button>
                    ) : (
                        <button 
                            onClick={handlePlay}
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-400 hover:scale-105 transition-all shadow-lg pl-1"
                        >
                            <Play size={28} fill="currentColor" />
                        </button>
                    )}
                    
                    <button 
                        onClick={handleStop}
                        disabled={!isPlaying && !isPaused}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Square size={20} fill="currentColor" />
                    </button>
                </div>

                <div className="flex-1 ml-8 mr-8">
                     {/* Simple visualizer bars */}
                     <div className="flex items-center justify-center gap-1 h-12">
                         {[...Array(20)].map((_, i) => (
                             <div 
                                key={i}
                                className={`w-1.5 rounded-full bg-orange-500/50 transition-all duration-150`}
                                style={{
                                    height: isPlaying ? `${20 + Math.random() * 80}%` : '20%',
                                    opacity: isPlaying ? 1 : 0.3
                                }}
                             />
                         ))}
                     </div>
                </div>

                <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Duration</div>
                    <div className="text-xl font-mono text-white">
                        {audioBuffer.duration.toFixed(1)}s
                    </div>
                </div>
            </div>
        )}
        
        {!audioBuffer && !isLoading && (
             <div className="flex items-center justify-center p-8 text-slate-500">
                <span className="text-sm">Enter text and generate speech to enable playback controls.</span>
             </div>
        )}
      </div>
    </div>
  );
};

export default TextToSpeech;