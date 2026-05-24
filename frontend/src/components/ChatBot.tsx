'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useChatStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchAPI } from '@/lib/utils';
import { MessageCircle, X, Send, Loader2, GripHorizontal, Mic, MicOff, Volume2, VolumeX, ChevronDown, User, UserRound, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface VoiceConfig {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  rate: number;
  pitch: number;
  volume: number;
  lang: string;
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const VOICES: VoiceConfig[] = [
  { id: 'sophie', name: 'Sophie', gender: 'female', rate: 0.82, pitch: 0.95, volume: 0.8, lang: 'en' },
  { id: 'emma', name: 'Emma', gender: 'female', rate: 0.85, pitch: 0.9, volume: 0.82, lang: 'en' },
  { id: 'nina', name: 'Nina', gender: 'female', rate: 0.88, pitch: 0.92, volume: 0.78, lang: 'en' },
  { id: 'luna', name: 'Luna', gender: 'female', rate: 0.8, pitch: 0.88, volume: 0.75, lang: 'en' },
  { id: 'james', name: 'James', gender: 'male', rate: 0.85, pitch: 0.85, volume: 0.8, lang: 'en' },
  { id: 'alex', name: 'Alex', gender: 'male', rate: 0.88, pitch: 0.9, volume: 0.82, lang: 'en' },
  { id: 'henry', name: 'Henry', gender: 'male', rate: 0.82, pitch: 0.82, volume: 0.78, lang: 'en' },
  { id: 'marcus', name: 'Marcus', gender: 'male', rate: 0.85, pitch: 0.88, volume: 0.8, lang: 'en' },
  { id: 'priya', name: 'Priya', gender: 'female', rate: 0.82, pitch: 0.95, volume: 0.8, lang: 'hi' },
  { id: 'ami', name: 'Ami', gender: 'female', rate: 0.85, pitch: 0.92, volume: 0.78, lang: 'hi' },
  { id: 'rahul', name: 'Rahul', gender: 'male', rate: 0.85, pitch: 0.88, volume: 0.8, lang: 'hi' },
  { id: 'vikram', name: 'Vikram', gender: 'male', rate: 0.82, pitch: 0.85, volume: 0.78, lang: 'hi' },
  { id: 'claire', name: 'Claire', gender: 'female', rate: 0.82, pitch: 0.95, volume: 0.8, lang: 'fr' },
  { id: 'celine', name: 'Celine', gender: 'female', rate: 0.85, pitch: 0.92, volume: 0.78, lang: 'fr' },
  { id: 'pierre', name: 'Pierre', gender: 'male', rate: 0.85, pitch: 0.88, volume: 0.8, lang: 'fr' },
  { id: 'antoine', name: 'Antoine', gender: 'male', rate: 0.82, pitch: 0.85, volume: 0.78, lang: 'fr' },
  { id: 'anna', name: 'Anna', gender: 'female', rate: 0.82, pitch: 0.95, volume: 0.8, lang: 'ru' },
  { id: 'elena', name: 'Elena', gender: 'female', rate: 0.85, pitch: 0.92, volume: 0.78, lang: 'ru' },
  { id: 'alexandr', name: 'Alexandr', gender: 'male', rate: 0.85, pitch: 0.88, volume: 0.8, lang: 'ru' },
  { id: 'dmitri', name: 'Dmitri', gender: 'male', rate: 0.82, pitch: 0.85, volume: 0.78, lang: 'ru' },
];

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

export function ChatBot() {
  const { isOpen, messages, toggleChat, addMessage } = useChatStore();
  const { isAuthenticated, user } = useAuthStore();
  const pathname = usePathname();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      setSpeechSupported(hasSpeech);
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if (isOpen && window.innerWidth < 768) toggleChat();
  }, [pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const getVoicesByLang = (langCode: string) => {
    return VOICES.filter(v => v.lang === langCode);
  };

  const getMatchingVoice = (voiceConfig: VoiceConfig): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;
    
    const langMap: Record<string, string[]> = {
      'en': ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en'],
      'hi': ['hi-IN', 'hi'],
      'fr': ['fr-FR', 'fr-CA', 'fr'],
      'ru': ['ru-RU', 'ru']
    };
    
    const langs = langMap[voiceConfig.lang] || [voiceConfig.lang];
    
    const preferredNames: Record<string, string[]> = {
      'sophie': ['Sophie', 'sophie'],
      'emma': ['Emma', 'emma'],
      'nina': ['Nina', 'nina'],
      'luna': ['Luna', 'luna'],
      'james': ['James', 'james'],
      'alex': ['Alex', 'alex'],
      'henry': ['Henry', 'henry'],
      'marcus': ['Marcus', 'marcus'],
      'priya': ['Priya', 'priya'],
      'ami': ['Ami', 'ami'],
      'rahul': ['Rahul', 'rahul'],
      'vikram': ['Vikram', 'vikram'],
      'claire': ['Claire', 'claire'],
      'celine': ['Celine', 'celine'],
      'pierre': ['Pierre', 'pierre'],
      'antoine': ['Antoine', 'antoine'],
      'anna': ['Anna', 'anna'],
      'elena': ['Elena', 'elena'],
      'alexandr': ['Alexandr', 'alexandr'],
      'dmitri': ['Dmitri', 'dmitri']
    };
    
    const names = preferredNames[voiceConfig.id] || [voiceConfig.name];
    
    for (const lang of langs) {
      for (const name of names) {
        const voice = availableVoices.find(v => 
          v.lang.startsWith(lang.split('-')[0]) && 
          (v.name.toLowerCase().includes(name.toLowerCase()) || 
           v.voiceURI.toLowerCase().includes(name.toLowerCase()))
        );
        if (voice) return voice;
      }
    }
    
    const fallbackVoice = availableVoices.find(v => 
      v.lang.startsWith(langs[0].split('-')[0])
    );
    return fallbackVoice || availableVoices[0];
  };

  const getCurrentVoice = (): VoiceConfig => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('caresphere_voice');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.lang === selectedLang) {
          return VOICES.find(v => v.id === parsed.id) || VOICES[0];
        }
      }
    }
    return getVoicesByLang(selectedLang)[0] || VOICES[0];
  };

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error('Voice not supported. Use Chrome or Edge.', { icon: '🎙️' });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'fr' ? 'fr-FR' : selectedLang === 'ru' ? 'ru-RU' : 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
      toast.success('Voice captured!', { icon: '✅' });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Mic blocked! Allow mic in browser settings.', { icon: '🔒', duration: 5000 });
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected. Please try again.', { icon: '🤫' });
      } else if (event.error === 'network') {
        toast.error('Network error. Voice needs internet.', { icon: '📡' });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      toast.success('Listening... Speak now!', { icon: '🎙️' });
    } catch {
      toast.error('Could not start voice. Try typing.', { icon: '❌' });
    }
  }, [isListening, speechSupported, selectedLang]);

  const speakText = (text: string) => {
    if (!speakEnabled || !text) return;
    
    window.speechSynthesis.cancel();
    
    const currentVoiceConfig = getCurrentVoice();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = currentVoiceConfig.rate;
    utterance.pitch = currentVoiceConfig.pitch;
    utterance.volume = currentVoiceConfig.volume;
    
    const matchedVoice = getMatchingVoice(currentVoiceConfig);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    }
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in this browser.');
      return;
    }
    if (speakEnabled) {
      window.speechSynthesis.cancel();
    }
    setSpeakEnabled(!speakEnabled);
    toast.success(speakEnabled ? 'Voice output disabled' : 'Voice output enabled', { icon: speakEnabled ? '🔇' : '🔊' });
  };

  const selectVoice = (voice: VoiceConfig) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('caresphere_voice', JSON.stringify({ id: voice.id, lang: voice.lang }));
    }
    setShowVoicePanel(false);
    toast.success(`Voice changed to ${voice.name}`, { icon: '🎤' });
  };

  const selectLanguage = (langCode: string) => {
    setSelectedLang(langCode);
    const langVoices = getVoicesByLang(langCode);
    if (langVoices.length > 0 && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('caresphere_voice', JSON.stringify({ id: langVoices[0].id, lang: langCode }));
    }
    toast.success(`Language changed to ${LANGUAGES.find(l => l.code === langCode)?.name}`, { icon: '🌐' });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await fetchAPI('/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: userMessage, 
          history,
          context: { page: pathname, isAuthenticated, role: user?.role || 'GUEST' },
          language: selectedLang
        }),
      });
      
      const reply = data.reply || 'Hello from CareSphere!';
      addMessage({ role: 'assistant', content: reply });
      
      if (speakEnabled) {
        setTimeout(() => speakText(reply), 300);
      }
    } catch {
      addMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const currentVoice = getCurrentVoice();

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-2xl hover:ring-4 ring-primary/50 transition-all z-50"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%, color-mix(in srgb, var(--primary) 50%, purple))' }}
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            drag
            dragConstraints={{ left: -1000, right: 20, top: -800, bottom: 20 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div 
              className="p-4 cursor-move flex justify-between items-center shadow-md relative"
              style={{ 
                background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, purple) 100%)'
              }}
            >
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <GripHorizontal className="h-4 w-4 opacity-50" /> 
                  CareSphere AI
                </h3>
                <p className="text-xs text-white/80 font-medium ml-6">Voice-enabled Assistant</p>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`text-white hover:bg-white/20 h-8 w-8 rounded-full ${speakEnabled ? 'bg-white/20' : ''}`}
                  onClick={toggleSpeak}
                  title={speakEnabled ? 'Disable voice output' : 'Enable voice output'}
                >
                  {speakEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
                {speakEnabled && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`text-white hover:bg-white/20 h-8 w-8 rounded-full ${showVoicePanel ? 'bg-white/20' : ''}`}
                    onClick={() => setShowVoicePanel(!showVoicePanel)}
                    title="Voice settings"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 h-8 w-8 rounded-full" 
                  onClick={toggleChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {speakEnabled && showVoicePanel && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-4 right-4 top-full mt-2 p-4 rounded-xl shadow-xl z-50"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Language</p>
                      <div className="flex gap-2 flex-wrap">
                        {LANGUAGES.map(lang => (
                          <Button
                            key={lang.code}
                            variant={selectedLang === lang.code ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => selectLanguage(lang.code)}
                            className={`text-xs h-7 ${selectedLang === lang.code ? '' : 'opacity-70'}`}
                          >
                            {lang.flag} {lang.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                        Female Voices ({getVoicesByLang(selectedLang).filter(v => v.gender === 'female').length})
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {getVoicesByLang(selectedLang).filter(v => v.gender === 'female').map(voice => (
                          <Button
                            key={voice.id}
                            variant={currentVoice.id === voice.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => selectVoice(voice)}
                            className={`text-xs h-7 ${currentVoice.id === voice.id ? '' : 'opacity-70'}`}
                          >
                            <User className="h-3 w-3 mr-1" /> {voice.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>
                        Male Voices ({getVoicesByLang(selectedLang).filter(v => v.gender === 'male').length})
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {getVoicesByLang(selectedLang).filter(v => v.gender === 'male').map(voice => (
                          <Button
                            key={voice.id}
                            variant={currentVoice.id === voice.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => selectVoice(voice)}
                            className={`text-xs h-7 ${currentVoice.id === voice.id ? '' : 'opacity-70'}`}
                          >
                            <UserRound className="h-3 w-3 mr-1" /> {voice.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Current: <span className="font-medium">{currentVoice.name}</span> ({currentVoice.gender}) • {LANGUAGES.find(l => l.code === selectedLang)?.name}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4 font-medium text-sm"
              style={{ backgroundColor: 'var(--background)' }}
            >
              {messages.length === 0 && (
                <div className="text-center py-10" style={{ color: 'var(--muted-foreground)' }}>
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <MessageCircle className="h-14 w-14 mx-auto mb-4" style={{ color: 'var(--primary)', opacity: 0.5 }} />
                  </motion.div>
                  <p>Welcome to <strong>CareSphere</strong>!</p>
                  <p className="text-xs mt-2 opacity-70">Type or use voice to ask anything.</p>
                  {speakEnabled && (
                    <p className="text-xs mt-1 opacity-50">
                      Voice: {currentVoice.name} • {LANGUAGES.find(l => l.code === selectedLang)?.name}
                    </p>
                  )}
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm"
                    style={msg.role === 'user' ? {
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-foreground)'
                    } : {
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--secondary-foreground)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div 
                    className="rounded-2xl px-4 py-3 shadow-sm"
                    style={{ 
                      backgroundColor: 'var(--secondary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div 
              className="p-4 border-t"
              style={{ 
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)'
              }}
            >
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                <Input 
                  placeholder={isListening ? "Listening..." : "Message CareSphere..."} 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  disabled={loading}
                  className="rounded-full"
                  style={{
                    backgroundColor: 'var(--muted)',
                    borderColor: 'var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                
                {speechSupported && (
                  <Button 
                    type="button" 
                    size="icon" 
                    variant={isListening ? "destructive" : "outline"}
                    onClick={toggleListening}
                    className={`rounded-full shrink-0 transition-all ${isListening ? 'animate-pulse' : ''}`}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}

                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={loading || !input.trim()}
                  className="rounded-full shrink-0 shadow-md"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
