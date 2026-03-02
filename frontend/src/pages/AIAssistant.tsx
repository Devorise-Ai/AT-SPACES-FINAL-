import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import './AIAssistant.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    recommendedBranches?: any[];
}

const AIAssistant: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am the AT Spaces Agent. How can I help you find or book a workspace today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [threadId, setThreadId] = useState<string | undefined>(undefined);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/chat', {
                message: userMessage.content,
                threadId: threadId
            });

            if (response.data.threadId) {
                setThreadId(response.data.threadId);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.agentMessage || 'I am sorry, I am having trouble connecting right now.',
                timestamp: new Date(),
                recommendedBranches: response.data.recommendedBranches
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I encountered an error trying to process your request. Please try again.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-page container">
            <div className="chat-container glass-panel">
                <div className="chat-header">
                    <Bot size={28} className="text-primary" />
                    <div>
                        <h2>AT Spaces AI Agent</h2>
                        <p>Your personal booking assistant</p>
                    </div>
                </div>

                <div className="chat-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                            <div className="message-avatar">
                                {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className="message-bubble" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span>{msg.content}</span>
                                {msg.recommendedBranches && msg.recommendedBranches.length > 0 && (
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                                        {msg.recommendedBranches.map((branch: any) => (
                                            <div key={branch.id} style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 91, 4, 0.3)',
                                                minWidth: '200px'
                                            }}>
                                                <h4 style={{ margin: '0 0 4px 0', color: 'var(--color-primary)' }}>{branch.name}</h4>
                                                <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--color-grey-200)' }}>📍 {branch.location}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="message-wrapper assistant">
                            <div className="message-avatar">
                                <Bot size={20} />
                            </div>
                            <div className="message-bubble typing">
                                <Loader2 className="animate-spin" size={20} />
                                <span>Typing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-wrapper" onSubmit={handleSend}>
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="E.g., I need a meeting room in Amman tomorrow afternoon..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="btn-primary icon-btn"
                        disabled={!input.trim() || isLoading}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistant;
