import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle } from 'lucide-react';
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

    const [alerts] = useState([
        { id: 1, type: 'success', message: 'AAPL reached target price of $178', time: '2 mins ago' },
        { id: 2, type: 'warning', message: 'High volatility detected in TSLA', time: '15 mins ago' },
    ]);

    useEffect(() => {
        const loadPortfolio = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch user holdings
                const holdingRes = await api.get('/profile/holdings');
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
                    return;
                }

                // Compute portfolio value directly from holdings (quantity * price)
                const portfolioTotal = holdings.reduce(
                    (acc, { quantity, price }) => acc + (Number(quantity) || 0) * (Number(price) || 0),
                    0
                );
                setPortfolioValue(portfolioTotal);
                setTodaysGain(0);
                setTodaysGainPercent(0);
                setActivePositions(holdings.length);

                // Fetch user stock changes once
                try {
                    const scRes = await api.get('/user-stockchange');
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
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
                    <p className="text-gray-600">Here's your portfolio overview for today</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Portfolio Value</p>
                                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioValue)}</h3>
                                <p className={`text-sm mt-1 ${todaysGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatSignedCurrency(todaysGain)} ({formatPercent(todaysGainPercent)})
                                </p>
                            </div>
                            <DollarSign className="w-10 h-10 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Today's Gain</p>
                                <h3 className={`text-2xl font-bold text-gray-900 ${todaysGain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatSignedCurrency(todaysGain)}
                                </h3>
                                <p className={`text-sm mt-1 ${todaysGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPercent(todaysGainPercent)}
                                </p>
                            </div>
                            <TrendingUp className="w-10 h-10 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Active Positions</p>
                                <h3 className="text-2xl font-bold text-gray-900">{activePositions}</h3>
                                <p className="text-sm text-gray-500 mt-1">Across {activePositions} sectors</p>
                            </div>
                            <Activity className="w-10 h-10 text-purple-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Alerts</p>
                                <h3 className="text-2xl font-bold text-gray-900">{alerts.length}</h3>
                                <p className="text-sm text-gray-500 mt-1">New notifications</p>
                            </div>
                            <AlertCircle className="w-10 h-10 text-orange-500" />
                        </div>
                    </div>
                </div>

                {/* Market Overview */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Market Overview</h2>
                        <button
                            type="button"
                            onClick={() => navigate('/graphs')}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            View More
                        </button>
                    </div>
                    {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                    {loading && <p className="text-sm text-gray-500 mb-3">Loading your holdings...</p>}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Symbol</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Price</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Change</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">% Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marketData.length === 0 && !loading && (
                                    <tr>
                                        <td className="py-3 px-4 text-sm text-gray-500" colSpan="4">
                                            No holdings found yet.
                                        </td>
                                    </tr>
                                )}
                                {marketData.map((stock) => (
                                    <tr key={stock.symbol} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{stock.symbol}</td>
                                        <td className="text-right py-3 px-4">{formatCurrency(stock.price)}</td>
                                        <td className={`text-right py-3 px-4 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatSignedCurrency(stock.change)}
                                        </td>
                                        <td className={`text-right py-3 px-4 font-medium ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {stock.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {Math.abs(stock.changePercent).toFixed(2)}%
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Alerts */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Alerts</h2>
                    <div className="space-y-3">
                        {alerts.map((alert) => (
                            <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${alert.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
                                <div className="flex items-start justify-between">
                                    <p className="text-sm text-gray-800">{alert.message}</p>
                                    <span className="text-xs text-gray-500">{alert.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
