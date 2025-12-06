import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Send, Zap, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FastChatProps {
  onBack: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

const FastChat: React.FC<FastChatProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Chat Session
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatSessionRef.current = ai.chats.create({
        model: 'gemini-flash-lite-latest',
        config: {
            systemInstruction: "You are a lightning fast assistant. Keep answers brief and direct."
        }
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
        const modelMsg: Message = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: result.text || "" 
        };
        setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
        console.error(error);
        const errorMsg: Message = { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: "Sorry, I encountered an error. Please try again." 
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-yellow-400">
            <Zap size={20} className="fill-current" />
            <h2 className="font-bold">Fast Chat (Flash Lite)</h2>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4 mb-4 overflow-y-auto flex flex-col gap-4 shadow-inner">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                <Zap size={48} className="mb-4" />
                <p>Start a lightning fast conversation.</p>
            </div>
        )}
        {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-yellow-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-slate-700 text-slate-200 rounded-tl-none'
                }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
            </div>
        ))}
        {isTyping && (
             <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} />
                </div>
                <div className="bg-slate-700 text-slate-200 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="relative">
        <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 shadow-lg"
        />
        <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default FastChat;
