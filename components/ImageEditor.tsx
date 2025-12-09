import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ImagePlus, Wand2, Download, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { blobToBase64 } from '../utils/audioUtils';

interface ImageEditorProps {
  onBack: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ onBack }) => {
  const [prompt, setPrompt] = useState('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string>('image/jpeg');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await blobToBase64(file);
        setOriginalImage(base64);
        setOriginalMimeType(file.type);
        setGeneratedImage(null); // Reset previous result
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to load image.");
      }
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !prompt.trim()) return;

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: originalImage,
                mimeType: originalMimeType
              }
            },
            { text: prompt }
          ]
        }
      });

      // Find the image part in the response
      let imageFound = false;
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
            imageFound = true;
            break;
          }
        }
      }

      if (!imageFound) {
         // Fallback to checking text if the model refused or returned text only
         const textPart = candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
         if (textPart) {
             alert(`The model returned a text response instead of an image: ${textPart}`);
         } else {
             alert("No image was generated. Please try a different prompt.");
         }
      }

    } catch (error) {
      console.error("Image generation error:", error);
      alert("Failed to process image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setPrompt('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          &larr; Back to Dashboard
        </button>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400">
          AI Image Editor (Flash Image)
        </h2>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Input */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg flex-1 flex flex-col">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                     <Upload size={18} /> Source Image
                 </h3>
                 {originalImage && (
                     <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                         <X size={14} /> Clear
                     </button>
                 )}
             </div>

             <div className="flex-1 bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-teal-500/50 transition-colors">
                 {!originalImage ? (
                     <label className="cursor-pointer flex flex-col items-center p-8 w-full h-full justify-center">
                         <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <ImagePlus size={32} className="text-slate-500 group-hover:text-teal-400" />
                         </div>
                         <span className="text-slate-400 font-medium">Click to upload image</span>
                         <span className="text-slate-600 text-sm mt-2">JPEG, PNG supported</span>
                         <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                         />
                     </label>
                 ) : (
                     <div className="relative w-full h-full">
                         <img 
                            src={`data:${originalMimeType};base64,${originalImage}`} 
                            alt="Original" 
                            className="w-full h-full object-contain"
                         />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 font-medium text-sm"
                              >
                                  Change Image
                              </button>
                         </div>
                     </div>
                 )}
             </div>

             <div className="mt-6">
                 <label className="block text-sm font-medium text-slate-400 mb-2">Editing Prompt</label>
                 <div className="relative">
                     <input 
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.g., 'Add a retro filter', 'Make it snowy', 'Remove the background'"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                     />
                     <button 
                        onClick={handleGenerate}
                        disabled={!originalImage || !prompt.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                     </button>
                 </div>
             </div>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="flex-1 flex flex-col">
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-300 flex items-center gap-2">
                        <ImageIcon size={18} /> Generated Result
                    </h3>
                    {generatedImage && (
                        <a 
                            href={generatedImage} 
                            download="gemini-edit.png"
                            className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Download size={14} /> Download
                        </a>
                    )}
                </div>

                <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-700 flex flex-col items-center justify-center overflow-hidden min-h-[300px]">
                    {isLoading ? (
                        <div className="text-center">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                                <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-500 animate-pulse" size={24} />
                            </div>
                            <p className="text-slate-400 animate-pulse">Gemini is reimagining your image...</p>
                        </div>
                    ) : generatedImage ? (
                        <img 
                            src={generatedImage} 
                            alt="Generated" 
                            className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500"
                        />
                    ) : (
                        <div className="text-center text-slate-600 p-8">
                            <Wand2 size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Upload an image and enter a prompt to see the magic happen.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ImageEditor;