import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Zap, Compass, PanelLeftOpen, PanelLeft, ChartPie, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Navbar from '../components/Navbar';
import api from '../api/axios';

/* ── Markdown renderer for bot messages ── */
const MarkdownMessage = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-1.5 text-gray-900">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 text-gray-900">{children}</h3>,
            h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1 text-gray-800">{children}</h4>,
            p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside text-sm mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside text-sm mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
            em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
            a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                    {children}
                </a>
            ),
            blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-400 pl-3 my-2 text-gray-600 italic text-sm">{children}</blockquote>
            ),
            table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                    <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">{children}</table>
                </div>
            ),
            thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
            th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">{children}</th>,
            td: ({ children }) => <td className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100">{children}</td>,
            hr: () => <hr className="my-3 border-gray-200" />,
            code: ({ inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                if (!inline && match) {
                    return (
                        <div className="my-2 rounded-lg overflow-hidden border border-gray-200">
                            <div className="bg-gray-100 px-3 py-1 text-xs text-gray-500 font-mono border-b border-gray-200">{match[1]}</div>
                            <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div" className="!m-0 !text-sm" {...props}>
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        </div>
                    );
                }
                return (
                    <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                        {children}
                    </code>
                );
            },
        }}
    >
        {content}
    </ReactMarkdown>
);

const AGENTS = [
    { key: 'execute', label: 'Trade Execution', icon: Zap, desc: 'Execute buy/sell orders', endpoint: '/ea-chat' },
    { key: 'research', label: 'Market Research', icon: Compass, desc: 'Analyze market trends', endpoint: '/mra-chat' },
    { key: 'portfolio', label: 'Portfolio Manager', icon: ChartPie, desc: 'Manage your portfolio', endpoint: '/pa-chat' },
    { key: 'strategy', label: 'Investment Strategy', icon: Sparkles, desc: 'Plan investment strategies', endpoint: '/isa-chat' },
];

const ChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showLoader, setShowLoader] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [agentsCollapsed, setAgentsCollapsed] = useState(false);
    const [chatPage, setChatPage] = useState(0);
    const [hasMoreChats, setHasMoreChats] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const loadMoreTriggeredRef = useRef(false);
    const shouldAutoScroll = useRef(true);
    const streamingTextRef = useRef('');
    const streamingIdRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Only auto-scroll to bottom when the user sent a new message or bot is streaming
    // NOT when older messages are prepended
    useEffect(() => {
        if (shouldAutoScroll.current) {
            scrollToBottom();
        }
    }, [messages]);

    // Auto-load older messages when user scrolls to top
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // If user scrolled near top, load more
            if (container.scrollTop < 80 && hasMoreChats && !loadingMore && !loadingHistory && messages.length > 0 && !loadMoreTriggeredRef.current) {
                loadMoreTriggeredRef.current = true;
                shouldAutoScroll.current = false;
                loadMoreChats().finally(() => {
                    loadMoreTriggeredRef.current = false;
                });
            }

            // Track if user is near bottom (for auto-scroll decision)
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            shouldAutoScroll.current = isNearBottom;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMoreChats, loadingMore, loadingHistory, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load past chats on mount (paginated)
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoadingHistory(true);
                const res = await api.get('/chats', { params: { limit: 20, page: 0 } });
                const raw = Array.isArray(res.data.data)
                    ? res.data.data
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];

                if (raw.length < 20) setHasMoreChats(false);
                setChatPage(1);

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

    const loadMoreChats = async () => {
        if (loadingMore || !hasMoreChats) return;
        setLoadingMore(true);

        // Save scroll position to restore after prepending
        const container = chatContainerRef.current;
        const prevScrollHeight = container ? container.scrollHeight : 0;

        try {
            const res = await api.get('/chats', { params: { limit: 20, page: chatPage } });
            const raw = Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray(res?.data)
                    ? res.data
                    : [];

            if (raw.length < 20) setHasMoreChats(false);
            setChatPage((p) => p + 1);

            const olderMessages = [];
            raw.forEach((item, idx) => {
                const ts = new Date();
                const offset = chatPage * 20;
                if (item?.userQuery) {
                    olderMessages.push({
                        id: `h-u-${offset + idx}`,
                        sender: 'user',
                        text: item.userQuery,
                        timestamp: ts,
                    });
                }
                if (item?.agentResponse) {
                    olderMessages.push({
                        id: `h-b-${offset + idx}`,
                        sender: 'bot',
                        text: item.agentResponse,
                        timestamp: ts,
                    });
                }
            });

            if (olderMessages.length) {
                shouldAutoScroll.current = false;
                setMessages((prev) => [...olderMessages, ...prev]);
                // Restore scroll position so the view doesn't jump
                requestAnimationFrame(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight - prevScrollHeight;
                    }
                });
            }
        } catch (err) {
            console.error('Failed to load more chats', err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Stream bot response — use ref to avoid per-word state updates, only commit periodically
    const streamBotResponse = (fullText) => {
        const botId = Date.now();
        streamingIdRef.current = botId;
        streamingTextRef.current = '';
        shouldAutoScroll.current = true;

        const placeholder = {
            id: botId,
            sender: 'bot',
            text: '',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, placeholder]);

        const words = fullText.split(' ');
        let i = 0;
        const BATCH_SIZE = 5; // flush every 5 words instead of every 1

        const interval = setInterval(() => {
            i += 1;
            streamingTextRef.current = words.slice(0, i).join(' ');

            // Only update React state every BATCH_SIZE words, or on the last word
            if (i % BATCH_SIZE === 0 || i >= words.length) {
                const text = streamingTextRef.current;
                setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text } : m)));
            }

            if (i >= words.length) {
                clearInterval(interval);
                setIsTyping(false);
                streamingIdRef.current = null;
            }
        }, 30);
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isTyping) return;

        const userMessage = {
            id: messages.length + 1,
            sender: 'user',
            text: inputMessage,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);
        setShowLoader(true);
        shouldAutoScroll.current = true;

        try {
            // Route to the correct agent endpoint based on selection
            const agentConfig = AGENTS.find((a) => a.key === selectedAgent);
            const endpoint = agentConfig ? agentConfig.endpoint : '/mcp-chat';
            const { data } = await api.post(endpoint, { userQuery: inputMessage });
            setShowLoader(false);

            let fullText = '';
            if (typeof data === 'string') {
                fullText = data;
            } else if (data) {
                fullText = data.reply || data.message || data.text || JSON.stringify(data);
            }

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
                text: `**Error:** ${errorText}`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMessage]);
        }
    };

    const activeLabel = selectedAgent
        ? AGENTS.find((a) => a.key === selectedAgent)?.label || 'General'
        : 'General';

    const isEmpty = messages.length === 0 && !loadingHistory;

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 overflow-hidden">
            <Navbar />
            <div className="flex-1 px-4 pt-4 pb-2 flex flex-col">
                <div className="flex-1 flex justify-center">
                    <div className="flex w-[92vw] max-w-[1400px] gap-3 h-[calc(100vh-120px)] items-stretch">

                        {/* ── Agent rail ── */}
                        <div
                            className={`relative flex-shrink-0 bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 ${
                                agentsCollapsed ? 'w-12' : 'w-56'
                            }`}
                        >
                            {/* Rail header */}
                            <div
                                className={`absolute inset-x-0 top-0 py-3 flex items-center gap-2 z-10 ${
                                    agentsCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'
                                }`}
                            >
                                <p
                                    className={`text-[11px] uppercase tracking-widest font-medium text-blue-300 transition-all duration-200 ${
                                        agentsCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                    }`}
                                >
                                    Agents
                                </p>
                                <button
                                    onClick={() => setAgentsCollapsed((prev) => !prev)}
                                    className="inline-flex items-center justify-center bg-white/10 border border-white/20 text-white/80 p-1.5 rounded-lg hover:bg-white/15 transition"
                                    aria-label="Toggle agents"
                                >
                                    {agentsCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Agent buttons */}
                            <div
                                className={`mt-14 h-[calc(100%-56px)] overflow-hidden transition-opacity duration-200 ${
                                    agentsCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                }`}
                            >
                                <div className="px-3 pb-3 flex flex-col gap-1.5">
                                    {/* General / MCP mode */}
                                    <button
                                        onClick={() => setSelectedAgent(null)}
                                        className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border ${
                                            selectedAgent === null
                                                ? 'bg-blue-600/90 border-blue-500/60 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-white/[0.06] border-white/[0.08] text-blue-100/90 hover:bg-white/10 hover:border-white/15'
                                        }`}
                                    >
                                        <Bot className="w-4 h-4 flex-shrink-0" />
                                        <div className="text-left">
                                            <p className="leading-tight">General</p>
                                            <p className={`text-[10px] leading-tight mt-0.5 ${selectedAgent === null ? 'text-blue-200' : 'text-blue-300/60'}`}>
                                                MCP multi-agent assistant
                                            </p>
                                        </div>
                                    </button>

                                    <div className="border-t border-white/10 my-1" />

                                    {AGENTS.map((agent) => {
                                        const Icon = agent.icon;
                                        const active = selectedAgent === agent.key;
                                        return (
                                            <button
                                                key={agent.key}
                                                onClick={() => setSelectedAgent(agent.key)}
                                                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border ${
                                                    active
                                                        ? 'bg-blue-600/90 border-blue-500/60 text-white shadow-lg shadow-blue-500/20'
                                                        : 'bg-white/[0.06] border-white/[0.08] text-blue-100/90 hover:bg-white/10 hover:border-white/15'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4 flex-shrink-0" />
                                                <div className="text-left">
                                                    <p className="leading-tight">{agent.label}</p>
                                                    <p className={`text-[10px] leading-tight mt-0.5 ${active ? 'text-blue-200' : 'text-blue-300/60'}`}>
                                                        {agent.desc}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Chat panel ── */}
                        <div className="relative flex-1 min-w-0">
                            <div className="absolute inset-0 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-600/90 to-indigo-600/90 px-5 py-3 flex items-center justify-between gap-3 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/90 p-2 rounded-xl shadow">
                                            <Bot className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="leading-tight">
                                            <h2 className="text-white font-semibold text-base tracking-tight">MCP Financial Analyst</h2>
                                            <p className="text-blue-200 text-xs">Multi-Agent AI System</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/90 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        {activeLabel}
                                    </div>
                                </div>

                                {/* Messages area */}
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">

                                    {/* Auto-loading indicator at top */}
                                    {loadingMore && (
                                        <div className="flex justify-center py-2">
                                            <div className="flex items-center gap-2 text-xs text-blue-200/60">
                                                <Loader className="w-3 h-3 animate-spin" />
                                                <span>Loading older messages...</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Welcome state */}
                                    {isEmpty && (
                                        <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-4 select-none">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                <Sparkles className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-white text-lg font-semibold mb-1">How can I help you today?</h3>
                                                <p className="text-blue-200/70 text-sm max-w-md">
                                                    Ask about market insights, portfolio strategies, stock analysis, or execute trades.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                {['Analyze AAPL stock', 'Show my portfolio', 'Market overview'].map((q) => (
                                                    <button
                                                        key={q}
                                                        onClick={() => setInputMessage(q)}
                                                        className="text-xs bg-white/10 hover:bg-white/15 text-blue-100 border border-white/10 px-3.5 py-2 rounded-xl transition"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                        >
                                            <div
                                                className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                                                    message.sender === 'user'
                                                        ? 'bg-blue-600'
                                                        : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                                                }`}
                                            >
                                                {message.sender === 'user' ? (
                                                    <User className="w-4 h-4 text-white" />
                                                ) : (
                                                    <Bot className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                            <div
                                                className={`flex-1 max-w-full sm:max-w-3xl ${
                                                    message.sender === 'user' ? 'flex justify-end' : ''
                                                }`}
                                            >
                                                <div
                                                    className={`px-4 py-3 rounded-2xl overflow-hidden ${
                                                        message.sender === 'user'
                                                            ? 'bg-blue-600 text-white rounded-tr-md'
                                                            : 'bg-white/90 backdrop-blur text-gray-900 rounded-tl-md shadow-sm border border-gray-100'
                                                    }`}
                                                >
                                                    {message.sender === 'bot' ? (
                                                        <div className="prose-sm max-w-none">
                                                            <MarkdownMessage content={message.text} />
                                                        </div>
                                                    ) : (
                                                        <p
                                                            className="text-sm whitespace-pre-line break-words"
                                                            style={{ overflowWrap: 'anywhere' }}
                                                        >
                                                            {message.text}
                                                        </p>
                                                    )}
                                                    <p
                                                        className={`text-[11px] mt-1.5 ${
                                                            message.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
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
                                            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="bg-white/90 backdrop-blur px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2 shadow-sm border border-gray-100">
                                                <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                                                <p className="text-sm text-gray-500">Analyzing...</p>
                                            </div>
                                        </div>
                                    )}

                                    {loadingHistory && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-blue-200/60 py-4">
                                            <Loader className="w-4 h-4 animate-spin" />
                                            <span>Loading previous chats...</span>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input area */}
                                <div className="border-t border-white/10 px-4 py-3 bg-white/[0.04] backdrop-blur-sm">
                                    <div className="flex gap-2 items-end">
                                        <textarea
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder="Ask about markets, strategies, or portfolio analysis..."
                                            className="flex-1 min-w-0 px-4 py-3 bg-white/90 text-gray-800 placeholder-gray-400 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 resize-none min-h-[48px] max-h-32 overflow-y-auto text-sm transition"
                                            style={{ overflowWrap: 'anywhere' }}
                                            rows={1}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!inputMessage.trim() || isTyping}
                                            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
                                        >
                                            {isTyping ? (
                                                <Loader className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Send className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
