import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Loader } from 'lucide-react';

const AddBalancePage = () => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        setSubmitting(true);
        try {
            const payload = { amount: Number(amount)};
            // const payload = { amount: Number(amount), paymentMethod };
            const res = await api.post('/profile/add-balance', payload);
            if (res.status === 200 || res.status === 201) {
                alert(res.data?.message || 'Balance added successfully');
                navigate('/profile');
            } else {
                alert('Failed to add balance. Please try again');
            }
        } catch (err) {
            console.error('Add balance error', err);
            alert(err?.response?.data?.message || 'Error adding balance');
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
                            <h2 className="text-xl font-bold">Add Balance</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter amount to add"
                                />
                            </div>

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

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                                >
                                    {submitting ? <Loader className="w-4 h-4 animate-spin" /> : null}
                                    <span>{submitting ? 'Processing...' : 'Add Balance'}</span>
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
