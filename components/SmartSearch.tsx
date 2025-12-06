import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Search, Loader2, ExternalLink, Sparkles, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SmartSearchProps {
  onBack: () => void;
}

interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    }
}

const SmartSearch: React.FC<SmartSearchProps> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [detailedAnswer, setDetailedAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSummary(null);
    setDetailedAnswer(null);
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Prompt engineering to get a split response since JSON schema is not allowed with Google Search tool
      const prompt = `Question: ${query}\n\nProvide a concise summary (2-3 sentences) of the key findings first. Then, provide a comprehensive detailed answer. Separate the summary and the detailed answer with the exact string "---SPLIT---".`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "No result found.";
      const parts = text.split("---SPLIT---");

      if (parts.length > 1) {
          setSummary(parts[0].trim());
          setDetailedAnswer(parts[1].trim());
      } else {
          // Fallback if the model doesn't follow the split instruction
          setDetailedAnswer(text);
      }
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      if (chunks) {
        setSources(chunks);
      }

    } catch (error) {
      console.error(error);
      setDetailedAnswer("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
          Smart Search Grounding
        </h2>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
        <form onSubmit={handleSearch} className="relative group">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything (e.g., 'Who won the 2024 Super Bowl?')"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all"
            />
            <button 
                type="submit"
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-6">
            {summary && (
                <div className="bg-blue-900/20 rounded-2xl p-6 border border-blue-500/30 shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Sparkles size={16} /> Key Findings
                    </h3>
                    <div className="prose prose-invert max-w-none prose-p:text-blue-100 prose-p:leading-relaxed">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                </div>
            )}

            {detailedAnswer && (
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl animate-in fade-in slide-in-from-bottom-4 delay-100">
                    {summary && (
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-2">
                            <FileText size={16} /> Detailed Answer
                        </h3>
                    )}
                    <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-blue-400">
                        <ReactMarkdown>{detailedAnswer}</ReactMarkdown>
                    </div>
                </div>
            )}

            {sources.length > 0 && (
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Search size={14} /> Sources
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sources.map((chunk, idx) => chunk.web ? (
                            <a 
                                key={idx} 
                                href={chunk.web.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
                            >
                                <span className="text-sm text-slate-300 truncate font-medium">{chunk.web.title}</span>
                                <ExternalLink size={14} className="text-slate-500 group-hover:text-blue-400" />
                            </a>
                        ) : null)}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SmartSearch;