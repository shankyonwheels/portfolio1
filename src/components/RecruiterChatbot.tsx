import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaRobot, FaTimes, FaCommentDots, FaMicrophone, FaStopCircle, FaPaperPlane } from 'react-icons/fa';
import './styles/RecruiterChatbot.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Suggestion = {
  text: string;
};

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { text: 'Tell me about yourself' },
  { text: 'What is your current role?' },
  { text: 'What is your expected CTC?' },
  { text: 'What is your notice period?' },
  { text: 'Have you hired SOC Analysts?' },
  { text: 'Are you open to remote or hybrid?' }
];

const SOC_SUGGESTIONS: Suggestion[] = [
  { text: 'What cybersecurity roles have you hired for?' },
  { text: 'Have you hired VAPT profiles?' },
  { text: 'What IT infrastructure roles have you handled?' },
  { text: 'What clients have you worked with?' }
];

const EXPERIENCE_SUGGESTIONS: Suggestion[] = [
  { text: 'Which companies have you worked with?' },
  { text: 'What tools do you use?' },
  { text: 'Have you handled global hiring?' },
  { text: 'What are your strongest skills?' }
];

const CTC_SUGGESTIONS: Suggestion[] = [
  { text: 'What is your notice period?' },
  { text: 'Are you open to hybrid?' },
  { text: 'What is your current role?' },
  { text: 'Tell me about your experience' }
];

const ROLE_SUGGESTIONS: Suggestion[] = [
  { text: 'What is your expected CTC?' },
  { text: 'What is your notice period?' },
  { text: 'Have you hired SOC Analysts?' },
  { text: 'Are you open to remote or hybrid?' }
];

const GENERAL_SUGGESTIONS: Suggestion[] = [
  { text: 'Tell me about Shashank' },
  { text: 'What is your current role?' },
  { text: 'What are your strongest skills?' },
  { text: 'Have you handled global hiring?' }
];

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

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

const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined = (window as unknown as SpeechSynthesisWindow).SpeechRecognition || (window as unknown as SpeechSynthesisWindow).webkitSpeechRecognition;

const RecruiterChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<Suggestion[]>(DEFAULT_SUGGESTIONS);
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechCancelRef = useRef<boolean>(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const finalTranscriptSentRef = useRef<boolean>(false);
  const handleSendRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('shashank_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        // Failed to parse chat history, continue with empty array
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shashank_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setSuggestedQuestions(getSuggestedQuestions(lastMessage.content));
      }
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getSuggestedQuestions = (lastAssistantAnswer: string): Suggestion[] => {
    const lower = lastAssistantAnswer.toLowerCase();
    let candidates: Suggestion[] = [];
    
    if (lower.includes('current ctc') || lower.includes('11 lpa') || lower.includes('expected ctc') || lower.includes('16 lpa')) {
      candidates = [...candidates, ...CTC_SUGGESTIONS];
    }
    if (lower.includes('soc') || lower.includes('cybersecurity') || lower.includes('vapt') || lower.includes('noc') || lower.includes('security engineer')) {
      candidates = [...candidates, ...SOC_SUGGESTIONS];
    }
    if (lower.includes('experience') || lower.includes('years') || lower.includes('recruitment experience')) {
      candidates = [...candidates, ...EXPERIENCE_SUGGESTIONS];
    }
    if (lower.includes('current role') || lower.includes('account manager') || lower.includes('softenger') || lower.includes('currently working')) {
      candidates = [...candidates, ...ROLE_SUGGESTIONS];
    }
    
    // Add fallback options to ensure we have enough
    candidates = [...candidates, ...GENERAL_SUGGESTIONS, ...DEFAULT_SUGGESTIONS, ...EXPERIENCE_SUGGESTIONS, ...SOC_SUGGESTIONS];

    // Filter out already used questions and remove duplicates
    const uniqueCandidates = Array.from(new Set(candidates.map(c => c.text)))
      .filter(text => !usedSuggestions.has(text))
      .map(text => ({ text }));

    // Shuffle array
    for (let i = uniqueCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueCandidates[i], uniqueCandidates[j]] = [uniqueCandidates[j], uniqueCandidates[i]];
    }

    return uniqueCandidates.slice(0, 4);
  };

  const cleanAssistantAnswer = (answer: string): string => {
    let cleaned = answer;
    const historyPatterns = [
      /previously you asked[:\s][\s\S]*?[.]/gi,
      /you asked[:\s][\s\S]*?[.]/gi,
      /last time you asked[:\s][\s\S]*?[.]/gi,
      /before you asked[:\s][\s\S]*?[.]/gi,
      /as i mentioned[,][\s\S]*?[.]/gi,
      /as mentioned[,][\s\S]*?[.]/gi,
    ];
    for (const pattern of historyPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    cleaned = cleaned.replace(/\s{3,}/g, ' ').trim();
    return cleaned;
  };

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    
    speechCancelRef.current = false;
    window.speechSynthesis.cancel();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (sentences.length === 0) return;
    
    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang?.startsWith('en-'));
    const selectedVoiceImpl = englishVoices.length > 0 ? englishVoices[0] : (voices.length > 0 ? voices[0] : undefined);
    
    let index = 0;
    
    const speakNext = () => {
      if (speechCancelRef.current) {
        setIsSpeaking(false);
        window.dispatchEvent(new CustomEvent('ai-speaking', { detail: false }));
        return;
      }
      
      if (index >= sentences.length) {
        setIsSpeaking(false);
        window.dispatchEvent(new CustomEvent('ai-speaking', { detail: false }));
        return;
      }
      
      const sentence = sentences[index];
      const utterance = new SpeechSynthesisUtterance(sentence);
      
      utterance.lang = 'en-US';
      
      if (selectedVoiceImpl) {
        utterance.voice = selectedVoiceImpl;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        window.dispatchEvent(new CustomEvent('ai-speaking', { detail: true }));
      };
      utterance.onend = () => {
        if (speechCancelRef.current) {
          setIsSpeaking(false);
          window.dispatchEvent(new CustomEvent('ai-speaking', { detail: false }));
          return;
        }
        index++;
        speechTimeoutRef.current = setTimeout(() => speakNext(), 50);
      };
      utterance.onerror = () => {
        index++;
        if (!speechCancelRef.current) {
          speechTimeoutRef.current = setTimeout(() => speakNext(), 50);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    };
    setIsSpeaking(true);
    window.dispatchEvent(new CustomEvent('ai-speaking', { detail: true }));
    speakNext();
  }, []);
  
  const stopSpeaking = useCallback(() => {
    speechCancelRef.current = true;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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

  const toggleListen = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      alert('Voice input is not supported in this browser. Please type your question.');
      return;
    }

    stopSpeaking();

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        if (event.results[0].isFinal && !finalTranscriptSentRef.current) {
          finalTranscriptSentRef.current = true;
          setIsListening(false);
          handleSendRef.current?.(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        finalTranscriptSentRef.current = false;
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow it or use text chat.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        finalTranscriptSentRef.current = false;
      };

      recognitionRef.current = recognition;
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
      } catch {
        console.error('Failed to start speech recognition');
      }
    }
  }, [isListening, stopSpeaking]);

  const handleSend = useCallback(async (text: string = inputValue) => {
    const actualText = text.trim() || (suggestedQuestions.length > 0 ? suggestedQuestions[0].text : '');
    if (!actualText) return;
    
    const newMsg: Message = { role: 'user', content: actualText };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsLoading(true);
    setUsedSuggestions(prev => new Set([...prev, actualText]));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMsg.content
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.error || `API failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      const rawAnswer = data.answer || 'Sorry, I am unable to respond at the moment.';
      const cleanAnswer = cleanAssistantAnswer(rawAnswer);
      
      setMessages(prev => [...prev, { role: 'assistant', content: cleanAnswer }]);
      speakText(cleanAnswer);

    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Connection error. Please try again later.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, speakText, suggestedQuestions]);

  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('shashank_chat_history');
    stopSpeaking();
    setSuggestedQuestions(DEFAULT_SUGGESTIONS);
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
    handleSend(text);
  };

  return (
    <div className='chatbot-wrapper'>
      {isOpen ? (
        <div className='chatbot-panel'>
          <div className='chatbot-header'>
            <h3><FaRobot /> Shashank's AI Assistant</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className='close-button' onClick={clearChat} title='Clear Chat' style={{fontSize: '12px', paddingRight: '8px'}}>Clear</button>
              <button className='close-button' onClick={() => setIsOpen(false)}><FaTimes /></button>
            </div>
          </div>
          
          <div className='chatbot-messages'>
            <div className='message-disclaimer'>
              AI answers are based on Shashank's profile. Please verify final details directly.
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={'message-bubble ' + msg.role}>
                {msg.content}
              </div>
            ))}

            {suggestedQuestions.length > 0 && (
              <div className='suggestions-after-answer'>
                <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>Suggested Questions:</div>
                <div className='quick-questions'>
                  {suggestedQuestions.map((sq, idx) => (
                    <button key={idx} className='quick-btn' onClick={() => handleSuggestionClick(sq.text)}>
                      {sq.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {isLoading && (
              <div className='message-bubble assistant'>
                <div className='loading-dots'><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className='chatbot-input-area'>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className={`icon-btn ${isListening ? 'recording' : ''} ${isSpeaking ? 'speaking' : ''}`} 
                onClick={isSpeaking ? stopSpeaking : toggleListen}
                title={isListening ? "Listening..." : isSpeaking ? "Stop speaking" : "Use voice input"}
              >
                {isSpeaking ? <FaStopCircle /> : <FaMicrophone />}
              </button>
              
              <input 
                type="text" 
                placeholder="Ask about my experience..." 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={isListening || isLoading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '20px',
                  fontSize: '14px'
                }}
              />
              
              <button className='icon-btn' onClick={() => handleSend()} disabled={isLoading || !inputValue.trim()}>
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button className='chatbot-button' onClick={() => setIsOpen(true)}>
          <FaCommentDots />
        </button>
      )}
    </div>
  );
};

export default RecruiterChatbot;