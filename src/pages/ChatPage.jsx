import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader, Loader2, Zap, Compass, PanelLeftOpen, PanelLeft, ChartPie} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Brush,
    ResponsiveContainer,
} from 'recharts';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const parseDailyPrices = (raw) => {
    if (!raw) return [];

    const normalize = (dateValue, payload) => {
        const time = new Date(dateValue);
        const close = Number(payload?.close ?? payload?.['4. close']);
        const open = Number(payload?.open ?? payload?.['1. open']);
        const high = Number(payload?.high ?? payload?.['2. high']);
        const low = Number(payload?.low ?? payload?.['3. low']);
        const volume = Number(payload?.volume ?? payload?.['5. volume']);
        if (!Number.isFinite(close) || Number.isNaN(time.getTime())) return null;
        return {
            date: dateValue,
            label: time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            close,
            open: Number.isFinite(open) ? open : null,
            high: Number.isFinite(high) ? high : null,
            low: Number.isFinite(low) ? low : null,
            volume: Number.isFinite(volume) ? volume : null,
            ts: time.getTime(),
        };
    };

    if (Array.isArray(raw)) {
        return raw
            .map((row) => normalize(row.date, row))
            .filter(Boolean)
            .sort((a, b) => a.ts - b.ts);
    }

    if (typeof raw === 'object') {
        return Object.entries(raw)
            .map(([date, values]) => normalize(date, values))
            .filter(Boolean)
            .sort((a, b) => a.ts - b.ts);
    }

    return [];
};

const GraphToolPanel = ({ initialSymbol, companies = [] }) => {
    const [symbol, setSymbol] = useState(initialSymbol || companies[0]?.symbol || '');
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const yDomain = useMemo(() => {
        if (!series.length) return ['auto', 'auto'];
        const closes = series.map((p) => p.close);
        const min = Math.min(...closes);
        const max = Math.max(...closes);
        const padding = Math.max(1, (max - min) * 0.05);
        return [Math.max(0, min - padding), max + padding];
    }, [series]);

    useEffect(() => {
        if (!symbol) return;
        const fetchPrices = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get('/stockdailyprices', { params: { symbol } });
                const raw = res?.data?.data ?? res?.data?.prices ?? res?.data;
                const parsed = parseDailyPrices(raw);
                if (!parsed.length) throw new Error('No price data');
                setSeries(parsed);
            } catch (err) {
                const msg = err?.response?.data?.message || 'Could not load price history.';
                setError(msg);
                setSeries([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();
    }, [symbol]);

    useEffect(() => {
        if (!symbol && initialSymbol) setSymbol(initialSymbol);
    }, [initialSymbol, symbol]);

    return (
        <div className="h-full flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] text-blue-700 font-semibold">Graph Tool</p>
                    <h3 className="text-lg font-bold text-gray-900">Price chart</h3>
                </div>
                <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                    {companies.slice(0, 30).map((item) => (
                        <option key={item.symbol} value={item.symbol}>
                            {item.symbol} · {item.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                {loading ? (
                    <div className="h-full flex items-center justify-center gap-2 text-gray-700">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Loading price history...</span>
                    </div>
                ) : error ? (
                    <div className="h-full flex items-center justify-center text-red-700 text-sm text-center">
                        {error}
                    </div>
                ) : !series.length ? (
                    <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                        Select a ticker to load data.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                tick={{ fontSize: 11 }}
                                minTickGap={12}
                            />
                            <YAxis
                                domain={yDomain}
                                tickFormatter={(v) => `$${v.toFixed(0)}`}
                                tick={{ fontSize: 11 }}
                                width={70}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const point = payload[0].payload;
                                    return (
                                        <div className="rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-md text-sm">
                                            <p className="text-gray-900 font-semibold">{point.label || label}</p>
                                            <p className="text-blue-700 font-bold text-base">${point.close.toFixed(2)}</p>
                                            <p className="text-[11px] text-gray-600">H {point.high ?? '—'} · L {point.low ?? '—'} · O {point.open ?? '—'}</p>
                                            {point.volume ? (
                                                <p className="text-[11px] text-gray-500">Vol {point.volume.toLocaleString()}</p>
                                            ) : null}
                                        </div>
                                    );
                                }}
                                cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="close"
                                stroke="#2563eb"
                                strokeWidth={2.5}
                                dot={{ r: 3, strokeWidth: 1, stroke: '#1d4ed8', fill: '#eff6ff' }}
                                activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#bfdbfe', strokeWidth: 2 }}
                            />
                            <Brush dataKey="date" height={24} stroke="#2563eb" travellerWidth={8} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const TradeToolPanel = ({ initialSymbol, companies = [] }) => {
    const [symbol, setSymbol] = useState(initialSymbol || companies[0]?.symbol || '');
    const [quantity, setQuantity] = useState(0);
    const [price, setPrice] = useState(null);
    const [balance, setBalance] = useState(null);
    const [holdings, setHoldings] = useState({});
    const [submitting, setSubmitting] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await api.get('/profile/balance');
                const value = Number(res?.data?.data);
                setBalance(Number.isFinite(value) ? value : 0);
            } catch (err) {
                console.error('Failed to fetch balance', err);
            }
        };

        const fetchHoldings = async () => {
            try {
                const res = await api.get('/profile/holdings');
                const raw = Array.isArray(res?.data?.data)
                    ? res.data.data
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];
                const mapped = raw.reduce((acc, item) => {
                    const sym = item?.symbol;
                    const qty = Number(item?.quantity);
                    if (sym && Number.isFinite(qty)) acc[sym] = qty;
                    return acc;
                }, {});
                setHoldings(mapped);
            } catch (err) {
                console.error('Failed to fetch holdings', err);
                setHoldings({});
            }
        };

        fetchBalance();
        fetchHoldings();
    }, []);

    useEffect(() => {
        if (!symbol) return;
        const fetchPrice = async () => {
            try {
                setLoadingPrice(true);
                const res = await api.get('/stockprice', { params: { symbol } });
                const raw = res?.data?.price ?? res?.data?.data?.price ?? res?.data?.data ?? res?.data;
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed > 0) setPrice(parsed);
                else throw new Error('Invalid price');
            } catch (err) {
                console.error('Failed to fetch stock price', err);
                setFeedback({ type: 'error', message: 'Could not load latest price.' });
            } finally {
                setLoadingPrice(false);
            }
        };

        fetchPrice();
    }, [symbol]);

    useEffect(() => {
        if (!symbol && initialSymbol) setSymbol(initialSymbol);
    }, [initialSymbol, symbol]);

    const maxBuyable = useMemo(() => {
        if (!Number.isFinite(balance) || !Number.isFinite(price) || price <= 0) return null;
        return Math.max(0, Math.floor(balance / price));
    }, [balance, price]);

    const handleTrade = async (side) => {
        if (!symbol) return;
        const qty = Math.max(0, Math.floor(Number(quantity)) || 0);
        if (qty < 1) {
            setFeedback({ type: 'error', message: 'Quantity must be positive.' });
            return;
        }

        if (side === 'buy' && maxBuyable !== null && qty > maxBuyable) {
            setFeedback({ type: 'error', message: `Quantity exceeds your max buyable (${maxBuyable}).` });
            return;
        }

        const owned = Number(holdings[symbol] || 0);
        if (side === 'sell' && (!Number.isFinite(owned) || owned < qty)) {
            setFeedback({ type: 'error', message: `Sell quantity exceeds your holdings (${owned || 0}).` });
            return;
        }

        setSubmitting(side);
        setFeedback(null);
        try {
            await api.post(`/execute/${side}`, { symbol, quantity: qty });
            setFeedback({ type: 'success', message: `${side === 'buy' ? 'Buy' : 'Sell'} order placed for ${qty} ${symbol}.` });
            if (side === 'buy') {
                setBalance((prev) => (Number.isFinite(prev) && Number.isFinite(price) ? Math.max(0, prev - price * qty) : prev));
                setHoldings((prev) => ({ ...prev, [symbol]: (prev[symbol] || 0) + qty }));
            } else {
                setBalance((prev) => (Number.isFinite(prev) && Number.isFinite(price) ? prev + price * qty : prev));
                setHoldings((prev) => ({ ...prev, [symbol]: Math.max(0, (prev[symbol] || 0) - qty) }));
            }
        } catch (err) {
            const errMsg = err?.response?.data?.message || 'Trade request failed. Please try again.';
            setFeedback({ type: 'error', message: errMsg });
        } finally {
            setSubmitting('');
        }
    };

    return (
        <div className="h-full flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] text-blue-700 font-semibold">Trade Tool</p>
                    <h3 className="text-lg font-bold text-gray-900">Quick execute</h3>
                </div>
                <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                    {companies.slice(0, 30).map((item) => (
                        <option key={item.symbol} value={item.symbol}>
                            {item.symbol} · {item.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                    <div>
                        <p className="text-gray-600">Balance</p>
                        <p className="text-lg font-bold text-gray-900">{balance === null ? '—' : `$${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-600">Latest price</p>
                        <div className="inline-flex items-center gap-2 text-lg font-bold text-gray-900">
                            {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : null}
                            {price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                        </div>
                        <p className="text-xs text-gray-500">Owned: {holdings[symbol] || 0}</p>
                    </div>
                </div>

                <label className="flex flex-col gap-1 text-sm text-gray-700">
                    Quantity
                    <input
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {maxBuyable !== null ? (
                        <span className="text-xs text-gray-500">Max buyable: {maxBuyable}</span>
                    ) : null}
                </label>

                {feedback ? (
                    <div
                        className={`rounded-lg px-3 py-2 text-sm border ${
                            feedback.type === 'success'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                    >
                        {feedback.message}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleTrade('buy')}
                        disabled={submitting === 'buy'}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
                    >
                        {submitting === 'buy' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Buy
                    </button>
                    <button
                        onClick={() => handleTrade('sell')}
                        disabled={submitting === 'sell'}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
                    >
                        {submitting === 'sell' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Sell
                    </button>
                </div>
            </div>
        </div>
    );
};

const TransactionsToolPanel = ({ initialSymbol }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(initialSymbol ? 'symbol' : 'all');
    const [symbol, setSymbol] = useState(initialSymbol || '');

    useEffect(() => {
        const fetchAllTransactions = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/transactions');
                const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
                const mapped = raw
                    .map((tx, idx) => {
                        const shares = Number(tx?.assetQuantity) || 0;
                        const amount = Number(tx?.amount) || 0;
                        const price = shares ? amount / shares : 0;
                        const created = tx?.createdAt ? new Date(tx.createdAt) : null;
                        const createdMs = created ? created.getTime() : 0;
                        const date = created
                            ? created.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—';
                        const time = created
                            ? created.toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—';

                        return {
                            id: tx?.id ?? idx,
                            symbol: tx?.asset || 'N/A',
                            type: (tx?.type || '').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
                            shares,
                            price: Number(price.toFixed(2)),
                            amount: Number(amount.toFixed(2)),
                            date,
                            time,
                            status: 'executed',
                            createdMs,
                        };
                    })
                    .sort((a, b) => b.createdMs - a.createdMs);

                setTransactions(mapped);
            } catch (err) {
                console.error('Failed to fetch transactions', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllTransactions();
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'buy') return transactions.filter((tx) => tx.type === 'BUY');
        if (filter === 'sell') return transactions.filter((tx) => tx.type === 'SELL');
        if (filter === 'symbol' && symbol) return transactions.filter((tx) => tx.symbol === symbol);
        return transactions;
    }, [transactions, filter, symbol]);

    return (
        <div className="h-full flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] text-blue-700 font-semibold">Transactions Tool</p>
                    <h3 className="text-lg font-bold text-gray-900">History</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-lg border ${filter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('buy')}
                        className={`px-3 py-1.5 rounded-lg border ${filter === 'buy' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setFilter('sell')}
                        className={`px-3 py-1.5 rounded-lg border ${filter === 'sell' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                    >
                        Sell
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
                <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Filter by symbol (e.g. AAPL)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-white"
                />
                <button
                    onClick={() => setFilter(symbol ? 'symbol' : 'all')}
                    className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm"
                >
                    Apply
                </button>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="h-full flex items-center justify-center gap-2 text-gray-700">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Loading transactions...</span>
                    </div>
                ) : !filtered.length ? (
                    <div className="h-full flex items-center justify-center text-gray-600 text-sm">No transactions found.</div>
                ) : (
                    <div className="h-full overflow-y-auto divide-y divide-gray-100">
                        {filtered.map((tx) => (
                            <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{tx.symbol}</p>
                                    <p className="text-xs text-gray-500">{tx.date} · {tx.time}</p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                            tx.type === 'BUY'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}
                                    >
                                        {tx.type}
                                    </span>
                                    <p className="text-sm font-semibold text-gray-900">{tx.shares} @ ${tx.price}</p>
                                    <p className="text-xs text-gray-500">Total ${tx.amount.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ToolDisplay = ({ activeTool, onClose, companies = [] }) => {
    if (!activeTool) return null;
    const symbol = activeTool.payload?.symbol || activeTool.payload?.ticker;
    return (
        <div className="h-full flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-50">
                    <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white font-bold">{activeTool.tool?.[0]?.toUpperCase()}</div>
                    <div>
                        <p className="text-xs text-blue-100">Tool active</p>
                        <p className="text-base font-semibold text-white capitalize">{activeTool.tool}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-white/80 border border-white/30 rounded-full px-3 py-1 hover:bg-white/10"
                >
                    Close tool
                </button>
            </div>

            <div className="bg-white/5 border border-white/20 rounded-xl p-3 h-full overflow-hidden backdrop-blur-sm">
                <div className="h-full bg-gradient-to-br from-white to-slate-50 rounded-lg p-3 shadow-inner">
                    {activeTool.tool === 'graph' ? (
                        <GraphToolPanel initialSymbol={symbol || companies[0]?.symbol} companies={companies} />
                    ) : activeTool.tool === 'execute' ? (
                        <TradeToolPanel initialSymbol={symbol || companies[0]?.symbol} companies={companies} />
                    ) : (
                        <TransactionsToolPanel initialSymbol={symbol || ''} />
                    )}
                </div>
            </div>
        </div>
    );
};

const ChatPage = () => {
    const [messages, setMessages] = useState([
        // {
        //     id: 1,
        //     sender: 'bot',
        //     text: `Hello! I'm your AI Chat Bot for Financial Analysis and Assistance powered by Multi-Agent System.
        //     I can help you with market analysis, and automated investing tasks.
        //     How can I assist you today?`,
        //     timestamp: new Date(),
        // },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showLoader, setShowLoader] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null); // null means general
    const [activeTool, setActiveTool] = useState(null);
    const [agentsCollapsed, setAgentsCollapsed] = useState(false);
    const messagesEndRef = useRef(null);
    const [companies, setCompanies] = useState([]);
    const showTool = Boolean(activeTool);

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

    // Load companies list on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await api.get('/companies');
                const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
                setCompanies(raw);
            } catch (err) {
                console.error('Failed to fetch companies', err);
                setCompanies([]);
            }
        };
        fetchCompanies();
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
        if (selectedAgent === 'portfolio') return '/pa-chat';
        return '/general-chat';
    };

    const resolveToolFromResponse = (payload) => {
        if (!payload) return null;
        const rawKey = payload?.useTool || payload?.tool || payload?.toolType || payload?.action;
        const key = typeof rawKey === 'string' ? rawKey.toLowerCase() : null;
        if (!key) return null;
        if (['graph', 'chart', 'pricegraph', 'price_chart'].includes(key)) return 'graph';
        if (['execute', 'trade', 'trading', 'order'].includes(key)) return 'execute';
        if (['transactions', 'history', 'tx', 'txn'].includes(key)) return 'transactions';
        return null;
    };

    const extractToolPayload = (payload) => payload?.toolData || payload?.payload || payload?.data || {};

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
            const { data } = await api.post(endpoint, { userQuery: inputMessage });
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

            const tool = resolveToolFromResponse(data);
            if (tool) {
                setActiveTool({ tool, payload: extractToolPayload(data), receivedAt: Date.now() });
                setAgentsCollapsed(true);
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
            <div className="flex-1 px-4 pt-4 pb-2 flex flex-col gap-3">
                <div className="flex-1 flex justify-center">
                    <div className="flex w-[88vw] max-w-[2000px] gap-3 h-[calc(100vh-120px)] items-stretch">
                        {/* Rail with toggle + agents */}
                        <div
                            className={`relative flex-shrink-0 bg-white/5 border border-white/15 rounded-xl shadow-inner overflow-hidden transition-all duration-300 ${
                                agentsCollapsed ? 'w-12' : 'w-60'
                            }`}
                        >
                            <div
                                className={`absolute inset-x-0 top-0 py-2 flex items-center gap-2 ${
                                    agentsCollapsed ? 'px-1 justify-center' : 'px-3 justify-between'
                                }`}
                            >
                                <p
                                    className={`text-xs uppercase tracking-wide text-blue-100 transition-all duration-200 ${
                                        agentsCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                    }`}
                                >
                                    Agents
                                </p>
                                <button
                                    onClick={() => setAgentsCollapsed((prev) => !prev)}
                                    className="inline-flex items-center justify-center bg-white/15 border border-white/30 text-white text-xs px-2 py-1.5 rounded-full hover:bg-white/20"
                                    aria-label="Toggle agents"
                                >
                                    {agentsCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                                </button>
                            </div>

                            <div
                                className={`mt-12 h-[calc(100%-48px)] overflow-hidden transition-opacity duration-200 ${
                                    agentsCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                }`}
                            >
                                <div className="px-3 pb-3 flex flex-col gap-2 h-full">
                                    {[{ key: 'execute', label: 'Trade Execution', icon: Zap }, { key: 'research', label: 'Market Research', icon: Compass }, {key: 'portfolio', label: 'Portfolio Manager', icon: ChartPie}].map((agent) => {
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
                            </div>
                        </div>

                        {/* Chat shell */}
                        <div
                            className="relative flex-1 max-w-full"
                            style={{
                                transition: 'transform 220ms ease, width 220ms ease',
                            }}
                        >
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl flex overflow-hidden">
                                {/* Chat column */}
                                <div className="flex flex-col overflow-hidden flex-1">
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

                        {/* Tool column (desktop) */}
                        <div
                            className="hidden lg:flex flex-none rounded-xl bg-white/5 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden"
                            style={{
                                flexBasis: showTool ? '40%' : '48px',
                                width: showTool ? '40%' : '48px',
                                padding: showTool ? '12px' : '4px',
                                transition: 'flex-basis 280ms ease, width 280ms ease, padding 240ms ease',
                            }}
                        >
                            <div className="relative h-full w-full">
                                {/* Collapsed placeholder bar */}
                                <div
                                    className={`absolute inset-0 flex items-center justify-center text-white/70 transition-all duration-260 ease-out ${
                                        showTool ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'
                                    }`}
                                >
                                    
                                </div>

                                {/* Active tool panel with enter/exit from left/right */}
                                <div
                                    className={`absolute inset-0 transition-all duration-260 ease-out ${
                                        showTool ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                                    }`}
                                    style={{ transitionProperty: 'opacity, transform' }}
                                >
                                    <ToolDisplay activeTool={activeTool} onClose={() => setActiveTool(null)} companies={companies} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile tool panel stack */}
                {showTool ? (
                    <div
                        className="lg:hidden w-full max-w-6xl mx-auto"
                        style={{
                            transform: showTool ? 'translateY(0)' : 'translateY(24px)',
                            opacity: showTool ? 1 : 0,
                            transition: 'transform 220ms ease, opacity 220ms ease',
                        }}
                    >
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-xl mt-2">
                            <ToolDisplay activeTool={activeTool} onClose={() => setActiveTool(null)} companies={companies} />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ChatPage;
