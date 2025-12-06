import React, { useState } from 'react';
import { AppMode } from './types';
import { Mic, Search, Zap, FileAudio, Megaphone } from 'lucide-react';
import LiveConversation from './components/LiveConversation';
import SmartSearch from './components/SmartSearch';
import FastChat from './components/FastChat';
import Transcriber from './components/Transcriber';
import TextToSpeech from './components/TextToSpeech';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE_CONVERSATION:
        return <LiveConversation onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.SMART_SEARCH:
        return <SmartSearch onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.FAST_CHAT:
        return <FastChat onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.TRANSCRIBER:
        return <Transcriber onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.TEXT_TO_SPEECH:
        return <TextToSpeech onBack={() => setMode(AppMode.DASHBOARD)} />;
      case AppMode.DASHBOARD:
      default:
        return (
          <div className="min-h-screen bg-slate-900 text-white p-8">
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4 tracking-tight">
                    Manifeztorz
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Your all-in-one AI reality suite. Converse, search, create, and transcribe with the power of Gemini 2.5.
                </p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {/* Live Conversation Card */}
                <button 
                    onClick={() => setMode(AppMode.LIVE_CONVERSATION)}
                    className="group relative p-8 rounded-3xl bg-slate-800 border border-slate-700 hover:border-purple-500/50 transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] text-left flex flex-col gap-4 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Mic size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                        <Mic size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Live Conversation</h3>
                        <p className="text-slate-400 text-sm">Real-time voice chat with Gemini Live API.</p>
                    </div>
                </button>

                {/* Smart Search Card */}
                <button 
                    onClick={() => setMode(AppMode.SMART_SEARCH)}
                    className="group relative p-8 rounded-3xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] text-left flex flex-col gap-4 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Search size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                        <Search size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Smart Search</h3>
                        <p className="text-slate-400 text-sm">Grounded answers with Google Search data.</p>
                    </div>
                </button>

                {/* Fast Chat Card */}
                <button 
                    onClick={() => setMode(AppMode.FAST_CHAT)}
                    className="group relative p-8 rounded-3xl bg-slate-800 border border-slate-700 hover:border-yellow-500/50 transition-all hover:shadow-[0_0_30px_rgba(234,179,8,0.2)] text-left flex flex-col gap-4 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-2">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Fast Chat</h3>
                        <p className="text-slate-400 text-sm">Low-latency text responses using Flash Lite.</p>
                    </div>
                </button>

                {/* Transcriber Card */}
                <button 
                    onClick={() => setMode(AppMode.TRANSCRIBER)}
                    className="group relative p-8 rounded-3xl bg-slate-800 border border-slate-700 hover:border-pink-500/50 transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] text-left flex flex-col gap-4 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileAudio size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-2">
                        <FileAudio size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Audio Transcriber</h3>
                        <p className="text-slate-400 text-sm">Convert microphone audio to text instantly.</p>
                    </div>
                </button>

                {/* TTS Card */}
                <button 
                    onClick={() => setMode(AppMode.TEXT_TO_SPEECH)}
                    className="group relative p-8 rounded-3xl bg-slate-800 border border-slate-700 hover:border-orange-500/50 transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] text-left flex flex-col gap-4 overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Megaphone size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-2">
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Text-to-Speech</h3>
                        <p className="text-slate-400 text-sm">Generate lifelike speech with new TTS models.</p>
                    </div>
                </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 h-screen flex flex-col">
        {renderContent()}
    </div>
  );
};

export default App;
