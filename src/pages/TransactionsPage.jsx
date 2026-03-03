import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Filter, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const PERIODS = [
    { value: 'ALL', label: 'All Time' },
    { value: 'LAST_24_HOURS', label: '24h' },
    { value: 'LAST_7_DAYS', label: '1W' },
    { value: 'LAST_30_DAYS', label: '1M' },
    { value: 'LAST_90_DAYS', label: '3M' },
    { value: 'LAST_1_YEAR', label: '1Y' },
];

const PAGE_SIZE = 20;

const TransactionsPage = () => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, buy, sell, deposit, withdrawal
    const [period, setPeriod] = useState('ALL');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchTransactions = useCallback(async (pageNum, periodVal) => {
        try {
            setLoading(true);
            const params = { limit: PAGE_SIZE, page: pageNum };
            if (periodVal) params.period = periodVal;
            const { data } = await api.get('/transactions', { params });
            const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            const mapped = raw.map((tx, idx) => {
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
                const txType = (tx?.type || '').toUpperCase();

                return {
                    id: tx?.id ?? idx,
                    symbol: tx?.asset || 'N/A',
                    type: txType,
                    shares,
                    price: Number(price.toFixed(2)),
                    amount: Number(amount.toFixed(2)),
                    date,
                    time,
                    status: 'executed',
                    createdMs,
                };
            }).sort((a, b) => b.createdMs - a.createdMs);

            setTransactions(mapped);
            setHasMore(raw.length >= PAGE_SIZE);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions(page, period);
    }, [page, period, fetchTransactions]);

    const handlePeriodChange = (newPeriod) => {
        setPeriod(newPeriod);
        setPage(0);
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'all') return true;
        return tx.type.toLowerCase() === filter;
    });

    const totalBuyAmount = transactions
        .filter(tx => tx.type === 'BUY')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSellAmount = transactions
        .filter(tx => tx.type === 'SELL')
        .reduce((sum, tx) => sum + tx.amount, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Dashboard</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction History</h1>
                    <p className="text-gray-600">Complete record of all your trades and transactions</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 text-sm">Total Transactions</span>
                            <Filter className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-3xl font-bold text-gray-900">{transactions.length}</span>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 text-sm">Total Buy Amount</span>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <span className="text-3xl font-bold text-green-600">${totalBuyAmount.toLocaleString()}</span>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600 text-sm">Total Sell Amount</span>
                            <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-3xl font-bold text-red-600">${totalSellAmount.toLocaleString()}</span>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Type:</span>
                            {['all', 'buy', 'sell', 'deposit', 'withdrawal'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        filter === f
                                            ? f === 'buy' || f === 'deposit' ? 'bg-green-600 text-white'
                                                : f === 'sell' || f === 'withdrawal' ? 'bg-red-600 text-white'
                                                : 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Period:</span>
                            {PERIODS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => handlePeriodChange(p.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        period === p.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">Loading transactions...</p>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-600">No transactions found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Date & Time</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Type</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Symbol</th>
                                        <th className="text-right py-4 px-6 font-semibold text-gray-700">Shares</th>
                                        <th className="text-right py-4 px-6 font-semibold text-gray-700">Price</th>
                                        <th className="text-right py-4 px-6 font-semibold text-gray-700">Total Amount</th>
                                        <th className="text-center py-4 px-6 font-semibold text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredTransactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50 transition">
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900">{transaction.date}</span>
                                                    <span className="text-xs text-gray-500">{transaction.time}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                                        transaction.type === 'BUY' || transaction.type === 'DEPOSIT'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}
                                                >
                                                    {transaction.type === 'BUY' || transaction.type === 'DEPOSIT' ? (
                                                        <TrendingUp className="w-3 h-3" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3" />
                                                    )}
                                                    {transaction.type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-gray-900">{transaction.symbol}</span>
                                            </td>
                                            <td className="text-right py-4 px-6 text-gray-900">{transaction.shares}</td>
                                            <td className="text-right py-4 px-6 text-gray-900">${transaction.price}</td>
                                            <td className="text-right py-4 px-6">
                                                <span className="font-semibold text-gray-900">${transaction.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="text-center py-4 px-6">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    Executed
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {page + 1}</span>
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!hasMore}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionsPage;
