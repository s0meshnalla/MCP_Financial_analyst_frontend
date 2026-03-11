import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Filter, Download, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const PERIODS = [
    { value: 'ALL', label: 'All Time' },
    { value: 'LAST_24_HOURS', label: '24 Hours' },
    { value: 'LAST_7_DAYS', label: '1 Week' },
    { value: 'LAST_30_DAYS', label: '1 Month' },
    { value: 'LAST_90_DAYS', label: '3 Months' },
    { value: 'LAST_1_YEAR', label: '1 Year' },
];

const PAGE_SIZE_OPTIONS = [20, 30, 40, 50];

const EXPORT_RANGES = [
    { value: '1M', label: 'Last 1 Month', months: 1 },
    { value: '3M', label: 'Last 3 Months', months: 3 },
    { value: '6M', label: 'Last 6 Months', months: 6 },
    { value: '1Y', label: 'Last 1 Year', months: 12 },
    { value: 'CUSTOM', label: 'Custom Range', months: 0 },
];

const TransactionsPage = () => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, buy, sell, deposit, withdrawal
    const [period, setPeriod] = useState('ALL');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [hasMore, setHasMore] = useState(true);

    // Date range filtering
    const [dateMode, setDateMode] = useState('period'); // 'period' | 'range'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Export modal state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportRange, setExportRange] = useState('1M');
    const [exportCustomStart, setExportCustomStart] = useState('');
    const [exportCustomEnd, setExportCustomEnd] = useState('');
    const [exporting, setExporting] = useState(false);
    const exportModalRef = useRef(null);

    const fetchTransactions = useCallback(async (pageNum, periodVal, size, dMode, sDate, eDate) => {
        try {
            setLoading(true);
            const params = { limit: size, page: pageNum + 1 };
            if (dMode === 'range' && sDate && eDate) {
                // Date range takes highest priority on backend
                params.startDate = `${sDate}T00:00:00`;
                params.endDate = `${eDate}T23:59:59`;
            } else if (periodVal && periodVal !== 'ALL') {
                params.period = periodVal;
            }
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
            setHasMore(raw.length >= size);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTransactions(page, period, pageSize, dateMode, startDate, endDate);
    }, [page, period, pageSize, dateMode, startDate, endDate, fetchTransactions]);

    const handlePeriodChange = (newPeriod) => {
        setDateMode('period');
        setPeriod(newPeriod);
        setPage(0);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setPage(0);
    };

    const handleDateRangeApply = () => {
        if (startDate && endDate) {
            setDateMode('range');
            setPeriod(''); // clear period selection
            setPage(0);
        }
    };

    const handleClearDateRange = () => {
        setDateMode('period');
        setStartDate('');
        setEndDate('');
        setPeriod('ALL');
        setPage(0);
    };

    // Close export modal on outside click
    useEffect(() => {
        if (!showExportModal) return;
        const handleClick = (e) => {
            if (exportModalRef.current && !exportModalRef.current.contains(e.target)) setShowExportModal(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showExportModal]);

    const getExportDateRange = () => {
        const now = new Date();
        const fmtDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const fmtFile = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).replace(/[\s,]+/g, '_');

        if (exportRange === 'CUSTOM') {
            if (!exportCustomStart || !exportCustomEnd) return null;
            const s = new Date(exportCustomStart + 'T00:00:00');
            const e = new Date(exportCustomEnd + 'T23:59:59');
            return {
                startDate: `${exportCustomStart}T00:00:00`,
                endDate: `${exportCustomEnd}T23:59:59`,
                rangeLabel: `${fmtDate(s)} – ${fmtDate(e)}`,
                fileName: `Transaction_History_${fmtFile(s)}_to_${fmtFile(e)}.pdf`,
            };
        }

        const chosen = EXPORT_RANGES.find(r => r.value === exportRange);
        const endD = new Date(now);
        const startD = new Date(now);
        startD.setMonth(startD.getMonth() - (chosen?.months || 1));
        return {
            startDate: `${startD.toISOString().slice(0, 10)}T00:00:00`,
            endDate: `${endD.toISOString().slice(0, 10)}T23:59:59`,
            rangeLabel: `${fmtDate(startD)} – ${fmtDate(endD)}`,
            fileName: `Transaction_History_${fmtFile(startD)}_to_${fmtFile(endD)}.pdf`,
        };
    };

    const handleExportPDF = async () => {
        const range = getExportDateRange();
        if (!range) return;

        setExporting(true);
        try {
            // Fetch all transactions for this date range (large limit to get everything)
            const params = { limit: 1000, page: 1, startDate: range.startDate, endDate: range.endDate };
            const { data } = await api.get('/transactions', { params });
            const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            const rows = raw.map((tx, idx) => {
                const shares = Number(tx?.assetQuantity) || 0;
                const amount = Number(tx?.amount) || 0;
                const price = shares ? amount / shares : 0;
                const created = tx?.createdAt ? new Date(tx.createdAt) : null;
                const date = created ? created.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                const time = created ? created.toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
                return { date, time, type: (tx?.type || '').toUpperCase(), symbol: tx?.asset || 'N/A', shares, price: Number(price.toFixed(2)), amount: Number(amount.toFixed(2)) };
            });

            if (rows.length === 0) {
                setExporting(false);
                alert('No transactions found for the selected period.');
                return;
            }

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Transaction History', 14, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Period: ${range.rangeLabel}`, 14, 28);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 14, 34);
            doc.setTextColor(0);

            autoTable(doc, {
                startY: 42,
                head: [['Date', 'Time', 'Type', 'Symbol', 'Shares', 'Price ($)', 'Amount ($)', 'Status']],
                body: rows.map(tx => [
                    tx.date, tx.time, tx.type, tx.symbol, tx.shares,
                    tx.price.toFixed(2),
                    tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    'Executed',
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'center' } },
            });

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Transactions: ${rows.length}`, 14, finalY);
            doc.text(`Buy Total: $${rows.filter(t => t.type === 'BUY').reduce((s, t) => s + t.amount, 0).toLocaleString()}`, 14, finalY + 6);
            doc.text(`Sell Total: $${rows.filter(t => t.type === 'SELL').reduce((s, t) => s + t.amount, 0).toLocaleString()}`, 14, finalY + 12);

            doc.save(range.fileName);
            setShowExportModal(false);
        } catch (err) {
            console.error('Export failed', err);
            alert('Failed to export transactions. Please try again.');
        } finally {
            setExporting(false);
        }
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
                        {/* Type filter buttons */}
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

                        {/* Period dropdown + custom date range */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Period:</span>
                            <select
                                value={dateMode === 'period' ? period : '__custom__'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '__custom__') {
                                        // just switch UI — user still needs to pick dates and click Apply
                                        setDateMode('range');
                                        setPeriod('');
                                    } else {
                                        handlePeriodChange(val);
                                    }
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                {PERIODS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                                <option value="__custom__">Custom Range</option>
                            </select>

                            {dateMode === 'range' && (
                                <>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        title="Start date"
                                    />
                                    <span className="text-xs text-gray-400">to</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                        title="End date"
                                    />
                                    <button
                                        onClick={handleDateRangeApply}
                                        disabled={!startDate || !endDate}
                                        className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        onClick={handleClearDateRange}
                                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                                        title="Clear date range"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Export PDF button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportModal(v => !v)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Export PDF
                            </button>

                            {/* Export modal dropdown */}
                            {showExportModal && (
                                <div ref={exportModalRef} className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-5 z-50">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Export Transaction History</h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Select Period</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {EXPORT_RANGES.map((r) => (
                                                    <button
                                                        key={r.value}
                                                        onClick={() => setExportRange(r.value)}
                                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition border ${
                                                            exportRange === r.value
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {exportRange === 'CUSTOM' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={exportCustomStart}
                                                    onChange={(e) => setExportCustomStart(e.target.value)}
                                                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <span className="text-xs text-gray-400">to</span>
                                                <input
                                                    type="date"
                                                    value={exportCustomEnd}
                                                    onChange={(e) => setExportCustomEnd(e.target.value)}
                                                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => setShowExportModal(false)}
                                                className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleExportPDF}
                                                disabled={exporting || (exportRange === 'CUSTOM' && (!exportCustomStart || !exportCustomEnd))}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-medium"
                                            >
                                                {exporting ? (
                                                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                                                ) : (
                                                    <><Download className="w-3.5 h-3.5" /> Download PDF</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">Page {page + 1}</span>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>

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
