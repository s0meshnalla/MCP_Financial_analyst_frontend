import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Trash2, Plus, Search, Loader, ArrowLeft, TrendingUp, TrendingDown, Building2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const WatchlistPage = () => {
    const navigate = useNavigate();
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [adding, setAdding] = useState('');
    const [removing, setRemoving] = useState('');
    const [priceData, setPriceData] = useState({});

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            const res = await api.get('/watchlist');
            const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
            setWatchlist(raw);

            // Fetch prices for watchlist symbols
            const symbols = raw.map(w => w?.company?.symbol).filter(Boolean);
            if (symbols.length) {
                try {
                    const priceRes = await api.post('/bulkstockprice', { symbols });
                    const prices = Array.isArray(priceRes?.data?.data) ? priceRes.data.data : [];
                    const priceMap = {};
                    prices.forEach(p => {
                        if (p?.symbol) priceMap[p.symbol] = p;
                    });
                    setPriceData(priceMap);
                } catch (err) {
                    console.error('Failed to fetch bulk prices', err);
                }
            }
        } catch (err) {
            console.error('Failed to fetch watchlist', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        if (companies.length) return;
        try {
            const res = await api.get('/companies');
            setCompanies(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        }
    };

    const handleAdd = async (symbol) => {
        setAdding(symbol);
        try {
            await api.post('/watchlist', { symbol });
            await fetchWatchlist();
            setShowAddModal(false);
            setSearchTerm('');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to add to watchlist';
            alert(msg);
        } finally {
            setAdding('');
        }
    };

    const handleRemove = async (symbol) => {
        if (!window.confirm(`Remove ${symbol} from watchlist?`)) return;
        setRemoving(symbol);
        try {
            await api.delete(`/watchlist/${symbol}`);
            setWatchlist(prev => prev.filter(w => w?.company?.symbol !== symbol));
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to remove from watchlist');
        } finally {
            setRemoving('');
        }
    };

    const watchlistSymbols = useMemo(() => new Set(watchlist.map(w => w?.company?.symbol)), [watchlist]);

    const filteredCompanies = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        return companies
            .filter(c => !watchlistSymbols.has(c.symbol))
            .filter(c => !q || c.symbol?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q));
    }, [companies, searchTerm, watchlistSymbols]);

    const fmt = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            <Navbar />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/home')}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2 transition text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-medium">Back to Home</span>
                        </button>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Watchlist</h1>
                        <p className="text-gray-500 mt-1">Track your favorite stocks</p>
                    </div>
                    <button
                        onClick={() => { setShowAddModal(true); fetchCompanies(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Stock
                    </button>
                </div>

                {/* Watchlist */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Loading watchlist...</span>
                    </div>
                ) : watchlist.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <Eye className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 text-lg font-medium">Your watchlist is empty</p>
                        <p className="text-gray-400 text-sm mt-1">Add stocks to keep an eye on their prices</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {watchlist.map((item) => {
                            const company = item?.company || {};
                            const symbol = company.symbol || 'N/A';
                            const price = priceData[symbol];
                            const addedAt = item?.addedAt ? new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

                            return (
                                <div key={symbol} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow">
                                                {symbol.slice(0, 2)}
                                            </span>
                                            <div>
                                                <p className="font-bold text-gray-900">{symbol}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[140px]">{company.name || '—'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(symbol)}
                                            disabled={removing === symbol}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                        >
                                            {removing === symbol ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {price && (
                                        <div className="mt-3 flex items-end justify-between">
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">{fmt(price.close)}</p>
                                                <p className="text-xs text-gray-400">{price.date || '—'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-between text-xs">
                                        <span className="text-gray-400">Added {addedAt}</span>
                                        {company.sector?.name && (
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                                {company.sector.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Add to Watchlist</h3>
                            <button onClick={() => { setShowAddModal(false); setSearchTerm(''); }} className="p-1 rounded-lg hover:bg-gray-100 transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="px-5 py-3">
                            <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search ticker or company..."
                                    className="w-full bg-transparent outline-none text-sm"
                                    autoFocus
                                />
                            </label>
                        </div>

                        <div className="px-5 pb-5 max-h-80 overflow-y-auto space-y-1.5">
                            {filteredCompanies.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No companies found</p>
                            ) : (
                                filteredCompanies.slice(0, 50).map((c) => (
                                    <div key={c.symbol} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition">
                                        <div className="flex items-center gap-2.5">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{c.symbol}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{c.name}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAdd(c.symbol)}
                                            disabled={adding === c.symbol}
                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {adding === c.symbol ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchlistPage;
