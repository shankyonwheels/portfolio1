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
const SK_CHATBOT  = 'chatbotGreetingSpoken';
const WELCOME_TEXT    = "Welcome to Shashank Dwivedi's portfolio. I hope you're doing great. Feel free to explore my work, experience, and AI assistant.";
const CHATBOT_GREETING = "Hi! I'm Shashank's AI Assistant. How can I help you today?";

// ── SpeechRecognition types ────────────────────────────────────────────
type SpeechRecognitionResult = { isFinal: boolean; [index: number]: { transcript: string } };
type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};
type SpeechRecognitionErrorEvent = { error: string };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror:  ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend:    (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
interface ExtWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
  (window as ExtWindow).SpeechRecognition ||
  (window as ExtWindow).webkitSpeechRecognition;

// ══════════════════════════════════════════════════════════════════════
// CLEAN TEXT FOR SPEECH — strip everything that sounds bad when read aloud
// ══════════════════════════════════════════════════════════════════════
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\|[^\n]+\|/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\b(PROFILE_INTENT|CAREER_INTENT|JD_INTENT|GENERAL_INTENT|MIXED_INTENT|WRITING_INTENT)\b/g, '')
    .replace(/\bsource:\s*(knowledge_base|ai|fallback)\b/gi, '')
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[#$%^&*[\]{}<>~`]/g, '')
    .replace(/\s\/\s/g, ', ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ══════════════════════════════════════════════════════════════════════
// PRONUNCIATION NORMALIZER — runs after cleanTextForSpeech
// Fixes email, portfolio, acronyms, salary, names
// ══════════════════════════════════════════════════════════════════════
function digitWord(d: string): string {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  return words[parseInt(d, 10)] ?? d;
}

function normalizePronunciationForSpeech(text: string): string {
  return text
    // ── Email addresses → readable ──────────────────────────────────
    .replace(
      /([a-zA-Z0-9][a-zA-Z0-9._%+-]*[a-zA-Z0-9]?)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})/g,
      (_full, user: string, domain: string, tld: string) => {
        const userSpoken = user
          .replace(/\./g, ' dot ')
          .replace(/\d+/g, (n: string) => [...n].map(digitWord).join(' '))
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .replace(/-/g, ' ');
        return `${userSpoken} at ${domain} dot ${tld}`;
      }
    )
    // ── Currency / salary ───────────────────────────────────────────
    .replace(/₹\s*(\d+)\s*[Cc][Rr]\b/g, (_m, n: string) => `${n} crore rupees`)
    .replace(/₹\s*(\d+)\s*LPA\b/g, (_m, n: string) => `${n} L P A`)
    .replace(/\b(\d+)\s*LPA\b/g, (_m, n: string) => `${n} L P A`)
    .replace(/₹\s*(\d+)/g, (_m, n: string) => `${n} rupees`)
    // ── Acronyms ────────────────────────────────────────────────────
    .replace(/\bCTC\b/g, 'C T C')
    .replace(/\bSOC\b/g, 'S O C')
    .replace(/\bNOC\b/g, 'N O C')
    .replace(/\bVAPT\b/g, 'V A P T')
    .replace(/\bIAM\b/g, 'I A M')
    .replace(/\bJD\b/g, 'J D')
    .replace(/\bRTR\b/g, 'R T R')
    .replace(/\bVMS\b/g, 'V M S')
    .replace(/\bEAD\b/g, 'E A D')
    .replace(/\bH1B\b/g, 'H one B')
    .replace(/\bOPT\b/g, 'O P T')
    .replace(/\bCPT\b/g, 'C P T')
    .replace(/\bATS\b/g, 'A T S')
    .replace(/\bHRMS\b/g, 'H R M S')
    .replace(/\bAPI\b/g, 'A P I')
    .replace(/\bMCA\b/g, 'M C A')
    .replace(/\bBCA\b/g, 'B C A')
    // ── Pronunciation dictionary ─────────────────────────────────────
    .replace(/\bportfolio\b/gi, 'port foe lee oh')
    .replace(/\bSoftenger\b/g, 'Soft en jer')
    .replace(/\bVercel\b/g, 'Ver sell')
    // ── Cleanup ─────────────────────────────────────────────────────
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Prepare text for TTS: clean → normalize → ready to chunk
function prepareForSpeech(text: string): string {
  return normalizePronunciationForSpeech(cleanTextForSpeech(text));
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════
const RecruiterChatbot: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────
  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [inputValue, setInputValue]   = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [showVoiceToast, setShowVoiceToast] = useState(false);

  // Session memory
  const usedQuestionsRef  = useRef<Set<string>>(new Set());
  const sessionIntentRef  = useRef<string>('PROFILE');

  // Refs
  const messagesEndRef         = useRef<HTMLDivElement>(null);
  const recognitionRef         = useRef<SpeechRecognitionInstance | null>(null);
  const speechCancelRef        = useRef<boolean>(false);
  const speechTimeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef              = useRef<SpeechSynthesisVoice[]>([]);
  const selectedVoiceRef       = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const handleSendRef          = useRef<((text: string) => void) | null>(null);
  // Mic: store final transcript across async boundary
  const micTranscriptRef       = useRef<string>('');
  const micSentRef             = useRef<boolean>(false);
  // ── Dual-gate greeting refs ────────────────────────────────────────
  // Both must be true before welcome speech fires
  const characterReadyRef      = useRef<boolean>(false); // 'character-ready' event fired
  const speechUnlockedRef      = useRef<boolean>(false); // user interacted with page
  const welcomeBlockedRef      = useRef<boolean>(false); // chatbot opened before welcome
  const greetingInProgressRef  = useRef<boolean>(false); // active attempt in progress
  const greetingTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref so toast onClick can call attemptWelcome from the useEffect closure
  const attemptWelcomeRef      = useRef<(() => void) | null>(null);
  // Dev logging shorthand (tree-shaken in prod)
  const DEV = import.meta.env.DEV;

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
  const dispatchSpeaking = useCallback((speaking: boolean, source: 'welcome' | 'chatbot' | 'answer' = 'answer') => {
    setIsSpeaking(speaking);
    window.dispatchEvent(new CustomEvent('ai-speaking', { detail: { speaking, source } }));
  }, []);

  // ── Stop TTS immediately ──────────────────────────────────────────
  const stopSpeaking = useCallback(() => {
    speechCancelRef.current = true;
    window.speechSynthesis?.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    dispatchSpeaking(false);
  }, [dispatchSpeaking]);

  // ── Speak single utterance (greetings) — internal helper ─────────
  // sessionKey: if provided, set ONLY in onstart (not before)
  const speakGreeting = useCallback((
    text: string,
    source: 'welcome' | 'chatbot',
    onStarted?: () => void,
    onFailed?: () => void,
  ) => {
    if (!window.speechSynthesis) {
      onFailed?.();
      return;
    }
    const prepared = prepareForSpeech(text);
    if (!prepared) { onFailed?.(); return; }

    speechCancelRef.current = false;
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(prepared);
    utt.lang = 'en-US';
    utt.rate = 1.08;
    utt.pitch = 1.00;
    utt.volume = 1.0;
    if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;

    utt.onstart = () => {
      if (speechCancelRef.current) { dispatchSpeaking(false, source); return; }
      onStarted?.();
      dispatchSpeaking(true, source);
    };
    utt.onend   = () => { dispatchSpeaking(false, source); };
    utt.onerror = (e) => {
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err !== 'interrupted') onFailed?.();
      dispatchSpeaking(false, source);
    };
    window.speechSynthesis.speak(utt);
  }, [dispatchSpeaking]);

  // ── DUAL-GATE WELCOME GREETING ────────────────────────────────────
  // Welcome speaks only when: characterReady=true AND speechUnlocked=true
  // Session flag set ONLY inside utterance.onstart (never before)
  useEffect(() => {
    if (sessionStorage.getItem(SK_WELCOME)) return;  // already spoken this session
    if (!window.speechSynthesis) return;             // TTS not supported

    const INTERACTION_EVENTS = ['click', 'pointerdown', 'touchstart', 'keydown', 'scroll'] as const;

    // ── Attempt welcome speech ─────────────────────────────────────
    const attemptWelcome = () => {
      if (!characterReadyRef.current || !speechUnlockedRef.current) return; // gates not open
      if (welcomeBlockedRef.current) return;                                // chatbot opened first
      if (sessionStorage.getItem(SK_WELCOME)) return;                       // already done
      if (greetingInProgressRef.current) return;                            // in progress

      greetingInProgressRef.current = true;
      if (DEV) console.log('[Speech] welcome queued');

      speakGreeting(
        WELCOME_TEXT,
        'welcome',
        () => {
          // onStarted — speech actually began
          if (DEV) console.log('[Speech] welcome started');
          sessionStorage.setItem(SK_WELCOME, 'true');  // set flag ONLY here
          setShowVoiceToast(false);                    // hide toast now that speech started
          removeInteractionListeners();
        },
        () => {
          // onFailed — speech was blocked/errored before starting
          if (DEV) console.log('[Speech] blocked or failed, will retry on interaction');
          greetingInProgressRef.current = false;  // allow retry
          // re-bind interaction listeners so next gesture retries
          bindInteractionListeners();
        }
      );
      // onend handled inside speakGreeting; just clear in-progress flag
      // We hook the real end via a separate listener on the 'ai-speaking' event
    };
    // Expose via ref so toast onClick can call it from JSX
    attemptWelcomeRef.current = attemptWelcome;

    // ── Cleanup: remove on next speak or unmount ───────────────────
    const onAiSpeakingEnd = (e: Event) => {
      const ev = e as CustomEvent<{ speaking: boolean; source: string }>;
      if (!ev.detail.speaking && ev.detail.source === 'welcome') {
        if (DEV) console.log('[Speech] welcome ended');
        greetingInProgressRef.current = false;
        window.removeEventListener('ai-speaking', onAiSpeakingEnd);
      }
    };
    window.addEventListener('ai-speaking', onAiSpeakingEnd);

    // ── Gate 1: Character ready ────────────────────────────────────
    const onCharacterReady = () => {
      if (DEV) console.log('[Speech] character-ready received');
      characterReadyRef.current = true;
      window.removeEventListener('character-ready', onCharacterReady);
      // If user hasn't interacted yet, show the voice intro toast after 1.5s
      greetingTimerRef.current = setTimeout(() => {
        if (!speechUnlockedRef.current && !sessionStorage.getItem(SK_WELCOME)) {
          setShowVoiceToast(true);
        }
        attemptWelcome();
      }, 800);
    };
    window.addEventListener('character-ready', onCharacterReady);

    // ── Gate 2: User interaction ───────────────────────────────────
    let interactionBound = false;
    const removeInteractionListeners = () => {
      INTERACTION_EVENTS.forEach(ev => document.removeEventListener(ev, onFirstInteraction, true));
    };
    const onFirstInteraction = () => {
      if (speechUnlockedRef.current) return; // already unlocked
      if (DEV) console.log('[Speech] user interaction unlocked');
      speechUnlockedRef.current = true;
      setShowVoiceToast(false); // hide toast — speech will now play
      removeInteractionListeners();
      attemptWelcome();
    };
    const bindInteractionListeners = () => {
      if (interactionBound) return;
      interactionBound = true;
      INTERACTION_EVENTS.forEach(ev =>
        document.addEventListener(ev, onFirstInteraction, { passive: true, capture: true })
      );
    };

    // Start with interaction listeners bound immediately
    // (unlock happens on first user gesture, then we speak if character is also ready)
    bindInteractionListeners();

    // ── Safety fallback: if character-ready never fires in 12s ─────
    greetingTimerRef.current = setTimeout(() => {
      if (!characterReadyRef.current) {
        if (DEV) console.log('[Speech] character-ready timeout, marking as ready');
        characterReadyRef.current = true;
        attemptWelcome();
      }
    }, 12000);

    return () => {
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
      removeInteractionListeners();
      window.removeEventListener('character-ready', onCharacterReady);
      window.removeEventListener('ai-speaking', onAiSpeakingEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── TTS: speak full answer — no truncation ────────────────────────
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis || !text.trim()) return;

    const prepared = prepareForSpeech(text);
    if (!prepared.trim()) return;

    // Cancel existing speech
    speechCancelRef.current = true;
    window.speechSynthesis.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    speechCancelRef.current = false;

    // Primary: split on sentence endings
    const primaryChunks = prepared
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Secondary: break chunks >240 chars at clause boundaries
    const maxLen = 240;
    const chunks: string[] = [];
    for (const chunk of primaryChunks) {
      if (chunk.length <= maxLen) {
        chunks.push(chunk);
      } else {
        const parts = chunk.split(/(?<=[,;:])\s+/);
        let buf = '';
        for (const part of parts) {
          const candidate = buf ? buf + ' ' + part : part;
          if (candidate.length > maxLen && buf) {
            chunks.push(buf.trim());
            buf = part;
          } else {
            buf = candidate;
          }
        }
        if (buf.trim()) chunks.push(buf.trim());
      }
    }

    if (chunks.length === 0) return;

    let index = 0;
    let sessionStarted = false;

    const speakNext = () => {
      if (speechCancelRef.current || index >= chunks.length) {
        dispatchSpeaking(false, 'answer');
        return;
      }
      const utt = new SpeechSynthesisUtterance(chunks[index]);
      utt.lang = 'en-US';
      utt.rate = 1.08;
      utt.pitch = 1.00;
      utt.volume = 1.0;
      if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;

      // ai-speaking=true only on first chunk
      utt.onstart = () => {
        if (!speechCancelRef.current && !sessionStarted) {
          sessionStarted = true;
          dispatchSpeaking(true, 'answer');
        }
      };
      utt.onend = () => {
        if (speechCancelRef.current) { dispatchSpeaking(false, 'answer'); return; }
        index++;
        speechTimeoutRef.current = setTimeout(speakNext, 150);
      };
      utt.onerror = (e) => {
        const err = (e as SpeechSynthesisErrorEvent).error;
        if (speechCancelRef.current || err === 'interrupted') {
          dispatchSpeaking(false, 'answer');
          return;
        }
        index++;
        speechTimeoutRef.current = setTimeout(speakNext, 150);
      };
      window.speechSynthesis.speak(utt);
    };

    speechTimeoutRef.current = setTimeout(speakNext, 80);
  }, [dispatchSpeaking]);

  // ── Microphone voice input — FIXED ───────────────────────────────
  const toggleListen = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Voice input is not supported in this browser. Please type your question.',
      }]);
      return;
    }

    // If already listening — stop
    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
      return;
    }

    // Stop any current TTS before listening (avoid mic picking up bot voice)
    stopSpeaking();

    // Create fresh recognition instance each time (avoids stale state)
    const r = new SpeechRecognitionAPI();
    r.continuous      = false;  // single utterance mode — more reliable
    r.interimResults  = true;
    r.lang            = 'en-IN'; // primary: Indian English; browsers fall back to en-US

    micTranscriptRef.current = '';
    micSentRef.current       = false;

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final   = '';
      // Iterate from resultIndex to get incremental results correctly
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      // Show live transcript in input field
      setInputValue(final || interim);
      // Store final transcript for sending via onend
      if (final) {
        micTranscriptRef.current = micTranscriptRef.current + final;
      }
    };

    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Microphone permission was denied. Please allow microphone access and try again.',
        }]);
      } else if (e.error === 'no-speech') {
        // Silent — user just didn't speak
      } else if (e.error !== 'aborted') {
        console.warn('[Mic] Speech recognition error:', e.error);
      }
    };

    r.onend = () => {
      setIsListening(false);
      // Send the captured transcript — use ref not state (state may be stale)
      const transcript = micTranscriptRef.current.trim();
      micTranscriptRef.current = '';
      if (transcript && !micSentRef.current) {
        micSentRef.current = true;
        setInputValue('');
        handleSendRef.current?.(transcript);
      }
    };

    recognitionRef.current = r;

    try {
      r.start();
      setIsListening(true);
    } catch (err) {
      console.warn('[Mic] Could not start recognition:', err);
      setIsListening(false);
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

      // Speak full answer — cleanTextForSpeech + normalization inside speakText
      speakText(rawAnswer);

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
    usedQuestionsRef.current  = new Set();
    sessionIntentRef.current  = 'PROFILE';
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* Voice intro toast — shown when autoplay blocked (after character-ready but before user interaction) */}
      {showVoiceToast && !sessionStorage.getItem(SK_WELCOME) && (
        <div
          className='voice-intro-toast'
          role='button'
          aria-label='Tap to hear the portfolio voice introduction'
          onClick={() => {
            speechUnlockedRef.current = true;
            setShowVoiceToast(false);
            attemptWelcomeRef.current?.();
          }}
        >
          <span className='toast-icon'>🔊</span>
          <span>Tap to hear the portfolio intro</span>
          <button
            className='toast-dismiss'
            aria-label='Dismiss voice intro'
            onClick={e => {
              e.stopPropagation();
              sessionStorage.setItem(SK_WELCOME, 'true'); // dismiss permanently for session
              setShowVoiceToast(false);
            }}
          >✕</button>
        </div>
      )}
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
              <button className='close-button' onClick={() => { stopSpeaking(); setIsOpen(false); }}><FaTimes /></button>
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
              title={isListening ? 'Listening… click to stop' : isSpeaking ? 'Stop speaking' : 'Voice input'}
              aria-label={isSpeaking ? 'Stop speaking' : isListening ? 'Stop listening' : 'Voice input'}
            >
              {isSpeaking ? <FaStopCircle /> : <FaMicrophone />}
            </button>

            <input
              type='text'
              placeholder={
                isListening
                  ? 'Listening… speak now'
                  : sessionIntentRef.current === 'GENERAL'
                    ? 'Ask me anything...'
                    : 'Ask about experience, role, CTC...'
              }
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isListening && handleSend()}
              disabled={isLoading}
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
            // Chatbot button is a user gesture — speech always works here
            // 1. Mark speech as unlocked (may trigger welcome if not blocked)
            speechUnlockedRef.current = true;
            // 2. Block welcome and cancel any in-progress speech
            welcomeBlockedRef.current = true;
            stopSpeaking();
            setIsOpen(true);

            // 3. Chatbot greeting — once per session
            if (!sessionStorage.getItem(SK_CHATBOT)) {
              if (!window.speechSynthesis) {
                // TTS not supported — show fallback message in chat
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: 'Voice greeting is not supported in this browser, but you can still use the chatbot.',
                }]);
                return;
              }
              if (DEV) console.log('[Speech] chatbot greeting started');
              speakGreeting(
                CHATBOT_GREETING,
                'chatbot',
                () => {
                  // Set flag ONLY after utterance.onstart fires
                  sessionStorage.setItem(SK_CHATBOT, 'true');
                  if (DEV) console.log('[Speech] chatbot greeting confirmed started');
                },
                () => {
                  // Speech failed — don't set flag, allow retry next time
                  if (DEV) console.log('[Speech] chatbot greeting failed');
                }
              );
            }
          }}
          title="Chat with Shashank's AI"
          aria-label='Open chatbot'
        >
          <FaCommentDots />
        </button>
      )}
    </div>
    </>
  );
};

export default RecruiterChatbot;