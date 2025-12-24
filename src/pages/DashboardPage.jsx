import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, PieChart, AlertTriangle, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const DashboardPage = () => {
    const navigate = useNavigate();
    const transactionsFetched = useRef(false);
    const dashboardFetched = useRef(false);
    const [portfolioData, setPortfolioData] = useState({
        totalValue: 0,
        dayChange: 0,
        dayChangePercent: 0,
        positions: [],
        allocation: [
            { sector: 'Technology', percentage: 65, value: 81529.50 },
            { sector: 'Healthcare', percentage: 20, value: 25086.00 },
            { sector: 'Finance', percentage: 15, value: 18814.50 },
        ],
        recentTrades: [],
        agentInsights: [
            { agent: 'Technical Analysis', status: 'active', lastUpdate: '2 mins ago', message: 'Bullish trend detected in AAPL' },
            { agent: 'Sentiment Analysis', status: 'active', lastUpdate: '5 mins ago', message: 'Positive sentiment: +0.78' },
            { agent: 'Risk Management', status: 'warning', lastUpdate: '10 mins ago', message: 'Portfolio exposure at 85%' },
            { agent: 'Portfolio Manager', status: 'active', lastUpdate: '15 mins ago', message: 'Rebalancing recommended' },
        ],
    });

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
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
                    .map(({ createdMs, ...rest }) => rest); // drop helper field
                console.log('Fetched transactions:', mapped);
                setPortfolioData(prev => ({ ...prev, recentTrades: mapped }));
            } catch (err) {
                console.error('Failed to fetch transactions', err);
            }
        };
        if (!transactionsFetched.current) {
            transactionsFetched.current = true;
            fetchTransactions();
        }
    }, []);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const { data } = await api.get('/dashboard');
                const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
                console.log('Fetched dashboard data:', raw);
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
                    const gainLossA = numberOrZero(a.gain ?? a.loss);
                    const gainLossB = numberOrZero(b.gain ?? b.loss);
                    return gainLossB - gainLossA;
                });

                const totalValue = sorted.reduce((sum, p) => sum + (p.value || 0), 0);
                const totalGain = sorted.reduce((sum, p) => sum + ((p.gain ?? p.loss) || 0), 0);
                const dayChangePercent = totalValue ? Number(((totalGain / totalValue) * 100).toFixed(2)) : 0;

                setPortfolioData(prev => ({
                    ...prev,
                    positions: sorted,
                    totalValue: Number(totalValue.toFixed(2)),
                    dayChange: Number(totalGain.toFixed(2)),
                    dayChangePercent,
                }));
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            }
        };

        if (!dashboardFetched.current) {
            dashboardFetched.current = true;
            fetchDashboard();
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Dashboard</h1>
                    <p className="text-gray-600">Real-time monitoring and analytics powered by MCP Multi-Agent System</p>
                </div>

                {/* Performance Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Portfolio Performance</h2>
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-3xl font-bold text-gray-900">
                                        ${portfolioData.totalValue.toLocaleString()}
                                    </span>
                                    <div className="text-right">
                                        <span className={`text-lg font-semibold ${portfolioData.dayChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {portfolioData.dayChange > 0 ? '+' : ''}${Math.abs(portfolioData.dayChange).toLocaleString()}
                                        </span>
                                        <span className={`text-sm ml-2 ${portfolioData.dayChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ({portfolioData.dayChangePercent > 0 ? '+' : ''}{portfolioData.dayChangePercent}%)
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Asset Allocation</h2>
                            <PieChart className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="space-y-3">
                            {portfolioData.allocation.map((item, index) => (
                                <div key={index}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700">{item.sector}</span>
                                        <span className="font-semibold">{item.percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'
                                                }`}
                                            style={{ width: `${item.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Current Positions */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Current Positions</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Symbol</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Shares</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Price</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Current Price</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Market Value</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Gain/Loss</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolioData.positions.map((position) => {
                                    const avg = Number.isFinite(position.avgPrice) ? position.avgPrice : 0;
                                    const cur = Number.isFinite(position.currentPrice) ? position.currentPrice : 0;
                                    const val = Number.isFinite(position.value) ? position.value : 0;
                                    const gl = Number.isFinite(position.gain || position.loss) ? (position.gain || position.loss) : 0;
                                    const glClass = gl >= 0 ? 'text-green-600' : 'text-red-600';
                                    const glPrefix = gl > 0 ? '+' : '';
                                    return (
                                        <tr key={position.symbol} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium">{position.symbol}</td>
                                            <td className="text-right py-3 px-4">{position.shares}</td>
                                            <td className="text-right py-3 px-4">${avg.toFixed(2)}</td>
                                            <td className="text-right py-3 px-4">${cur.toFixed(2)}</td>
                                            <td className="text-right py-3 px-4">${val.toFixed(2)}</td>
                                            <td className={`text-right py-3 px-4 font-semibold ${glClass}`}>
                                                {glPrefix}${gl.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Agent Insights & Recent Trades */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Multi-Agent Insights */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Multi-Agent Insights</h2>
                        <div className="space-y-3">
                            {portfolioData.agentInsights.map((insight, index) => (
                                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {insight.status === 'active' ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                            )}
                                            <span className="font-semibold text-gray-900">{insight.agent}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {insight.lastUpdate}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{insight.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Trades */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Recent Trades</h2>
                            <button
                                onClick={() => navigate('/transactions')}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition"
                            >
                                View More
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {portfolioData.recentTrades.map((trade) => (
                                <div key={trade.id} className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {trade.type}
                                            </span>
                                            <span className="font-semibold text-gray-900">{trade.symbol}</span>
                                        </div>
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>{trade.shares} shares @ ${trade.price}</span>
                                        <span>{trade.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
