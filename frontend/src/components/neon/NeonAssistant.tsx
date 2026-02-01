import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, X, StopCircle } from 'lucide-react';
import { askOllama } from './OllamaService';
import './NeonAssistant.css';

export function NeonAssistant() {
    const location = useLocation();
    const [chatOpen, setChatOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([{ role: 'bot', text: 'Bonjour ! Je suis NEON. Comment puis-je vous aider sur cette page ?' }]);
    
    const [isPrivacy, setIsPrivacy] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isThinking, setIsThinking] = useState(false); 
    const [isListening, setIsListening] = useState(false); 
    
    const auraRef = useRef<HTMLDivElement>(null);
    const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    // Position fixe en bas à droite
    const getFixedPos = () => ({ x: window.innerWidth - 120, y: window.innerHeight - 120 });
    const pos = getFixedPos();

    // --- FONCTION TTS : NEON PARLE ---
    const speak = (text: string) => {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Détection de langue pour la voix
        utterance.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'fr-FR';
        utterance.rate = 1.1; 
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true); 
        utterance.onend = () => setIsSpeaking(false);  
        window.speechSynthesis.speak(utterance);
    };

    // --- FONCTION MICRO (STT) ---
    const startListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true); 
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            handleSendMessage(transcript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const stopAudio = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    // --- GESTION DU REGARD ET CONFIDENTIALITÉ (FIXE) ---
    useEffect(() => {
        const handleMove = (e: MouseEvent) => { 
            mousePos.current = { x: e.clientX, y: e.clientY };
            if (auraRef.current) {
                const pupils = auraRef.current.querySelectorAll('.neon-pupil');
                pupils.forEach((p: any) => {
                    const rect = p.getBoundingClientRect();
                    const eyeX = rect.left + rect.width / 2;
                    const eyeY = rect.top + rect.height / 2;
                    const angle = Math.atan2(mousePos.current.y - eyeY, mousePos.current.x - eyeX);
                    p.style.transform = `translate(${Math.cos(angle) * 4}px, ${Math.sin(angle) * 4}px)`;
                });
            }
        };
        const handleFocus = (e: any) => { if (e.target.type === 'password') setIsPrivacy(true); };
        const handleBlur = (e: any) => { if (e.target.type === 'password') setIsPrivacy(false); };

        window.addEventListener('mousemove', handleMove);
        document.addEventListener('focusin', handleFocus);
        document.addEventListener('focusout', handleBlur);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            document.removeEventListener('focusin', handleFocus);
            document.removeEventListener('focusout', handleBlur);
        };
    }, []);

    // --- LOGIQUE D'ENVOI CONTEXTUELLE ---
    const handleSendMessage = async (textToSend?: string) => {
        const messageText = textToSend || input;
        if (!messageText.trim()) return;

        if (!isListening) setIsThinking(true);

        const userMsg = { role: 'user', text: messageText };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        
        let contextData = { 
            currentPage: location.pathname, // TRANSMISSION DE LA PAGE ACTUELLE
            user: JSON.parse(localStorage.getItem('user') || '{}'),
            stats: {}, 
            teachers: [], 
            rooms: [], 
            timetable: [] 
        };

        try {
            const [sRes, tRes, ttRes] = await Promise.all([
                fetch("http://localhost:8000/stats/"),
                fetch("http://localhost:8000/teachers/"),
                fetch("http://localhost:8000/seances/")
            ]);
            if (sRes.ok) contextData.stats = await sRes.json();
            const teachers = tRes.ok ? await tRes.json() : [];
            if (ttRes.ok) contextData.timetable = await ttRes.json();

            if (contextData.user.email) {
                const realT = teachers.find((t:any) => t.email.toLowerCase() === contextData.user.email.toLowerCase());
                if (realT) contextData.user = { ...contextData.user, nom: realT.name, id: realT.id };
            }
            contextData.teachers = teachers;
        } catch (e) { console.error(e); }

        const aiResponse = await askOllama(messageText, contextData);
        
        setMessages(prev => [...prev, { role: 'bot', text: aiResponse }]);
        setIsThinking(false);
        speak(aiResponse);
    };

    return (
        <>
            <div 
                ref={auraRef} 
                className={`neon-avatar ${isPrivacy ? 'privacy-mode' : ''} ${isSpeaking ? 'speaking' : ''} ${isListening ? 'listening' : ''}`} 
                style={{ position: 'fixed', left: pos.x, top: pos.y }}
                onClick={() => setChatOpen(!chatOpen)}
            >
                <div className="neon-circle">
                    <div className="neon-eyes-container">
                        <div className="neon-eye-ball"><div className="neon-pupil"></div></div>
                        <div className="neon-eye-ball"><div className="neon-pupil"></div></div>
                    </div>
                </div>
            </div>

            {chatOpen && (
                <div className="neon-chat-box">
                    <div className="chat-header">
                        <span>NEON AI v2.0</span>
                        <X onClick={() => setChatOpen(false)} style={{cursor:'pointer'}}/>
                    </div>
                    <div className="chat-msg-area">
                        {messages.map((m, i) => (
                            <div key={i} className={`msg-bubble ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
                                {m.text}
                            </div>
                        ))}
                        {isThinking && (
                            <div className="msg-bubble msg-bot loading">
                                <div className="typing-indicator">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div style={{padding:'15px', display:'flex', gap:'10px', alignItems: 'center', borderTop: '1px solid rgba(90, 74, 136, 0.2)'}}>
                        <button onClick={startListening} className={`mic-btn ${isListening ? 'active' : ''}`} title="Parler">
                            <Mic size={20} color={isListening ? "#ff4444" : "#00f2ff"} />
                        </button>

                        <input 
                            className="neon-chat-input"
                            placeholder={isListening ? "Je vous écoute..." : "Posez une question..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isThinking || isListening}
                        />
                        
                        <button onClick={() => handleSendMessage()} className="neon-send-btn" disabled={isThinking || isListening || !input.trim()}>
                            ➤
                        </button>

                        {isSpeaking && (
                            <button onClick={stopAudio} title="Arrêter">
                                <StopCircle size={20} color="#ff4444" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}