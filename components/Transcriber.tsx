import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mic, Square, FileText, Loader2, Copy, Check } from 'lucide-react';
import { blobToBase64 } from '../utils/audioUtils';

interface TranscriberProps {
  onBack: () => void;
}

const Transcriber: React.FC<TranscriberProps> = ({ onBack }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Use webm/wav depending on browser support, Gemini handles most
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTranscription(''); 
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
        const base64Data = await blobToBase64(blob);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Sending audio part + prompt
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: blob.type || 'audio/webm',
                            data: base64Data
                        }
                    },
                    { text: "Transcribe this audio exactly as it is spoken." }
                ]
            }
        });

        setTranscription(response.text || "No speech detected.");

    } catch (error) {
        console.error("Transcription error:", error);
        setTranscription("Error during transcription.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
          Audio Transcriber
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center gap-8 max-w-3xl mx-auto w-full">
        
        {/* Recording Controls */}
        <div className="relative">
             <div className={`absolute inset-0 bg-pink-500 rounded-full blur-xl opacity-20 ${isRecording ? 'animate-pulse' : 'hidden'}`}></div>
             {!isRecording ? (
                 <button 
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="relative z-10 w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center hover:border-pink-500 hover:text-pink-400 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
                 >
                    <Mic size={32} className="group-hover:scale-110 transition-transform" />
                 </button>
             ) : (
                 <button 
                    onClick={stopRecording}
                    className="relative z-10 w-24 h-24 rounded-full bg-pink-600 border-4 border-pink-400 flex items-center justify-center text-white hover:bg-pink-700 transition-all shadow-xl animate-pulse"
                 >
                    <Square size={32} fill="currentColor" />
                 </button>
             )}
        </div>
        
        <div className="text-slate-400 font-medium">
            {isRecording ? "Recording... Tap to stop" : isProcessing ? "Processing Audio..." : "Tap microphone to start recording"}
        </div>

        {/* Output Area */}
        <div className="w-full flex-1 bg-slate-800/50 rounded-2xl border border-slate-700 p-6 relative min-h-[300px] shadow-inner flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <FileText size={18} />
                    <span className="text-sm font-semibold uppercase tracking-wider">Transcription Output</span>
                </div>
                {transcription && (
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy Text"}
                    </button>
                )}
            </div>

            {isProcessing ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <Loader2 size={32} className="animate-spin text-pink-500" />
                    <p>Transcribing your audio with Gemini Flash...</p>
                </div>
            ) : transcription ? (
                <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-slate-200 leading-relaxed text-lg">
                    {transcription}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 italic">
                    Ready to transcribe. Record something to see text here.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Transcriber;
