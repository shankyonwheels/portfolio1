import React, { useState, useEffect, useRef } from 'react';
import { FaRobot, FaTimes, FaCommentDots, FaMicrophone, FaStopCircle, FaVolumeMute, FaPaperPlane } from 'react-icons/fa';
import './styles/RecruiterChatbot.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTED_QUESTIONS = [
  "What is his current role?",
  "What is his total recruitment experience?",
  "What domains has he hired for?",
  "What ATS/VMS tools has he used?",
  "What is his current CTC?",
  "What is his expected CTC?",
  "What is his notice period?",
  "Is he open to remote/hybrid/onsite?",
  "What locations is he open for?",
  "Why should we hire Shashank?"
];

// Fallback types for SpeechRecognition
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const RecruiterChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load local history
    const saved = localStorage.getItem('shashank_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    // Save to local history
    localStorage.setItem('shashank_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init Speech Recognition
  useEffect(() => {
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleSend(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow it or use text chat.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [messages]); // need access to latest messages in handleSend, but handleSend receives string so it's fine. Wait, better to use functional setState in handleSend.

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please type your question.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        stopSpeaking(); // stop speaking when listening
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return;
    
    const newMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMsg.content,
          history: messages // sending previous context
        })
      });

      if (!response.ok) {
        throw new Error('API response error');
      }

      const data = await response.json();
      const answer = data.answer || 'Sorry, I am unable to respond at the moment.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      speakText(answer);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('shashank_chat_history');
    stopSpeaking();
  };

  return (
    <div className="chatbot-wrapper">
      {isOpen ? (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <h3><FaRobot /> Shashank's AI Assistant</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="close-button" onClick={clearChat} title="Clear Chat" style={{fontSize: '12px', paddingRight: '8px'}}>Clear</button>
              <button className="close-button" onClick={() => setIsOpen(false)}><FaTimes /></button>
            </div>
          </div>
          
          <div className="chatbot-messages">
            <div className="message-disclaimer">
              AI answers are based on Shashank's profile. Please verify final details directly.
            </div>
            
            {messages.length === 0 && (
              <div style={{ padding: '10px 0' }}>
                <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>Suggested Questions:</div>
                <div className="quick-questions">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button key={idx} className="quick-btn" onClick={() => handleSend(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble \${msg.role}`}>
                {msg.content}
              </div>
            ))}
            
            {isLoading && (
              <div className="message-bubble assistant">
                <div className="loading-dots"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            {isSpeaking && (
              <button className="icon-btn" style={{color: '#c2a4ff'}} onClick={stopSpeaking} title="Stop Speaking">
                <FaVolumeMute />
              </button>
            )}
            
            <button 
              className={`icon-btn \${isListening ? 'recording' : ''}`} 
              onClick={toggleListen}
              title={isListening ? "Listening..." : "Use voice input"}
            >
              {isListening ? <FaStopCircle /> : <FaMicrophone />}
            </button>
            
            <input 
              type="text" 
              placeholder="Ask about my experience..." 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={isListening || isLoading}
            />
            
            <button className="icon-btn" onClick={() => handleSend()} disabled={isLoading || !inputValue.trim()}>
              <FaPaperPlane />
            </button>
          </div>
        </div>
      ) : (
        <button className="chatbot-button" onClick={() => setIsOpen(true)}>
          <FaCommentDots />
        </button>
      )}
    </div>
  );
};

export default RecruiterChatbot;
