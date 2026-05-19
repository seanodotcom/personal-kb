'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Send, MicOff, Loader2, Sparkles } from 'lucide-react';
import { addThought, getThoughts } from '@/lib/actions';
import type { Thought } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ClientHomeProps {
  initialThoughts: Thought[];
}

export default function ClientHome({ initialThoughts }: ClientHomeProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>(initialThoughts);
  const [recognition, setRecognition] = useState<any>(null);
  const [isSecure, setIsSecure] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Sync state with server-revalidated props
  useEffect(() => {
    setThoughts(initialThoughts);
  }, [initialThoughts]);

  // Connect to Server-Sent Events stream for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/thoughts/stream');

    eventSource.onmessage = (event) => {
      try {
        const latest = JSON.parse(event.data);
        setThoughts(latest);
      } catch (err) {
        console.error('Failed to parse stream data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Connection error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isHttps = window.location.protocol === 'https:';
      const secure = window.isSecureContext !== undefined ? window.isSecureContext : (isHttps || isLocal);
      setIsSecure(secure);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentTranscript += transcript + ' ';
            } else {
              currentTranscript += transcript;
            }
          }
          
          setText((prev) => {
             return currentTranscript || prev;
          });
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
    } else {
      setText(''); // Clear input for new dictation
      recognition?.start();
      setIsRecording(true);
    }
  };

  const handleSave = async () => {
    if (!text.trim() || isSaving) return;

    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
    }

    setIsSaving(true);
    const result = await addThought(text, isRecording ? 'voice' : 'text');
    
    if (result.success) {
      setText('');
      router.refresh();
      try {
        const latest = await getThoughts();
        setThoughts(latest);
      } catch (err) {
        console.error('Failed to get thoughts after save:', err);
      }
    } else {
      alert('Failed to save: ' + result.error);
    }
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <main className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 shadow-2xl">
      {/* Background Decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="flex-none p-6 pt-10 pb-4 z-10">
        <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Capture
        </h1>
        <p className="text-slate-400 text-sm mt-1">What's on your mind?</p>
      </header>

      {/* Main Input Area */}
      <div className="flex-1 flex flex-col p-6 pt-2 z-10">
        <div className="relative flex-1 flex flex-col group">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-300 group-focus-within:bg-white/10 group-focus-within:border-indigo-500/50 pointer-events-none" />
          
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type or dictate your thought..."
            className="relative z-10 flex-1 w-full bg-transparent resize-none p-6 text-xl text-white placeholder-slate-500 focus:outline-none focus:ring-0 leading-relaxed no-scrollbar"
          />

          {/* Action Bar */}
          <div className="relative z-10 p-4 flex items-center justify-between border-t border-white/10">
            {recognition ? (
              <button
                onMouseDown={(e) => { e.preventDefault(); toggleRecording(); }}
                onTouchStart={(e) => { e.preventDefault(); toggleRecording(); }}
                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse-fast' 
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            ) : (
              <div className="text-xs text-slate-500">
                {!isSecure ? 'Voice requires HTTPS' : 'Speech API not supported'}
              </div>
            )}

            {isRecording && (
              <div className="flex items-center gap-1 mx-4 flex-1 justify-center">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-indigo-400 rounded-full animate-wave"
                    style={{ height: '24px', animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}

            <button
              onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
              onTouchStart={(e) => { e.preventDefault(); handleSave(); }}
              disabled={!text.trim() || isSaving}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500 text-white transition-all duration-300 disabled:opacity-50 disabled:bg-white/10 disabled:text-slate-500 hover:bg-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Thoughts Drawer */}
      {!isFocused && !isRecording && (
        <div className="flex-none max-h-[40dvh] bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 overflow-hidden flex flex-col z-20 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          <div className="flex-none p-4 pb-2">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
            <h2 className="text-sm font-medium text-slate-400 px-2">Recent Thoughts</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3 no-scrollbar">
            {thoughts.length === 0 ? (
              <p className="text-slate-500 text-center text-sm py-8">No thoughts yet.</p>
            ) : (
              thoughts.map((thought) => (
                <div key={thought.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{thought.content}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      {thought.source === 'voice' ? <Mic className="w-3 h-3" /> : null}
                      {formatDistanceToNow(thought.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
