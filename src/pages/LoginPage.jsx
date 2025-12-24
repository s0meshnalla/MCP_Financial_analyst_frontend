import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, TrendingUp } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { setAccessToken, setUser } = useAuth();
    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await api.post("/auth/login", {email,password});
            const { accessToken, user } = response.data.data;

            setAccessToken(accessToken);

            setUser(user);

            navigate("/home");

        } catch (error) {
            console.error("Login error:", error);

            const message =
            error.response?.data?.message || "Login failed";

            alert(message);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-blue-600 p-3 rounded-full mb-4">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Financial Analyst</h1>
                        <p className="text-gray-300 text-sm">MCP Multi-Agent System</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
                        >Log-In
                        </button>
                        <div className="mt-6 text-center">
                            <a href="/signup" className="text-sm text-blue-400 hover:text-blue-300">
                                Don't have an account? Sign Up
                            </a>
                        </div>
                    </form>

                    {/* <div className="mt-6 text-center">
                        <a href="#" className="text-sm text-blue-400 hover:text-blue-300">
                            Forgot Password?
                        </a>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
