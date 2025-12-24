import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Zap, Compass } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const ChatPage = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: `Hello! I'm your AI Financial Analyst powered by MCP Multi-Agent System.
I can help you with market analysis, investment strategies, and portfolio recommendations.
How can I assist you today?`,
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showLoader, setShowLoader] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null); // null means general
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load past chats on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoadingHistory(true);
                const res = await api.get('/chats');
                console.log('chat history response', res);
                const raw = Array.isArray(res.data.data)
                    ? res.data.data
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];

                const historyMessages = [];
                raw.forEach((item, idx) => {
                    const ts = new Date();
                    if (item?.userQuery) {
                        historyMessages.push({
                            id: `h-u-${idx}`,
                            sender: 'user',
                            text: item.userQuery,
                            timestamp: ts,
                        });
                    }
                    if (item?.agentResponse) {
                        historyMessages.push({
                            id: `h-b-${idx}`,
                            sender: 'bot',
                            text: item.agentResponse,
                            timestamp: ts,
                        });
                    }
                });

                if (historyMessages.length) {
                    setMessages((prev) => [...prev, ...historyMessages]);
                }
            } catch (err) {
                console.error('Failed to load chat history', err);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, []);

    // Stream bot response word-by-word
    const streamBotResponse = (fullText) => {
        const botId = Date.now();
        const placeholder = {
            id: botId,
            sender: 'bot',
            text: '',
            timestamp: new Date(),
        };

        // add placeholder bot message
        setMessages(prev => [...prev, placeholder]);

        const words = fullText.split(' ');
        let i = 0;
        const interval = setInterval(() => {
            i += 1;
            const partial = words.slice(0, i).join(' ');
            setMessages(prev => prev.map(m => (m.id === botId ? { ...m, text: partial } : m)));
            if (i >= words.length) {
                clearInterval(interval);
                setIsTyping(false);
            }
        }, 40); // speed of streaming in ms per word
    };

    const resolveEndpoint = () => {
        if (selectedAgent === 'execute') return '/ea-chat';
        if (selectedAgent === 'research') return '/mra-chat';
        return '/general';
    };

    const handleSendMessage = async () => {
        // prevent sending when no input or bot is generating
        if (!inputMessage.trim() || isTyping) return;

        const userMessage = {
            id: messages.length + 1,
            sender: 'user',
            text: inputMessage,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);
        setShowLoader(true);

        try {
            // show analyzing indicator briefly while awaiting API
            setShowLoader(true);
            const endpoint = resolveEndpoint();
            const { data } = await api.post(endpoint, { query: inputMessage });
            setShowLoader(false);

            // Normalize possible response shapes
            let fullText = '';
            if (typeof data === 'string') {
                fullText = data;
            } else if (data) {
                fullText = data.reply || data.message || data.text || JSON.stringify(data);
            }

            // Fallback if empty
            if (!fullText) {
                fullText = 'No response received from the server.';
            }

            streamBotResponse(fullText);
        } catch (err) {
            setShowLoader(false);
            setIsTyping(false);
            const errorText = err?.response?.data?.message || err?.message || 'Failed to reach the server.';
            const botMessage = {
                id: Date.now(),
                sender: 'bot',
                text: `Error: ${errorText}`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-hidden">
            <Navbar />
            <div className="flex-1 px-4 pt-4 pb-2 flex justify-center">
                <div className="w-full max-w-6xl h-[calc(100vh-100px)] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl flex overflow-hidden">
                    {/* Agent list */}
                    <div className="w-56 bg-white/5 border-r border-white/10 p-3 flex flex-col gap-2">
                        <p className="text-xs uppercase tracking-wide text-blue-100 mb-1">Agents</p>
                        {[{ key: 'execute', label: 'Trade Execution', icon: Zap }, { key: 'research', label: 'Market Research', icon: Compass }].map((agent) => {
                            const Icon = agent.icon;
                            const active = selectedAgent === agent.key;
                            return (
                                <button
                                    key={agent.key}
                                    onClick={() => setSelectedAgent((prev) => (prev === agent.key ? null : agent.key))}
                                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition border ${
                                        active
                                            ? 'bg-blue-600/80 border-blue-500 text-white'
                                            : 'bg-white/10 border-white/10 text-blue-100 hover:bg-white/15'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        {agent.label}
                                    </span>
                                    {active ? <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Selected</span> : null}
                                </button>
                            );
                        })}
                        <div className="mt-2 text-xs text-blue-100/80">
                            <p>None selected → General Agent</p>
                        </div>
                    </div>

                    {/* Chat column */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 flex items-center justify-between gap-3 shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-full shadow-sm">
                                    <Bot className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="leading-tight">
                                    <h2 className="text-white font-semibold text-base">MCP Financial Analyst</h2>
                                    <p className="text-blue-100 text-xs">Multi-Agent AI System</p>
                                </div>
                            </div>
                            <div className="text-xs text-white bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
                                Active: {selectedAgent === 'execute' ? 'Trade Execution' : selectedAgent === 'research' ? 'Market Research' : 'General'}
                            </div>
                        </div>

                        {/* Messages Area (scrollable) */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                            message.sender === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                                        }`}
                                    >
                                        {message.sender === 'user' ? (
                                            <User className="w-5 h-5 text-white" />
                                        ) : (
                                            <Bot className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div
                                        className={`flex-1 max-w-full sm:max-w-2xl ${
                                            message.sender === 'user' ? 'flex justify-end' : ''
                                        }`}
                                    >
                                        <div
                                            className={`px-4 py-3 rounded-2xl whitespace-pre-line break-words overflow-hidden ${
                                                message.sender === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white/80 text-gray-900'
                                            }`}
                                        >
                                            <p
                                                className="text-sm break-words"
                                                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                            >
                                                {message.text}
                                            </p>
                                            <p
                                                className={`text-xs mt-1 ${
                                                    message.sender === 'user'
                                                        ? 'text-blue-100'
                                                        : 'text-gray-500'
                                                }`}
                                            >
                                                {message.timestamp.toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {showLoader && isTyping && (
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="bg-white/80 px-4 py-3 rounded-2xl flex items-center gap-2">
                                        <Loader className="w-5 h-5 text-gray-600 animate-spin" />
                                        <p className="text-sm text-gray-600">Analyzing...</p>
                                    </div>
                                </div>
                            )}

                            {loadingHistory && (
                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span>Loading previous chats...</span>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-white/20 px-3 py-2.5 bg-white/10 backdrop-blur-sm">
                            <div className="flex gap-2 items-end min-w-0">
                                <textarea
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ask about market insights, strategies, or portfolio analysis... (Enter to send, Shift+Enter for newline)"
                                    className="flex-1 min-w-0 px-4 py-3 bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[56px] max-h-32 overflow-y-auto break-words"
                                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                                    disabled={false}
                                    rows={2}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim() || isTyping} // disabled while bot responds
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isTyping ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                    {!isTyping && <span>Send</span>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
