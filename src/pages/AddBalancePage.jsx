import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Loader, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const AddBalancePage = () => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [submitting, setSubmitting] = useState(false);
    const [mode, setMode] = useState('deposit'); // deposit | withdraw
    const [balance, setBalance] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await api.get('/balance');
                const value = Number(res.data?.data);
                setBalance(Number.isFinite(value) ? value : 0);
            } catch (err) {
                console.error('Failed to fetch balance', err);
            }
        };
        fetchBalance();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (mode === 'withdraw' && balance !== null && Number(amount) > balance) {
            alert('Withdrawal amount exceeds your current balance');
            return;
        }
        setSubmitting(true);
        try {
            const payload = { amount: Number(amount) };
            const endpoint = mode === 'deposit' ? '/deposit-balance' : '/withdraw-balance';
            const res = await api.post(endpoint, payload);
            if (res.status === 200 || res.status === 201) {
                alert(res.data?.message || `${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} successful`);
                navigate('/profile');
            } else {
                alert(`Failed to ${mode}. Please try again`);
            }
        } catch (err) {
            console.error(`${mode} error`, err);
            alert(err?.response?.data?.message || `Error processing ${mode}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <DollarSign className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Manage Balance</h2>
                                {balance !== null && (
                                    <p className="text-sm text-gray-500">Current balance: ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                )}
                            </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => setMode('deposit')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                                    mode === 'deposit'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                Deposit
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('withdraw')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                                    mode === 'withdraw'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <ArrowUpFromLine className="w-4 h-4" />
                                Withdraw
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={mode === 'withdraw' && balance !== null ? balance : undefined}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Enter amount to ${mode}`}
                                />
                                {mode === 'withdraw' && balance !== null && (
                                    <p className="text-xs text-gray-500 mt-1">Maximum withdrawable: ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                )}
                            </div>

                            {mode === 'deposit' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="card">Credit / Debit Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="paypal">PayPal</option>
                                    </select>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`px-6 py-2 text-white rounded-lg disabled:opacity-60 flex items-center gap-2 ${
                                        mode === 'deposit'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {submitting ? <Loader className="w-4 h-4 animate-spin" /> : null}
                                    <span>{submitting ? 'Processing...' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddBalancePage;
