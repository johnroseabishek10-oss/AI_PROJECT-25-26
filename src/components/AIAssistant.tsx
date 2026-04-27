import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLocalServiceInfo } from '../services/aiService';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  groundingChunks?: any[];
}

export default function AIAssistant({ userLocation }: { userLocation?: { lat: number, lng: number } | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your FixIt AI assistant. I can help you find the best local services and answer your repair questions. How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const location = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined;
      const result = await getLocalServiceInfo(userMsg, location);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.text,
        groundingChunks: result.chunks
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-200 transition-all hover:scale-110 hover:bg-emerald-700 active:scale-95"
      >
        <Sparkles size={24} />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-zinc-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">FixIt AI Assistant</h3>
                  <p className="text-[10px] text-zinc-400">Powered by Google Maps Grounding</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-full p-1 transition-colors hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-zinc-100 text-zinc-800'
                  }`}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    
                    {/* Grounding Chunks */}
                    {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-zinc-200 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sources from Google Maps</p>
                        {msg.groundingChunks.map((chunk, j) => (
                          chunk.maps && (
                            <a 
                              key={j} 
                              href={chunk.maps.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg bg-white p-2 text-[10px] font-medium text-emerald-600 shadow-sm transition-all hover:bg-emerald-50"
                            >
                              <MapPin size={12} />
                              <span className="flex-1 truncate">{chunk.maps.title || 'View on Maps'}</span>
                              <ExternalLink size={10} />
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-100 p-4">
              <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 ring-1 ring-zinc-200 focus-within:ring-emerald-500/50">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="rounded-full p-2 text-emerald-600 transition-all hover:bg-emerald-50 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
