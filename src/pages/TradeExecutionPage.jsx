import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRightLeft,
    Building2,
    CheckCircle2,
    Loader2,
    Search,
    Wallet,
    TrendingUp,
    TrendingDown,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const TOP_TICKERS = [
    { ticker: 'AAPL', name: 'Apple Inc.', region: 'US' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', region: 'US' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', region: 'US' },
    { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)', region: 'US' },
    { ticker: 'META', name: 'Meta Platforms Inc.', region: 'US' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', region: 'US' },
    { ticker: 'TSLA', name: 'Tesla Inc.', region: 'US' },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', region: 'US' },
    { ticker: 'V', name: 'Visa Inc.', region: 'US' },
    { ticker: 'JNJ', name: 'Johnson & Johnson', region: 'US' },
    { ticker: 'WMT', name: 'Walmart Inc.', region: 'US' },
    { ticker: 'PG', name: 'Procter & Gamble Co.', region: 'US' },
    { ticker: 'MA', name: 'Mastercard Incorporated', region: 'US' },
    { ticker: 'AVGO', name: 'Broadcom Inc.', region: 'US' },
    { ticker: 'PEP', name: 'PepsiCo Inc.', region: 'US' },
    { ticker: 'COST', name: 'Costco Wholesale Corporation', region: 'US' },
    { ticker: 'ORCL', name: 'Oracle Corporation', region: 'US' },
    { ticker: 'BAC', name: 'Bank of America Corporation', region: 'US' },
    { ticker: 'NFLX', name: 'Netflix Inc.', region: 'US' },
    { ticker: 'DIS', name: 'The Walt Disney Company', region: 'US' },
];

const mapTransactions = (raw) => {
    const safe = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    return safe
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
                createdMs,
            };
        })
        .sort((a, b) => b.createdMs - a.createdMs);
};

const TradeExecutionPage = () => {
    const navigate = useNavigate();
    const PANEL_HEIGHT = 'min(92vh, 940px)';
    const [searchTerm, setSearchTerm] = useState('');
    const [quantities, setQuantities] = useState({});
    const [submitting, setSubmitting] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [balance, setBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [priceCache, setPriceCache] = useState({});
    const [priceLoading, setPriceLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);
    const [holdings, setHoldings] = useState({});
    const [quantityError, setQuantityError] = useState(null);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                setBalanceLoading(true);
                const res = await api.get('/profile/balance');
                const value = Number(res.data.data);
                setBalance(Number.isFinite(value) ? value : 0);
            } catch (err) {
                console.error('Failed to fetch balance', err);
            } finally {
                setBalanceLoading(false);
            }
        };
        fetchBalance();
    }, []);

    useEffect(() => {
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

        fetchHoldings();
    }, []);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setTxLoading(true);
                const { data } = await api.get('/transactions');
                setTransactions(mapTransactions(data));
            } catch (err) {
                console.error('Failed to fetch transactions', err);
            } finally {
                setTxLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    useEffect(() => {
        if (!selectedTicker) return;
        const { ticker } = selectedTicker;
        if (priceCache[ticker]) return; // already cached

        const fetchPrice = async () => {
            try {
                setPriceLoading(true);
                const res = await api.get('/stockprice', { params: { symbol: ticker } });
                const raw = res?.data?.price ?? res?.data?.data?.price ?? res?.data?.data ?? res?.data;
                const parsed = Number(raw);
                if (Number.isFinite(parsed) && parsed > 0) {
                    setPriceCache((prev) => ({ ...prev, [ticker]: parsed }));
                } else {
                    throw new Error('Invalid price');
                }
            } catch (err) {
                console.error('Failed to fetch stock price', err);
                setFeedback({ type: 'error', message: 'Could not load latest price. Try again.' });
            } finally {
                setPriceLoading(false);
            }
        };

        fetchPrice();
    }, [selectedTicker, priceCache]);

    const filteredTickers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return TOP_TICKERS;
        return TOP_TICKERS.filter((item) =>
            item.ticker.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)
        );
    }, [searchTerm]);

    const getQuantity = (ticker) => {
        const raw = quantities[ticker];
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
    };

    const handleQuantityChange = (ticker, value) => {
        let next = Number(value);
        if (!Number.isFinite(next) || next < 0) next = 0;
        next = Math.floor(next);
        setQuantityError(null);
        setQuantities((prev) => ({ ...prev, [ticker]: next }));
    };

    const maxBuyable = (ticker) => {
        if (!ticker) return null;
        const price = priceCache[ticker];
        if (!price || !Number.isFinite(price) || price <= 0) return null;
        if (balance === null || balance === undefined) return null;
        const max = Math.floor(balance / price);
        return max >= 0 ? max : 0;
    };

    const handleTrade = async (ticker, side) => {
        if (!ticker) return;
        const quantity = getQuantity(ticker);
        const cap = side === 'buy' ? maxBuyable(ticker) : null;
        const setInlineError = (msg) => {
            setQuantityError(msg);
            setTimeout(() => setQuantityError(null), 3000);
        };

        if (side === 'buy') {
            if (cap === null || cap < 1) {
                setInlineError('Not enough balance to buy this ticker.');
                return;
            }
            if (quantity < 1) {
                setInlineError('Quantity must be positive.');
                return;
            }
            if (quantity > cap) {
                setInlineError(`Quantity exceeds your max buyable (${cap}).`);
                return;
            }
        }

        if (side === 'sell') {
            const owned = Number(holdings[ticker] || 0);
            if (!Number.isFinite(owned) || owned <= 0) {
                setInlineError(`You do not own any ${ticker} to sell.`);
                return;
            }
            if (quantity < 1) {
                setInlineError('Quantity must be positive.');
                return;
            }
            if (quantity > owned) {
                setInlineError(`Sell quantity exceeds your holdings (${owned}).`);
                return;
            }
        }

        const finalQty = quantity;

        setSubmitting(`${ticker}-${side}`);
        setFeedback(null);
        try {
            await api.post(`/execute/${side}`, { symbol: ticker, quantity: finalQty });
            setFeedback({
                type: 'success',
                message: `${side === 'buy' ? 'Buy' : 'Sell'} order placed for ${finalQty} shares of ${ticker}.`,
            });

            // Keep in-memory balance loosely aligned using the current price when available.
            const price = priceCache[ticker];
            if (Number.isFinite(price)) {
                setBalance((prev) => {
                    if (!Number.isFinite(prev)) return prev;
                    if (side === 'buy') return Math.max(0, prev - price * finalQty);
                    return prev + price * finalQty;
                });
            }

            // Update holdings locally
            setHoldings((prev) => {
                const current = Number(prev[ticker] || 0);
                const next = side === 'buy' ? current + finalQty : current - finalQty;
                return { ...prev, [ticker]: Math.max(0, next) };
            });
        } catch (err) {
            const errMsg = err?.response?.data?.message || 'Trade request failed. Please try again.';
            setFeedback({ type: 'error', message: errMsg });
        } finally {
            setSubmitting('');
        }
    };

    const selectedPrice = selectedTicker ? priceCache[selectedTicker.ticker] : null;
    const maxQuantity = selectedTicker ? maxBuyable(selectedTicker.ticker) : null;
    const displayedTransactions = selectedTicker
        ? transactions.filter((tx) => tx.symbol === selectedTicker.ticker)
        : transactions;
    const detailOpen = Boolean(selectedTicker);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-medium">Back to Dashboard</span>
                        </button>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-semibold">
                            <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Trade Execution</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-sm">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <div className="flex flex-col">
                            <span className="text-[11px] text-gray-500">Available Balance</span>
                            <span className="text-base sm:text-lg font-semibold text-gray-900">
                                {balanceLoading ? 'Loading...' : `$${(balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            </span>
                        </div>
                    </div>
                </div>

                {feedback && (
                    <div
                        className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 border relative ${
                            feedback.type === 'success'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                    >
                        {feedback.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5" />
                        )}
                        <span className="font-medium flex-1">{feedback.message}</span>
                        <button
                            onClick={() => setFeedback(null)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-current hover:opacity-75"
                            aria-label="Dismiss message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left: ticker list */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex flex-col" style={{ height: PANEL_HEIGHT }}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Tracked Tickers</h2>
                                <p className="text-sm text-gray-600">Top global names</p>
                            </div>
                            <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search ticker or company"
                                    className="w-full bg-transparent outline-none text-sm text-gray-800"
                                />
                            </label>
                        </div>

                        <p className="text-xs text-gray-500 mb-4">Showing {filteredTickers.length} of {TOP_TICKERS.length}</p>

                        <div className="flex-1 overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredTickers.map((item) => {
                                    const isSelected = selectedTicker?.ticker === item.ticker;
                                    return (
                                        <button
                                            key={item.ticker}
                                            onClick={() => setSelectedTicker((prev) => (prev?.ticker === item.ticker ? null : item))}
                                            className={`text-left w-full rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-blue-700">{item.ticker}</p>
                                                        <p className="text-base font-bold text-gray-900 line-clamp-1">{item.name}</p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 font-semibold">Global</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: detail + transactions */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex flex-col gap-4" style={{ height: PANEL_HEIGHT }}>
                        <div
                            className="rounded-lg overflow-hidden transition-all duration-300 border border-gray-100 bg-gray-50 flex-shrink-0"
                            style={{ height: detailOpen ? '55%' : '0%', maxHeight: detailOpen ? '55%' : '0%', padding: detailOpen ? '12px' : '0px', opacity: detailOpen ? 1 : 0 }}
                            aria-hidden={!detailOpen}
                        >
                            {detailOpen ? (
                                <div className="max-w-3xl w-full mx-auto h-full">
                                    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[11px] font-semibold text-blue-700">{selectedTicker.ticker}</p>
                                            <p className="text-lg font-bold text-gray-900 leading-tight">{selectedTicker.name}</p>
                                            <p className="text-[11px] text-gray-600">Region: {selectedTicker.region}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500">Last Price</p>
                                            <div className="flex items-center justify-end gap-1 text-sm sm:text-base font-bold text-gray-900">
                                                {priceLoading && !selectedPrice ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                                ) : selectedPrice ? (
                                                    <span>${selectedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                ) : (
                                                    <span className="text-gray-400">Select to load</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm">
                                            <div className="flex items-center gap-1 text-[11px] text-gray-600">
                                                <Wallet className="w-4 h-4 text-blue-600" />
                                                <span>Owned Shares</span>
                                            </div>
                                            <p className="text-base font-semibold text-gray-900 mt-1">
                                                {Number(holdings[selectedTicker.ticker] || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm">
                                            <div className="flex items-center gap-1 text-[11px] text-gray-600">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                                <span>Max you can buy</span>
                                            </div>
                                            <p className="text-base font-semibold text-gray-900 mt-1">
                                                {maxQuantity === null ? '—' : maxQuantity}
                                            </p>
                                            <p className="text-[10px] text-gray-500">Based on balance and latest price</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] text-gray-700">Quantity</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={maxQuantity ?? undefined}
                                            value={quantities[selectedTicker.ticker] ?? getQuantity(selectedTicker.ticker)}
                                            onChange={(e) => handleQuantityChange(selectedTicker.ticker, e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                        {maxQuantity !== null && (
                                            <p className="text-[10px] text-gray-500">Max allowed: {maxQuantity} based on your balance.</p>
                                        )}
                                        {quantityError && (
                                            <p className="text-[11px] text-red-600 mt-1">{quantityError}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            onClick={() => handleTrade(selectedTicker.ticker, 'buy')}
                                            disabled={submitting === `${selectedTicker.ticker}-buy` || submitting === `${selectedTicker.ticker}-sell`}
                                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-white transition ${
                                                submitting === `${selectedTicker.ticker}-buy`
                                                    ? 'bg-green-500/80'
                                                    : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                        >
                                            {submitting === `${selectedTicker.ticker}-buy` ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : null}
                                            <span>Buy</span>
                                        </button>
                                        <button
                                            onClick={() => handleTrade(selectedTicker.ticker, 'sell')}
                                            disabled={submitting === `${selectedTicker.ticker}-buy` || submitting === `${selectedTicker.ticker}-sell`}
                                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-white transition ${
                                                submitting === `${selectedTicker.ticker}-sell`
                                                    ? 'bg-red-500/80'
                                                    : 'bg-red-600 hover:bg-red-700'
                                            }`}
                                        >
                                            {submitting === `${selectedTicker.ticker}-sell` ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : null}
                                            <span>Sell</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            ) : null}
                        </div>

                        <div
                            className="flex-1 flex flex-col gap-3 overflow-hidden transition-all duration-300"
                            style={{ height: detailOpen ? '45%' : '100%', maxHeight: detailOpen ? '45%' : '100%' }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                                    <p className="text-sm text-gray-600">{selectedTicker ? `Filtered for ${selectedTicker.ticker}` : 'All activity'}</p>
                                </div>
                                {txLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                ) : null}
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                                {txLoading ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                                ) : displayedTransactions.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">No transactions found.</div>
                                ) : (
                                    <div className="flex flex-col divide-y divide-gray-200">
                                        {displayedTransactions.map((tx) => (
                                            <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
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
                                                        {tx.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TradeExecutionPage;
