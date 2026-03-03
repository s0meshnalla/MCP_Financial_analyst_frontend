import React, { useEffect, useState } from 'react';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Activity,
    AlertCircle,
    Bell,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Loader,
    BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const HomePage = () => {
    const navigate = useNavigate();
    const [marketData, setMarketData] = useState([]);
    const [portfolioValue, setPortfolioValue] = useState(0);
    const [todaysGain, setTodaysGain] = useState(0);
    const [todaysGainPercent, setTodaysGainPercent] = useState(0);
    const [activePositions, setActivePositions] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);

    // ── Fetch portfolio data ──
    useEffect(() => {
        const loadPortfolio = async () => {
            setLoading(true);
            setError(null);
            try {
                const [holdingRes, scRes] = await Promise.all([
                    api.get('/holdings'),
                    api.get('/user-stockchange'),
                ]);

                const rawHoldings = Array.isArray(holdingRes?.data?.data)
                    ? holdingRes.data.data
                    : Array.isArray(holdingRes?.data)
                        ? holdingRes.data
                        : [];

                const holdings = rawHoldings
                    .map((item) => ({
                        symbol: item?.symbol,
                        quantity: Number(item?.quantity),
                        price: Number(item?.price),
                    }))
                    .filter((item) => item.symbol && Number.isFinite(item.quantity) && item.quantity > 0);

                if (!holdings.length) {
                    setMarketData([]);
                    setPortfolioValue(0);
                    setTodaysGain(0);
                    setTodaysGainPercent(0);
                    setActivePositions(0);
                }

                const portfolioTotal = holdings.reduce(
                    (acc, { quantity, price }) => acc + (Number(quantity) || 0) * (Number(price) || 0),
                    0,
                );
                setPortfolioValue(portfolioTotal);
                setTodaysGain(0);
                setTodaysGainPercent(0);
                setActivePositions(holdings.length);

                try {
                    const scRaw = Array.isArray(scRes?.data?.data) ? scRes.data.data : [];
                    const normalized = scRaw.map((item) => ({
                        symbol: item?.symbol,
                        price: Number(item?.price) || 0,
                        change: Number(item?.change) || 0,
                        changePercent: Number(item?.changePercent) || 0,
                    }));
                    setMarketData(normalized);
                } catch (err) {
                    console.error('Failed to fetch user stock changes', err);
                    setMarketData([]);
                }
            } catch (err) {
                console.error('Failed to load portfolio data', err);
                setError('Could not load portfolio data right now.');
            } finally {
                setLoading(false);
            }
        };

        loadPortfolio();
    }, []);

    // ── Fetch triggered alerts ──
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                setAlertsLoading(true);
                const res = await api.get('/alerts', { params: { status: 'TRIGGERED' } });
                const raw = Array.isArray(res?.data?.data)
                    ? res.data.data
                    : Array.isArray(res?.data)
                        ? res.data
                        : [];

                const mapped = raw.map((a) => {
                    const triggered = a?.triggeredAt ? new Date(a.triggeredAt) : null;
                    const created = a?.createdAt ? new Date(a.createdAt) : null;
                    const referenceDate = triggered || created;
                    const timeAgo = referenceDate ? formatTimeAgo(referenceDate) : '—';
                    return {
                        id: a?.id,
                        symbol: a?.symbol || 'N/A',
                        condition: a?.condition || 'ABOVE',
                        targetPrice: Number(a?.targetPrice) || 0,
                        status: a?.status || 'TRIGGERED',
                        triggeredAt: triggered,
                        createdAt: created,
                        timeAgo,
                    };
                });

                setAlerts(mapped);
            } catch (err) {
                console.error('Failed to fetch alerts', err);
                setAlerts([]);
            } finally {
                setAlertsLoading(false);
            }
        };

        fetchAlerts();
    }, []);

    const formatTimeAgo = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const formatCurrency = (value) =>
        Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    const formatSignedCurrency = (value) => {
        const abs = Math.abs(Number(value || 0));
        const sign = Number(value || 0) >= 0 ? '+' : '-';
        return `${sign}${formatCurrency(abs)}`;
    };

    const formatPercent = (value) => {
        const num = Number(value || 0);
        const sign = num >= 0 ? '+' : '';
        return `${sign}${Math.abs(num).toFixed(2)}%`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back!</h1>
                    <p className="text-gray-500 mt-1">Here's your portfolio overview for today</p>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {/* Portfolio Value */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Portfolio Value</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(portfolioValue)}</h3>
                                <p className={`text-sm mt-0.5 font-medium ${todaysGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatSignedCurrency(todaysGain)} ({formatPercent(todaysGainPercent)})
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Today's Gain */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today's Gain</p>
                                <h3 className={`text-2xl font-bold mt-1 ${todaysGain >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {formatSignedCurrency(todaysGain)}
                                </h3>
                                <p className={`text-sm mt-0.5 font-medium ${todaysGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatPercent(todaysGainPercent)}
                                </p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${todaysGain >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {todaysGain >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                        </div>
                    </div>

                    {/* Active Positions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Positions</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">{activePositions}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Across your holdings</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-600">
                                <Activity className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Alerts */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Triggered Alerts</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                    {alertsLoading ? '—' : alerts.length}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {alerts.length === 0 ? 'No new alerts' : 'Notifications'}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 relative">
                                <Bell className="w-5 h-5" />
                                {alerts.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                        {alerts.length > 9 ? '9+' : alerts.length}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Market Overview ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Market Overview</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Your holdings performance</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/graphs')}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl shadow hover:bg-blue-700 transition"
                        >
                            <BarChart3 className="w-4 h-4" />
                            View Charts
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                            <Loader className="w-4 h-4 animate-spin" />
                            Loading your holdings...
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Symbol</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Change</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">% Change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {marketData.length === 0 && !loading && (
                                    <tr>
                                        <td className="py-6 px-4 text-sm text-gray-400 text-center" colSpan="4">
                                            No holdings found yet.
                                        </td>
                                    </tr>
                                )}
                                {marketData.map((stock) => {
                                    const isUp = stock.change >= 0;
                                    return (
                                        <tr key={stock.symbol} className="hover:bg-gray-50/50 transition">
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {stock.symbol.slice(0, 2)}
                                                    </span>
                                                    <span className="font-semibold text-gray-900">{stock.symbol}</span>
                                                </span>
                                            </td>
                                            <td className="text-right py-3.5 px-4 font-medium text-gray-700">{formatCurrency(stock.price)}</td>
                                            <td className={`text-right py-3.5 px-4 font-medium ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                                <span className="inline-flex items-center gap-1">
                                                    {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                                    {formatSignedCurrency(stock.change)}
                                                </span>
                                            </td>
                                            <td className={`text-right py-3.5 px-4 ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {Math.abs(stock.changePercent).toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Triggered Alerts ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900">Triggered Alerts</h2>
                            {alerts.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                    {alerts.length}
                                </span>
                            )}
                        </div>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>

                    {alertsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading alerts...</span>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="text-center py-8">
                            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No triggered alerts at this time.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {alerts.map((alert) => {
                                const isAbove = alert.condition === 'ABOVE';
                                return (
                                    <div
                                        key={alert.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border-l-4 transition hover:shadow-sm ${
                                            isAbove
                                                ? 'bg-emerald-50/50 border-emerald-500'
                                                : 'bg-amber-50/50 border-amber-500'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isAbove ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                                {isAbove ? (
                                                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <ArrowDownRight className="w-4 h-4 text-amber-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {alert.symbol}{' '}
                                                    <span className="font-normal text-gray-500">
                                                        went {isAbove ? 'above' : 'below'}
                                                    </span>{' '}
                                                    {formatCurrency(alert.targetPrice)}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">{alert.timeAgo}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                            isAbove ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {alert.condition}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick-nav */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Dashboard', desc: 'Detailed portfolio view', path: '/dashboard' },
                        { label: 'Chat', desc: 'Talk to AI agents', path: '/chat' },
                        { label: 'Transactions', desc: 'Trade history', path: '/transactions' },
                    ].map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 hover:shadow-md transition group"
                        >
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">{item.label}</p>
                                <p className="text-xs text-gray-400">{item.desc}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
