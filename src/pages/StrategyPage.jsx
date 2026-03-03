import React, { useState, useEffect, useCallback } from 'react';
import { Target, Edit3, Plus, Loader, ArrowLeft, Save, X, Briefcase, Clock, ShieldCheck, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const RISK_PROFILES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];
const REBALANCING_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'NONE'];

const StrategyPage = () => {
    const navigate = useNavigate();
    const [strategy, setStrategy] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [sectors, setSectors] = useState([]);

    const [form, setForm] = useState({
        strategyType: '',
        goal: '',
        timeHorizonMonths: 12,
        riskProfile: 'MODERATE',
        rebalancingFrequency: 'MONTHLY',
        targetAllocation: {},
        sectorLimits: {},
    });

    // Allocation management
    const [newAllocKey, setNewAllocKey] = useState('');
    const [newAllocVal, setNewAllocVal] = useState('');
    const [newSectorKey, setNewSectorKey] = useState('');
    const [newSectorVal, setNewSectorVal] = useState('');

    const fetchStrategy = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/strategy');
            if (res?.data?.data) {
                setStrategy(res.data.data);
            } else {
                setStrategy(null);
            }
        } catch (err) {
            if (err?.response?.status === 404) {
                setStrategy(null);
            } else {
                console.error('Failed to fetch strategy', err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/strategy/history');
            setHistory(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (err) {
            console.error('Failed to fetch strategy history', err);
        }
    };

    const fetchSectors = async () => {
        if (sectors.length) return;
        try {
            const res = await api.get('/sectors');
            setSectors(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (err) {
            console.error('Failed to fetch sectors', err);
        }
    };

    useEffect(() => { fetchStrategy(); }, [fetchStrategy]);

    const openCreateForm = () => {
        setForm({
            strategyType: '',
            goal: '',
            timeHorizonMonths: 12,
            riskProfile: 'MODERATE',
            rebalancingFrequency: 'MONTHLY',
            targetAllocation: {},
            sectorLimits: {},
        });
        setIsEditing(false);
        setShowForm(true);
        fetchSectors();
    };

    const openEditForm = () => {
        if (!strategy) return;
        setForm({
            strategyType: strategy.strategyType || '',
            goal: strategy.goal || '',
            timeHorizonMonths: strategy.timeHorizonMonths || 12,
            riskProfile: strategy.riskProfile || 'MODERATE',
            rebalancingFrequency: strategy.rebalancingFrequency || 'MONTHLY',
            targetAllocation: strategy.targetAllocation || {},
            sectorLimits: strategy.sectorLimits || {},
        });
        setIsEditing(true);
        setShowForm(true);
        fetchSectors();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing && strategy?.id) {
                await api.put(`/strategy/${strategy.id}`, form);
            } else {
                await api.post('/strategy', form);
            }
            setShowForm(false);
            fetchStrategy();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to save strategy');
        } finally {
            setSaving(false);
        }
    };

    const addAllocation = () => {
        if (!newAllocKey.trim() || !newAllocVal) return;
        setForm(p => ({
            ...p,
            targetAllocation: { ...p.targetAllocation, [newAllocKey.trim()]: parseFloat(newAllocVal) }
        }));
        setNewAllocKey('');
        setNewAllocVal('');
    };

    const removeAllocation = (key) => {
        setForm(p => {
            const copy = { ...p.targetAllocation };
            delete copy[key];
            return { ...p, targetAllocation: copy };
        });
    };

    const addSectorLimit = () => {
        if (!newSectorKey.trim() || !newSectorVal) return;
        setForm(p => ({
            ...p,
            sectorLimits: { ...p.sectorLimits, [newSectorKey.trim()]: parseFloat(newSectorVal) }
        }));
        setNewSectorKey('');
        setNewSectorVal('');
    };

    const removeSectorLimit = (key) => {
        setForm(p => {
            const copy = { ...p.sectorLimits };
            delete copy[key];
            return { ...p, sectorLimits: copy };
        });
    };

    const riskColor = (p) => ({ CONSERVATIVE: 'text-green-600 bg-green-50', MODERATE: 'text-amber-600 bg-amber-50', AGGRESSIVE: 'text-red-600 bg-red-50' }[p] || 'text-gray-600 bg-gray-50');

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
                <Navbar />
                <div className="flex items-center justify-center py-32 gap-2 text-gray-400">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Loading strategy...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2 transition text-sm">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-medium">Back to Home</span>
                        </button>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Investment Strategy</h1>
                        <p className="text-gray-500 mt-1">Define and manage your investment approach</p>
                    </div>
                    {strategy ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowHistory(true); fetchHistory(); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl border border-gray-200 hover:border-blue-300 transition text-sm font-semibold"
                            >
                                <Clock className="w-4 h-4" />
                                History
                            </button>
                            <button
                                onClick={openEditForm}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold shadow-lg shadow-blue-600/20"
                            >
                                <Edit3 className="w-4 h-4" />
                                Edit
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={openCreateForm}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold shadow-lg shadow-blue-600/20"
                        >
                            <Plus className="w-4 h-4" />
                            Create Strategy
                        </button>
                    )}
                </div>

                {/* Strategy Display */}
                {!strategy ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 text-lg font-medium">No strategy configured</p>
                        <p className="text-gray-400 text-sm mt-1">Create a strategy to guide your investment decisions</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Summary Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow">
                                    <Briefcase className="w-5 h-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{strategy.strategyType || 'Custom Strategy'}</h2>
                                    <p className="text-sm text-gray-500">{strategy.goal || '—'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Time Horizon</p>
                                    <p className="text-sm font-bold text-gray-900">{strategy.timeHorizonMonths} months</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Risk Profile</p>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${riskColor(strategy.riskProfile)}`}>
                                        <ShieldCheck className="w-3 h-3" />{strategy.riskProfile}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Rebalancing</p>
                                    <p className="text-sm font-bold text-gray-900">{strategy.rebalancingFrequency || '—'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Last Updated</p>
                                    <p className="text-sm font-bold text-gray-900">
                                        {strategy.updatedAt ? new Date(strategy.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Target Allocation */}
                        {strategy.targetAllocation && Object.keys(strategy.targetAllocation).length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" />Target Allocation
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(strategy.targetAllocation).map(([k, v]) => (
                                        <div key={k} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">{k}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(v, 100)}%` }} />
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 w-12 text-right">{v}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sector Limits */}
                        {strategy.sectorLimits && Object.keys(strategy.sectorLimits).length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-amber-500" />Sector Limits
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(strategy.sectorLimits).map(([k, v]) => (
                                        <span key={k} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold">
                                            {k}: max {v}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Strategy' : 'Create Strategy'}</h3>
                            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Strategy Type</label>
                                <input
                                    type="text"
                                    value={form.strategyType}
                                    onChange={(e) => setForm(p => ({ ...p, strategyType: e.target.value }))}
                                    placeholder="e.g., Growth, Value, Income"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Goal</label>
                                <textarea
                                    value={form.goal}
                                    onChange={(e) => setForm(p => ({ ...p, goal: e.target.value }))}
                                    rows={2}
                                    placeholder="Describe your investment goal..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Time Horizon (months)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.timeHorizonMonths}
                                        onChange={(e) => setForm(p => ({ ...p, timeHorizonMonths: parseInt(e.target.value) || 1 }))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Risk Profile</label>
                                    <select
                                        value={form.riskProfile}
                                        onChange={(e) => setForm(p => ({ ...p, riskProfile: e.target.value }))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {RISK_PROFILES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Rebalancing Frequency</label>
                                <select
                                    value={form.rebalancingFrequency}
                                    onChange={(e) => setForm(p => ({ ...p, rebalancingFrequency: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {REBALANCING_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>

                            {/* Target Allocation */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-2 block">Target Allocation (%)</label>
                                {Object.entries(form.targetAllocation).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm text-gray-700 flex-1">{k}</span>
                                        <span className="text-sm font-bold text-gray-900 w-12 text-right">{v}%</span>
                                        <button type="button" onClick={() => removeAllocation(k)} className="text-red-400 hover:text-red-600 transition">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        placeholder="Asset class"
                                        value={newAllocKey}
                                        onChange={(e) => setNewAllocKey(e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="%"
                                        value={newAllocVal}
                                        onChange={(e) => setNewAllocVal(e.target.value)}
                                        className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                                    />
                                    <button type="button" onClick={addAllocation} className="px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Sector Limits */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-2 block">Sector Limits (%)</label>
                                {Object.entries(form.sectorLimits).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2 mb-1.5">
                                        <span className="text-sm text-gray-700 flex-1">{k}</span>
                                        <span className="text-sm font-bold text-gray-900 w-16 text-right">max {v}%</span>
                                        <button type="button" onClick={() => removeSectorLimit(k)} className="text-red-400 hover:text-red-600 transition">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <select
                                        value={newSectorKey}
                                        onChange={(e) => setNewSectorKey(e.target.value)}
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none"
                                    >
                                        <option value="">Select sector</option>
                                        {sectors.map(s => (
                                            <option key={s.id || s.name} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="%"
                                        value={newSectorVal}
                                        onChange={(e) => setNewSectorVal(e.target.value)}
                                        className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                                    />
                                    <button type="button" onClick={addSectorLimit} className="px-2 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : isEditing ? 'Update Strategy' : 'Create Strategy'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Strategy History</h3>
                            <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-5 py-4 max-h-96 overflow-y-auto">
                            {history.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">No history available</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((entry, i) => (
                                        <div key={i} className="bg-gray-50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-gray-900">{entry.strategyType || 'Strategy'}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${riskColor(entry.riskProfile)}`}>
                                                    {entry.riskProfile}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">{entry.goal || '—'}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                <span>{entry.timeHorizonMonths}mo</span>
                                                <span>{entry.rebalancingFrequency}</span>
                                                {entry.updatedAt && (
                                                    <span>{new Date(entry.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyPage;
