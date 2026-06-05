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

// ── Default suggestions shown before any conversation ──────────────────
const DEFAULT_SUGGESTIONS: string[] = [
  'Tell me about yourself',
  'What is your current role?',
  'What is your expected CTC?',
  'What is your notice period?',
  'Have you hired SOC Analysts?',
  'Are you open to remote or hybrid?',
];

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

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════
const RecruiterChatbot: React.FC = () => {
  // ── State ────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  // Session memory — tracks context within the current session only
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

  // ── Load chat history from localStorage ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('shashank_chat_history');
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // ── Persist messages + scroll to bottom ──────────────────────────────
  useEffect(() => {
    localStorage.setItem('shashank_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load TTS voices ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  // ── TTS: speak a clean, voice-friendly string ─────────────────────────
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis || !text.trim()) return;

    speechCancelRef.current = false;
    window.speechSynthesis.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // Split into sentences for chunked delivery (avoids TTS cutoff)
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) return;

    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang?.startsWith('en-'));
    const selectedVoice = englishVoices.length > 0 ? englishVoices[0] : (voices[0] ?? undefined);

    let index = 0;
    const speakNext = () => {
      if (speechCancelRef.current || index >= sentences.length) {
        setIsSpeaking(false);
        window.dispatchEvent(new CustomEvent('ai-speaking', { detail: false }));
        return;
      }

      const utt = new SpeechSynthesisUtterance(sentences[index]);
      utt.lang = 'en-US';
      if (selectedVoice) utt.voice = selectedVoice;
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.volume = 1.0;

      utt.onstart = () => {
        setIsSpeaking(true);
        window.dispatchEvent(new CustomEvent('ai-speaking', { detail: true }));
      };
      utt.onend = () => {
        if (speechCancelRef.current) {
          setIsSpeaking(false);
          window.dispatchEvent(new CustomEvent('ai-speaking', { detail: false }));
          return;
        }
        index++;
        speechTimeoutRef.current = setTimeout(speakNext, 50);
      };
      utt.onerror = () => {
        index++;
        if (!speechCancelRef.current) speechTimeoutRef.current = setTimeout(speakNext, 50);
      };
      window.speechSynthesis.speak(utt);
    };

    setIsSpeaking(true);
    window.dispatchEvent(new CustomEvent('ai-speaking', { detail: true }));
    speakNext();
  }, []);

  // ── Stop TTS ─────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    speechCancelRef.current = true;
    window.speechSynthesis?.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    setIsSpeaking(false);
    window.dispatchEvent(new CustomEvent('ai-speaking', { detail: false }));
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // ── Voice input ───────────────────────────────────────────────────────
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
      } catch { /* ignore duplicate start errors */ }
    }
  }, [isListening, stopSpeaking]);

  // ── Send message ──────────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string = inputValue) => {
    const actualText = text.trim();
    if (!actualText) return;

    const userMsg: Message = { role: 'user', content: actualText };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Track used questions for session deduplication
    usedQuestionsRef.current.add(actualText);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: actualText,
          // Send used questions to API for suggestion deduplication
          usedQuestions: Array.from(usedQuestionsRef.current).slice(-20),
        }),
      });

      const data: APIResponse = await res.json().catch(() => ({ answer: '', error: 'Parse error' }));

      // API now always returns 200 — even fallback responses are 200
      const rawAnswer = data.answer || 'Sorry, I could not generate a response. Please try again.';

      // Display full answer in chat
      setMessages(prev => [...prev, { role: 'assistant', content: rawAnswer }]);

      // Update session intent
      if (data.intent) sessionIntentRef.current = data.intent;

      // Update suggestions from API (intent-aware, pre-deduped by server)
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }

      // Speak the speakable version (shorter, no markdown) — NOT the full answer
      // This ensures: no suggested questions spoken, no markdown read aloud
      const speakableText = data.speakable || rawAnswer;
      speakText(speakableText);

    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = 'Connection error. Please check your connection and try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, speakText]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  // ── Clear chat ────────────────────────────────────────────────────────
  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('shashank_chat_history');
    stopSpeaking();
    setSuggestions(DEFAULT_SUGGESTIONS);
    usedQuestionsRef.current = new Set();
    sessionIntentRef.current = 'PROFILE';
  };

  // ── Render ────────────────────────────────────────────────────────────
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
              >
                Clear
              </button>
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

            {/* Suggested questions — shown below messages, NOT spoken by TTS */}
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
                <div className='loading-dots'>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className='chatbot-input-area'>
            {/* Mic / Stop button */}
            <button
              className={`icon-btn ${isListening ? 'recording' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={isSpeaking ? stopSpeaking : toggleListen}
              title={isListening ? 'Listening...' : isSpeaking ? 'Stop speaking' : 'Use voice input'}
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
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      ) : (
        <button className='chatbot-button' onClick={() => setIsOpen(true)} title="Chat with Shashank's AI">
          <FaCommentDots />
        </button>
      )}
    </div>
  );
};

export default RecruiterChatbot;