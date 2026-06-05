import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaRobot, FaTimes, FaCommentDots, FaMicrophone, FaStopCircle, FaPaperPlane } from 'react-icons/fa';
import './styles/RecruiterChatbot.css';

// ── Types ──────────────────────────────────────────────────────────────
type Message = { role: 'user' | 'assistant'; content: string };

type APIResponse = {
  answer: string;
  speakable?: string;
  intent?: string;
  suggestions?: string[];
  source?: string;
  error?: string;
};

// ── Default suggestions ────────────────────────────────────────────────
const DEFAULT_SUGGESTIONS: string[] = [
  'Tell me about yourself',
  'What is your expected CTC?',
  'What is your notice period?',
  'Have you hired SOC Analysts?',
  'Is Shashank suitable for this role?',
  'Are you open to remote or hybrid?',
];

// ── Session greeting constants ─────────────────────────────────────────
const SK_WELCOME = 'portfolioWelcomeSpoken';
const SK_CHATBOT = 'chatbotGreetingSpoken';
const WELCOME_TEXT = "Welcome to Shashank Dwivedi's portfolio. I hope you're doing great. Feel free to explore my work, experience, and AI assistant.";
const CHATBOT_GREETING = "Hi! I'm Shashank's AI Assistant. How can I help you today?";

// ── SpeechRecognition types ────────────────────────────────────────────
type SpeechRecognitionEvent = { results: SpeechRecognitionResultList };
type SpeechRecognitionErrorEvent = { error: string };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
interface SpeechSynthesisWindow {
  SpeechRecognition: SpeechRecognitionConstructor;
  webkitSpeechRecognition: SpeechRecognitionConstructor;
  speechSynthesis: SpeechSynthesis;
}
const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
  (window as unknown as SpeechSynthesisWindow).SpeechRecognition ||
  (window as unknown as SpeechSynthesisWindow).webkitSpeechRecognition;

// ══════════════════════════════════════════════════════════════════════
// CLEAN TEXT FOR SPEECH — strip everything that sounds bad when read aloud
// ══════════════════════════════════════════════════════════════════════
function cleanTextForSpeech(text: string): string {
  return text
    // Strip markdown bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Strip headers
    .replace(/#{1,6}\s+/g, '')
    // Strip code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // Strip URLs
    .replace(/https?:\/\/[^\s]+/g, '')
    // Strip table rows
    .replace(/\|[^\n]+\|/g, '')
    // Strip markdown list bullets
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Strip intent labels and debug labels
    .replace(/\b(PROFILE_INTENT|CAREER_INTENT|JD_INTENT|GENERAL_INTENT|MIXED_INTENT|WRITING_INTENT)\b/g, '')
    .replace(/\bsource:\s*(knowledge_base|ai|fallback)\b/gi, '')
    // Strip emojis
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Strip special characters except sentence punctuation
    .replace(/[#@$%^&*[\]{}\\<>~`]/g, '')
    // Strip forward slashes used as separators
    .replace(/\s\/\s/g, ', ')
    // Collapse multiple spaces and newlines
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    // Strip trailing/leading whitespace
    .trim();
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════
const RecruiterChatbot: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  // Session memory
  const usedQuestionsRef = useRef<Set<string>>(new Set());
  const sessionIntentRef = useRef<string>('PROFILE');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechCancelRef = useRef<boolean>(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const finalTranscriptSentRef = useRef<boolean>(false);
  const handleSendRef = useRef<((text: string) => void) | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  // Greeting refs
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingFiredRef = useRef<boolean>(false);

  // ── Load history ──────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('shashank_chat_history');
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // ── Persist + scroll ──────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('shashank_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load TTS voices once ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const pickVoice = () => {
      const all = window.speechSynthesis.getVoices();
      voicesRef.current = all;
      // Prefer a natural-sounding English voice
      const preferred = [
        'Google UK English Female', 'Google UK English Male',
        'Google US English', 'Microsoft Zira', 'Microsoft David',
        'Samantha', 'Karen', 'Daniel',
      ];
      let picked: SpeechSynthesisVoice | undefined;
      for (const name of preferred) {
        picked = all.find(v => v.name === name);
        if (picked) break;
      }
      if (!picked) picked = all.find(v => v.lang.startsWith('en-'));
      selectedVoiceRef.current = picked;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }, []);

  // ── Dispatch ai-speaking event ────────────────────────────────────
  const dispatchSpeaking = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
    window.dispatchEvent(new CustomEvent('ai-speaking', { detail: speaking }));
  }, []);

  // ── Speak a single greeting utterance (no chunking) ───────────────
  // Returns true if speak() was accepted; onstart fires if audio starts.
  const speakGreeting = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    const clean = cleanTextForSpeech(text);
    if (!clean) return;
    speechCancelRef.current = false;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'en-US';
    utt.rate = 1.08;
    utt.pitch = 1.00;
    utt.volume = 1.0;
    if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;
    utt.onstart = () => { if (!speechCancelRef.current) dispatchSpeaking(true); };
    utt.onend   = () => { dispatchSpeaking(false); };
    utt.onerror = () => { dispatchSpeaking(false); };
    window.speechSynthesis.speak(utt);
  }, [dispatchSpeaking]);

  // ── Welcome greeting — once per browser session ───────────────────
  useEffect(() => {
    if (sessionStorage.getItem(SK_WELCOME)) return;
    if (!window.speechSynthesis) return;

    const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'] as const;
    let interactionBound = false;

    const removeInteractionListeners = () => {
      interactionEvents.forEach(ev => document.removeEventListener(ev, onFirstInteraction));
    };

    const doWelcome = () => {
      if (greetingFiredRef.current || sessionStorage.getItem(SK_WELCOME)) return;
      greetingFiredRef.current = true;
      sessionStorage.setItem(SK_WELCOME, 'true');
      removeInteractionListeners();
      speakGreeting(WELCOME_TEXT);
    };

    const onFirstInteraction = () => {
      removeInteractionListeners();
      doWelcome();
    };

    const bindInteractionListeners = () => {
      if (interactionBound) return;
      interactionBound = true;
      interactionEvents.forEach(ev =>
        document.addEventListener(ev, onFirstInteraction, { passive: true })
      );
    };

    // Attempt autoplay after 1s delay
    greetingTimerRef.current = setTimeout(() => {
      if (sessionStorage.getItem(SK_WELCOME)) return;

      // Try speaking; detect if blocked by checking onstart within 2.5s
      speechCancelRef.current = false;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(cleanTextForSpeech(WELCOME_TEXT));
      utt.lang = 'en-US';
      utt.rate = 1.08;
      utt.pitch = 1.00;
      utt.volume = 1.0;
      if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;

      let startFired = false;
      utt.onstart = () => {
        if (speechCancelRef.current) { dispatchSpeaking(false); return; }
        startFired = true;
        greetingFiredRef.current = true;
        sessionStorage.setItem(SK_WELCOME, 'true');
        dispatchSpeaking(true);
      };
      utt.onend   = () => { if (startFired) dispatchSpeaking(false); };
      utt.onerror = () => { if (startFired) dispatchSpeaking(false); };
      window.speechSynthesis.speak(utt);

      // Autoplay block detection: if onstart hasn't fired in 2.5s, fall back
      greetingTimerRef.current = setTimeout(() => {
        if (!startFired && !sessionStorage.getItem(SK_WELCOME)) {
          try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
          bindInteractionListeners();
        }
      }, 2500);
    }, 1000);

    return () => {
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
      removeInteractionListeners();
    };
  }, [speakGreeting, dispatchSpeaking]);

  // ── Stop TTS immediately ──────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    speechCancelRef.current = true;
    window.speechSynthesis?.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    dispatchSpeaking(false);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening, dispatchSpeaking]);

  // ── TTS: speak cleaned text ───────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis || !text.trim()) return;

    // Clean the text before speaking
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText.trim()) return;

    // Reset state
    speechCancelRef.current = false;
    window.speechSynthesis.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // Split on sentence boundaries for chunked delivery
    const sentences = cleanedText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    let index = 0;
    const speakNext = () => {
      if (speechCancelRef.current || index >= sentences.length) {
        dispatchSpeaking(false);
        return;
      }

      const utt = new SpeechSynthesisUtterance(sentences[index]);
      utt.lang = 'en-US';
      utt.rate = 1.08;    // slightly faster than default, still natural
      utt.pitch = 1.00;   // neutral pitch
      utt.volume = 1.0;
      if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;

      // Dispatch speaking=true only when audio actually starts
      utt.onstart = () => {
        if (!speechCancelRef.current) {
          dispatchSpeaking(true);
        }
      };

      utt.onend = () => {
        if (speechCancelRef.current) {
          dispatchSpeaking(false);
          return;
        }
        index++;
        speechTimeoutRef.current = setTimeout(speakNext, 40);
      };

      utt.onerror = () => {
        if (speechCancelRef.current) {
          dispatchSpeaking(false);
          return;
        }
        index++;
        speechTimeoutRef.current = setTimeout(speakNext, 40);
      };

      window.speechSynthesis.speak(utt);
    };

    // Small delay for browser to be ready
    speechTimeoutRef.current = setTimeout(speakNext, 80);
  }, [dispatchSpeaking]);

  // ── Voice input ───────────────────────────────────────────────────
  const toggleListen = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      alert('Voice input is not supported in this browser. Please type your question.');
      return;
    }
    stopSpeaking();

    if (!recognitionRef.current) {
      const r = new SpeechRecognitionAPI();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';

      r.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results[0][0].transcript;
        setInputValue(transcript);
        if (e.results[0].isFinal && !finalTranscriptSentRef.current) {
          finalTranscriptSentRef.current = true;
          setIsListening(false);
          handleSendRef.current?.(transcript);
        }
      };
      r.onerror = (e: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
        finalTranscriptSentRef.current = false;
        if (e.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow it or use text chat.');
        }
      };
      r.onend = () => {
        setIsListening(false);
        finalTranscriptSentRef.current = false;
      };
      recognitionRef.current = r;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      finalTranscriptSentRef.current = false;
    } else if (recognitionRef.current) {
      finalTranscriptSentRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch { /* ignore duplicate start */ }
    }
  }, [isListening, stopSpeaking]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string = inputValue) => {
    const actualText = text.trim();
    if (!actualText) return;

    const userMsg: Message = { role: 'user', content: actualText };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    usedQuestionsRef.current.add(actualText);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: actualText,
          usedQuestions: Array.from(usedQuestionsRef.current).slice(-20),
        }),
      });

      // Guard against non-JSON (Vercel timeout HTML pages)
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error('Server timeout. Please try again.');
      }

      const data: APIResponse = await res.json();
      const rawAnswer = data.answer || 'Sorry, I could not generate a response. Please try again.';

      setMessages(prev => [...prev, { role: 'assistant', content: rawAnswer }]);

      if (data.intent) sessionIntentRef.current = data.intent;
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }

      // Speak the full answer — cleanTextForSpeech is applied inside speakText
      // Use speakable if provided (already shortened for voice), else full answer
      const toSpeak = data.speakable || rawAnswer;
      speakText(toSpeak);

    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = err instanceof Error ? err.message : 'Connection error. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, speakText]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  // ── Clear chat ────────────────────────────────────────────────────
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('shashank_chat_history');
    stopSpeaking();
    setSuggestions(DEFAULT_SUGGESTIONS);
    usedQuestionsRef.current = new Set();
    sessionIntentRef.current = 'PROFILE';
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className='chatbot-wrapper'>
      {isOpen ? (
        <div className='chatbot-panel'>
          {/* Header */}
          <div className='chatbot-header'>
            <h3><FaRobot /> Shashank's AI Assistant</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className='close-button'
                onClick={clearChat}
                title='Clear Chat'
                style={{ fontSize: '12px', paddingRight: '8px' }}
              >Clear</button>
              <button className='close-button' onClick={() => setIsOpen(false)}><FaTimes /></button>
            </div>
          </div>

          {/* Messages */}
          <div className='chatbot-messages'>
            <div className='message-disclaimer'>
              AI answers are based on Shashank's profile. Verify final details directly.
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}

            {/* Suggested questions — rendered in chat, NEVER spoken by TTS */}
            {suggestions.length > 0 && (
              <div className='suggestions-after-answer'>
                <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                  Suggested:
                </div>
                <div className='quick-questions'>
                  {suggestions.map((sq, idx) => (
                    <button
                      key={idx}
                      className='quick-btn'
                      onClick={() => {
                        usedQuestionsRef.current.add(sq);
                        handleSend(sq);
                      }}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className='message-bubble assistant'>
                <div className='loading-dots'><span /><span /><span /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className='chatbot-input-area'>
            <button
              className={`icon-btn ${isListening ? 'recording' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={isSpeaking ? stopSpeaking : toggleListen}
              title={isListening ? 'Listening...' : isSpeaking ? 'Stop speaking' : 'Voice input'}
              aria-label={isSpeaking ? 'Stop speaking' : 'Voice input'}
            >
              {isSpeaking ? <FaStopCircle /> : <FaMicrophone />}
            </button>

            <input
              type='text'
              placeholder={
                sessionIntentRef.current === 'GENERAL'
                  ? 'Ask me anything...'
                  : 'Ask about experience, role, CTC...'
              }
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={isListening || isLoading}
            />

            <button
              className='icon-btn'
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              title='Send'
              aria-label='Send message'
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      ) : (
        <button
          className='chatbot-button'
          onClick={() => {
            // Stop any current speech (including welcome greeting)
            stopSpeaking();
            greetingFiredRef.current = true; // prevent welcome from re-triggering
            setIsOpen(true);
            // Chatbot opening greeting — once per session
            if (!sessionStorage.getItem(SK_CHATBOT)) {
              sessionStorage.setItem(SK_CHATBOT, 'true');
              greetingTimerRef.current = setTimeout(() => {
                speakGreeting(CHATBOT_GREETING);
              }, 350);
            }
          }}
          title="Chat with Shashank's AI"
          aria-label="Open chatbot"
        >
          <FaCommentDots />
        </button>
      )}
    </div>
  );
};

export default RecruiterChatbot;