import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';

const HomePage = () => {
    const [marketData] = useState([
        { symbol: 'AAPL', price: 178.45, change: 2.34, changePercent: 1.33 },
        { symbol: 'GOOGL', price: 142.87, change: -1.12, changePercent: -0.78 },
        { symbol: 'MSFT', price: 412.56, change: 5.67, changePercent: 1.39 },
        { symbol: 'TSLA', price: 248.32, change: -3.45, changePercent: -1.37 },
    ]);

    const [alerts] = useState([
        { id: 1, type: 'success', message: 'AAPL reached target price of $178', time: '2 mins ago' },
        { id: 2, type: 'warning', message: 'High volatility detected in TSLA', time: '15 mins ago' },
    ]);

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
                                <h3 className="text-2xl font-bold text-gray-900">$125,430</h3>
                                <p className="text-sm text-green-600 mt-1">+$2,340 (1.9%)</p>
                            </div>
                            <DollarSign className="w-10 h-10 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Today's Gain</p>
                                <h3 className="text-2xl font-bold text-gray-900">$1,247</h3>
                                <p className="text-sm text-green-600 mt-1">+0.99%</p>
                            </div>
                            <TrendingUp className="w-10 h-10 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Active Positions</p>
                                <h3 className="text-2xl font-bold text-gray-900">12</h3>
                                <p className="text-sm text-gray-500 mt-1">Across 3 sectors</p>
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
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Market Overview</h2>
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
                                {marketData.map((stock) => (
                                    <tr key={stock.symbol} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{stock.symbol}</td>
                                        <td className="text-right py-3 px-4">${stock.price.toFixed(2)}</td>
                                        <td className={`text-right py-3 px-4 ${stock.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}
                                        </td>
                                        <td className={`text-right py-3 px-4 font-medium ${stock.changePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {stock.changePercent > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
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
