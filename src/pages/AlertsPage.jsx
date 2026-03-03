import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Trash2, Plus, Search, Loader, ArrowLeft, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const CONDITIONS = [
    { value: 'ABOVE', label: 'Price above' },
    { value: 'BELOW', label: 'Price below' },
];

const CHANNELS = [
    { value: 'IN_APP', label: 'In-App' },
    { value: 'USER', label: 'User' },
];

const STATUSES = ['ALL', 'ACTIVE', 'TRIGGERED', 'CANCELLED'];

const AlertsPage = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [compSearch, setCompSearch] = useState('');
    const [deleting, setDeleting] = useState(null);

    // Form state
    const [form, setForm] = useState({
        symbol: '',
        condition: 'ABOVE',
        targetPrice: '',
        channel: 'IN_APP',
    });
    const [creating, setCreating] = useState(false);

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);
            const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
            const res = await api.get('/alerts', { params });
            setAlerts(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    const fetchCompanies = async () => {
        if (companies.length) return;
        try {
            const res = await api.get('/companies');
            setCompanies(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.symbol || !form.targetPrice) return;
        setCreating(true);
        try {
            await api.post('/alerts', {
                symbol: form.symbol,
                condition: form.condition,
                targetPrice: parseFloat(form.targetPrice),
                channel: form.channel,
            });
            setShowCreate(false);
            setForm({ symbol: '', condition: 'ABOVE', targetPrice: '', channel: 'IN_APP' });
            fetchAlerts();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to create alert');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this alert?')) return;
        setDeleting(id);
        try {
            await api.delete(`/alerts/${id}`);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to delete alert');
        } finally {
            setDeleting(null);
        }
    };

    const fmt = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    const filteredSearch = companies.filter(c => {
        const q = compSearch.toLowerCase().trim();
        return !q || c.symbol?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q);
    });

    const statusBadge = (status) => {
        const map = {
            ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', icon: <Clock className="w-3 h-3" /> },
            TRIGGERED: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <CheckCircle2 className="w-3 h-3" /> },
            CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <AlertTriangle className="w-3 h-3" /> },
        };
        const s = map[status] || map.ACTIVE;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
                {s.icon}{status}
            </span>
        );
    };

    const conditionLabel = (c) => {
        const m = { ABOVE: 'Above', BELOW: 'Below' };
        return m[c] || c;
    };

    const conditionIcon = (c) => {
        if (c === 'ABOVE') return <TrendingUp className="w-4 h-4 text-green-500" />;
        return <TrendingDown className="w-4 h-4 text-red-500" />;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2 transition text-sm">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-medium">Back to Home</span>
                        </button>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Price Alerts</h1>
                        <p className="text-gray-500 mt-1">Get notified on price movements</p>
                    </div>
                    <button
                        onClick={() => { setShowCreate(true); fetchCompanies(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        New Alert
                    </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 mb-6">
                    <Filter className="w-4 h-4 text-gray-400" />
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${statusFilter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Alerts List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Loading alerts...</span>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 text-lg font-medium">No alerts found</p>
                        <p className="text-gray-400 text-sm mt-1">Create alerts to monitor price movements</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow">
                                        {(alert.symbol || '??').slice(0, 2)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900">{alert.symbol}</p>
                                            {statusBadge(alert.status)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            {conditionIcon(alert.condition)}
                                            <span>{conditionLabel(alert.condition)} {fmt(alert.targetPrice)}</span>
                                            <span className="text-gray-300">|</span>
                                            <span>{alert.channel}</span>
                                        </div>
                                        {alert.createdAt && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Created {new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {alert.status !== 'CANCELLED' && (
                                    <button
                                        onClick={() => handleDelete(alert.id)}
                                        disabled={deleting === alert.id}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                    >
                                        {deleting === alert.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Alert Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Create Alert</h3>
                            <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            {/* Symbol Picker */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Stock Symbol</label>
                                {form.symbol ? (
                                    <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2.5">
                                        <span className="font-bold text-blue-700 text-sm">{form.symbol}</span>
                                        <button type="button" onClick={() => setForm(p => ({ ...p, symbol: '' }))} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                                            <Search className="w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={compSearch}
                                                onChange={(e) => setCompSearch(e.target.value)}
                                                placeholder="Search ticker or company..."
                                                className="w-full bg-transparent outline-none text-sm"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-40 overflow-y-auto mt-1 space-y-1">
                                            {filteredSearch.slice(0, 30).map(c => (
                                                <button
                                                    type="button"
                                                    key={c.symbol}
                                                    onClick={() => { setForm(p => ({ ...p, symbol: c.symbol })); setCompSearch(''); }}
                                                    className="w-full text-left flex justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                                                >
                                                    <span className="font-semibold text-gray-900">{c.symbol}</span>
                                                    <span className="text-gray-400 text-xs truncate max-w-[180px]">{c.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Condition */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Condition</label>
                                <select
                                    value={form.condition}
                                    onChange={(e) => setForm(p => ({ ...p, condition: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {CONDITIONS.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Price */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.targetPrice}
                                    onChange={(e) => setForm(p => ({ ...p, targetPrice: e.target.value }))}
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Channel */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notification Channel</label>
                                <div className="flex gap-2">
                                    {CHANNELS.map(ch => (
                                        <button
                                            type="button"
                                            key={ch.value}
                                            onClick={() => setForm(p => ({ ...p, channel: ch.value }))}
                                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition ${form.channel === ch.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {ch.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={creating || !form.symbol || !form.targetPrice}
                                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? <Loader className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                                {creating ? 'Creating...' : 'Create Alert'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertsPage;
