import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    BarChart3,
    PieChart,
    AlertTriangle,
    Clock,
    CheckCircle,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Wallet,
    Layers,
    Loader,
    LineChart as LineChartIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const SECTOR_COLORS = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-purple-500 to-purple-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
];

const SECTOR_BG = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-pink-500',
];

const DashboardPage = () => {
    const navigate = useNavigate();
    const transactionsFetched = useRef(false);
    const dashboardFetched = useRef(false);

    const [positions, setPositions] = useState([]);
    const [recentTrades, setRecentTrades] = useState([]);
    const [allocation, setAllocation] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [dayChange, setDayChange] = useState(0);
    const [dayChangePercent, setDayChangePercent] = useState(0);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadingTrades, setLoadingTrades] = useState(true);

    // Portfolio history
    const [historyData, setHistoryData] = useState([]);
    const [historyPeriod, setHistoryPeriod] = useState('LAST_30_DAYS');
    const [historyInterval, setHistoryInterval] = useState('DAILY');
    const [loadingHistory, setLoadingHistory] = useState(false);

    const HISTORY_PERIODS = [
        { value: 'LAST_7_DAYS', label: '1W' },
        { value: 'LAST_30_DAYS', label: '1M' },
        { value: 'LAST_90_DAYS', label: '3M' },
        { value: 'LAST_1_YEAR', label: '1Y' },
    ];

    const fetchPortfolioHistory = useCallback(async () => {
        try {
            setLoadingHistory(true);
            const res = await api.get('/portfolio/history', {
                params: { period: historyPeriod, interval: historyInterval }
            });
            const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
            setHistoryData(raw.map(d => ({
                date: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
                totalValue: Number(d.totalValue || 0),
                cashBalance: Number(d.cashBalance || 0),
                investedValue: Number(d.investedValue || 0),
            })));
        } catch (err) {
            console.error('Failed to fetch portfolio history', err);
        } finally {
            setLoadingHistory(false);
        }
    }, [historyPeriod, historyInterval]);

    useEffect(() => { fetchPortfolioHistory(); }, [fetchPortfolioHistory]);

    const agentInsights = [
        { agent: 'Technical Analysis', status: 'active', lastUpdate: '2 mins ago', message: 'Bullish trend detected in AAPL' },
        { agent: 'Sentiment Analysis', status: 'active', lastUpdate: '5 mins ago', message: 'Positive sentiment: +0.78' },
        { agent: 'Risk Management', status: 'warning', lastUpdate: '10 mins ago', message: 'Portfolio exposure at 85%' },
        { agent: 'Portfolio Manager', status: 'active', lastUpdate: '15 mins ago', message: 'Rebalancing recommended' },
    ];

    // Performance bar: proportion of gain vs total invested cost
    const performanceBar = useMemo(() => {
        if (!positions.length) return { pct: 0, color: 'from-blue-500 to-blue-600' };
        const invested = positions.reduce((s, p) => s + (p.avgPrice || 0) * (p.shares || 0), 0);
        if (!invested) return { pct: 0, color: 'from-blue-500 to-blue-600' };
        const ratio = totalValue / invested; // >1 means profit
        const pct = Math.min(100, Math.max(5, ratio * 50)); // 50% = breakeven, 100% = doubled
        const color = dayChange >= 0 ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600';
        return { pct, color };
    }, [positions, totalValue, dayChange]);

    // ── Transactions ──
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoadingTrades(true);
                const { data } = await api.get('/transactions');
                const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
                const mapped = raw
                    .map((tx, idx) => {
                        const shares = Number(tx?.assetQuantity) || 0;
                        const amount = Number(tx?.amount) || 0;
                        const price = shares ? amount / shares : 0;
                        const created = tx?.createdAt ? new Date(tx.createdAt) : null;
                        const createdMs = created ? created.getTime() : 0;
                        const time = created
                            ? created.toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            : '—';
                        return {
                            id: tx?.id ?? idx,
                            symbol: tx?.asset || 'N/A',
                            type: (tx?.type || '').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
                            shares,
                            price: Number(price.toFixed(2)),
                            time,
                            status: 'executed',
                            createdMs,
                        };
                    })
                    .sort((a, b) => b.createdMs - a.createdMs)
                    .slice(0, 4)
                    .map(({ createdMs, ...rest }) => rest);
                setRecentTrades(mapped);
            } catch (err) {
                console.error('Failed to fetch transactions', err);
            } finally {
                setLoadingTrades(false);
            }
        };
        if (!transactionsFetched.current) {
            transactionsFetched.current = true;
            fetchTransactions();
        }
    }, []);

    // ── Dashboard positions + sector allocation ──
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoadingDashboard(true);
                const { data } = await api.get('/dashboard');
                const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
                const numberOrZero = (val) => (Number.isFinite(val) ? val : 0);

                const mapped = raw.map((item, idx) => {
                    const shares = Number(item?.shares) || 0;
                    const avgPrice = Number(item?.avgBuyPrice ?? item?.avgprice ?? item?.avg_price) || 0;
                    const currentPrice = Number(item?.currentPrice ?? item?.currentprice ?? item?.current_price) || 0;
                    const value = Number(item?.totalAmount ?? item?.totalamount ?? item?.total_amount) || 0;
                    const gainLoss = Number(item?.gainLoss ?? item?.gainloss ?? item?.gain_loss) || 0;
                    return {
                        id: item?.symbol || idx,
                        symbol: item?.symbol || 'N/A',
                        shares,
                        avgPrice,
                        currentPrice,
                        value,
                        gain: gainLoss >= 0 ? gainLoss : undefined,
                        loss: gainLoss < 0 ? gainLoss : undefined,
                    };
                });

                const sorted = [...mapped].sort((a, b) => {
                    const valueDiff = numberOrZero(b.value) - numberOrZero(a.value);
                    if (valueDiff !== 0) return valueDiff;
                    return numberOrZero(b.gain ?? b.loss) - numberOrZero(a.gain ?? a.loss);
                });

                const tv = sorted.reduce((sum, p) => sum + (p.value || 0), 0);
                const tg = sorted.reduce((sum, p) => sum + ((p.gain ?? p.loss) || 0), 0);
                const dcp = tv ? Number(((tg / tv) * 100).toFixed(2)) : 0;

                setPositions(sorted);
                setTotalValue(Number(tv.toFixed(2)));
                setDayChange(Number(tg.toFixed(2)));
                setDayChangePercent(dcp);

                // Fetch sector info for these symbols
                const symbols = sorted.map((p) => p.symbol).filter((s) => s && s !== 'N/A');
                if (symbols.length) {
                    try {
                        const compRes = await api.post('/companies/by-symbols', { symbols });
                        const companies = Array.isArray(compRes?.data?.data) ? compRes.data.data : [];

                        // Build symbol → sector map
                        const symbolSector = {};
                        companies.forEach((c) => {
                            if (c?.symbol && c?.sector?.name) {
                                symbolSector[c.symbol] = c.sector.name;
                            }
                        });

                        // Aggregate value by sector
                        const sectorTotals = {};
                        sorted.forEach((p) => {
                            const sec = symbolSector[p.symbol] || 'Other';
                            sectorTotals[sec] = (sectorTotals[sec] || 0) + (p.value || 0);
                        });

                        const alloc = Object.entries(sectorTotals)
                            .map(([sector, value]) => ({
                                sector,
                                value: Number(value.toFixed(2)),
                                percentage: tv ? Number(((value / tv) * 100).toFixed(1)) : 0,
                            }))
                            .sort((a, b) => b.value - a.value);

                        setAllocation(alloc);
                    } catch (err) {
                        console.error('Failed to fetch company sectors', err);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            } finally {
                setLoadingDashboard(false);
            }
        };

        if (!dashboardFetched.current) {
            dashboardFetched.current = true;
            fetchDashboard();
        }
    }, []);

    const fmt = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Portfolio Dashboard</h1>
                    <p className="text-gray-500 mt-1">Real-time monitoring &amp; analytics powered by MCP Multi-Agent System</p>
                </div>

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {[
                        {
                            label: 'Total Value',
                            value: fmt(totalValue),
                            sub: `${dayChange >= 0 ? '+' : ''}${fmt(dayChange)}`,
                            subColor: dayChange >= 0 ? 'text-emerald-600' : 'text-red-600',
                            icon: Wallet,
                            iconBg: 'bg-blue-100 text-blue-600',
                        },
                        {
                            label: 'Gain / Loss',
                            value: `${dayChange >= 0 ? '+' : ''}${fmt(dayChange)}`,
                            sub: `${dayChangePercent >= 0 ? '+' : ''}${dayChangePercent}%`,
                            subColor: dayChange >= 0 ? 'text-emerald-600' : 'text-red-600',
                            icon: dayChange >= 0 ? TrendingUp : TrendingDown,
                            iconBg: dayChange >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600',
                        },
                        {
                            label: 'Positions',
                            value: positions.length,
                            sub: `${allocation.length} sector${allocation.length !== 1 ? 's' : ''}`,
                            subColor: 'text-gray-500',
                            icon: Layers,
                            iconBg: 'bg-purple-100 text-purple-600',
                        },
                        {
                            label: 'Recent Trades',
                            value: recentTrades.length,
                            sub: 'Latest activity',
                            subColor: 'text-gray-500',
                            icon: BarChart3,
                            iconBg: 'bg-amber-100 text-amber-600',
                        },
                    ].map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
                                        <p className={`text-sm mt-0.5 font-medium ${card.subColor}`}>{card.sub}</p>
                                    </div>
                                    <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Performance + Allocation ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Performance */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Portfolio Performance</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Value vs invested cost</p>
                            </div>
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                        </div>

                        <div className="flex items-end justify-between mb-3">
                            <span className="text-3xl font-extrabold text-gray-900">{fmt(totalValue)}</span>
                            <div className="text-right">
                                <span className={`text-lg font-bold ${dayChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {dayChange >= 0 ? '+' : ''}{fmt(dayChange)}
                                </span>
                                <span className={`text-sm ml-1.5 font-medium ${dayChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    ({dayChangePercent >= 0 ? '+' : ''}{dayChangePercent}%)
                                </span>
                            </div>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div
                                className={`bg-gradient-to-r ${performanceBar.color} h-3 rounded-full transition-all duration-700`}
                                style={{ width: `${performanceBar.pct}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
                            <span>0%</span>
                            <span className="font-medium text-gray-500">Break-even</span>
                            <span>2×</span>
                        </div>

                        {/* Mini position bars */}
                        {positions.length > 0 && (
                            <div className="mt-6 space-y-2">
                                {positions.slice(0, 5).map((p) => {
                                    const gl = (p.gain ?? p.loss) || 0;
                                    const pct = totalValue ? Math.max(2, (p.value / totalValue) * 100) : 0;
                                    return (
                                        <div key={p.symbol} className="flex items-center gap-3 text-sm">
                                            <span className="w-14 font-semibold text-gray-700">{p.symbol}</span>
                                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full ${gl >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-medium w-20 text-right ${gl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {gl >= 0 ? '+' : ''}{fmt(gl)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Allocation */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col max-h-[500px]">
                        <div className="flex items-center justify-between mb-5 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Asset Allocation</h2>
                                <p className="text-xs text-gray-400 mt-0.5">By sector</p>
                            </div>
                            <PieChart className="w-5 h-5 text-purple-500" />
                        </div>

                        {loadingDashboard && !allocation.length ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                                <Loader className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Loading...</span>
                            </div>
                        ) : !allocation.length ? (
                            <p className="text-sm text-gray-400 text-center py-8">No allocation data</p>
                        ) : (
                            <>
                                {/* Stacked bar */}
                                <div className="flex w-full h-4 rounded-full overflow-hidden mb-4 flex-shrink-0">
                                    {allocation.map((item, i) => (
                                        <div
                                            key={item.sector}
                                            className={`h-full ${SECTOR_BG[i % SECTOR_BG.length]} transition-all duration-500`}
                                            style={{ width: `${item.percentage}%` }}
                                            title={`${item.sector}: ${item.percentage}%`}
                                        />
                                    ))}
                                </div>

                                <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
                                    {allocation.map((item, i) => (
                                        <div key={item.sector}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="flex items-center gap-2 text-gray-700 font-medium">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${SECTOR_BG[i % SECTOR_BG.length]}`} />
                                                    {item.sector}
                                                </span>
                                                <span className="font-semibold text-gray-900">{item.percentage}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full bg-gradient-to-r ${SECTOR_COLORS[i % SECTOR_COLORS.length]} transition-all duration-500`}
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{fmt(item.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Portfolio History Chart ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Portfolio History</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Track your portfolio value over time</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {HISTORY_PERIODS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setHistoryPeriod(p.value)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                        historyPeriod === p.value
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Loading history...</span>
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="text-center py-16">
                            <LineChartIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No portfolio history data available</p>
                        </div>
                    ) : (
                        <>
                            {/* Legend */}
                            <div className="flex items-center gap-5 mb-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-xs font-medium text-gray-600">Total Value</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-medium text-gray-600">Invested</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                                    <span className="text-xs font-medium text-gray-600">Cash Balance</span>
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={historyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="totalValueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                                        formatter={(value, name) => [`$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`, name]}
                                    />
                                    <Area type="monotone" dataKey="totalValue" name="Total Value" stroke="#3b82f6" strokeWidth={2} fill="url(#totalValueGrad)" />
                                    <Area type="monotone" dataKey="investedValue" name="Invested" stroke="#10b981" strokeWidth={1.5} fill="url(#investedGrad)" strokeDasharray="4 2" />
                                    <Line type="monotone" dataKey="cashBalance" name="Cash Balance" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </>
                    )}
                </div>

                {/* ── Current Positions table ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Current Positions</h2>

                    {loadingDashboard && !positions.length ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Loading positions...</span>
                        </div>
                    ) : !positions.length ? (
                        <p className="text-sm text-gray-400 text-center py-10">No positions yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Symbol</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Shares</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Price</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gain / Loss</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {positions.map((position) => {
                                        const avg = Number.isFinite(position.avgPrice) ? position.avgPrice : 0;
                                        const cur = Number.isFinite(position.currentPrice) ? position.currentPrice : 0;
                                        const val = Number.isFinite(position.value) ? position.value : 0;
                                        const gl = Number.isFinite(position.gain || position.loss) ? (position.gain || position.loss) : 0;
                                        const isUp = gl >= 0;
                                        return (
                                            <tr key={position.symbol} className="hover:bg-gray-50/50 transition">
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                            {position.symbol.slice(0, 2)}
                                                        </span>
                                                        <span className="font-semibold text-gray-900">{position.symbol}</span>
                                                    </span>
                                                </td>
                                                <td className="text-right py-3.5 px-4 text-gray-700">{position.shares}</td>
                                                <td className="text-right py-3.5 px-4 text-gray-700">{fmt(avg)}</td>
                                                <td className="text-right py-3.5 px-4 text-gray-700">{fmt(cur)}</td>
                                                <td className="text-right py-3.5 px-4 font-semibold text-gray-900">{fmt(val)}</td>
                                                <td className={`text-right py-3.5 px-4 font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                        {isUp ? '+' : ''}{fmt(gl)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Insights + Recent Trades ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Multi-Agent Insights */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Multi-Agent Insights</h2>
                        <div className="space-y-3">
                            {agentInsights.map((insight, index) => (
                                <div key={index} className="p-4 rounded-xl border border-gray-100 hover:shadow-sm transition bg-gray-50/50">
                                    <div className="flex items-start justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            {insight.status === 'active' ? (
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            )}
                                            <span className="font-semibold text-gray-900 text-sm">{insight.agent}</span>
                                        </div>
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {insight.lastUpdate}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 pl-4">{insight.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Trades */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Recent Trades</h2>
                            <button
                                onClick={() => navigate('/transactions')}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition"
                            >
                                View all
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {loadingTrades ? (
                            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                                <Loader className="w-5 h-5 animate-spin" />
                                <span>Loading trades...</span>
                            </div>
                        ) : !recentTrades.length ? (
                            <p className="text-sm text-gray-400 text-center py-10">No recent trades.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {recentTrades.map((trade) => (
                                    <div key={trade.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:shadow-sm transition bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                trade.type === 'BUY'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {trade.type}
                                            </span>
                                            <div>
                                                <span className="font-semibold text-gray-900 text-sm">{trade.symbol}</span>
                                                <p className="text-xs text-gray-400">{trade.shares} shares @ ${trade.price}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <span className="text-xs text-gray-400">{trade.time}</span>
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
