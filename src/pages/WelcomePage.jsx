import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

const WelcomePage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-blue-600 p-3 rounded-full mb-4">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Welcome to MCP Multi-Agent System
                        </h1>
                        <p className="text-gray-300 text-sm">
                            Your Intelligent Financial Assistant
                        </p>
                    </div>

                    <p className="text-gray-200 text-base mb-8 leading-relaxed">
                        To explore advanced insights, predictive analytics, and automated financial
                        strategies — please log in to your account.
                    </p>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200"
                    >
                        Login to Continue
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-400">
                            Don’t have an account?{' '}
                            <button
                                onClick={() => navigate('/signup')}
                                className="text-blue-400 hover:text-blue-300 font-medium underline-offset-2 hover:underline bg-transparent border-none"
                            >
                                Sign Up
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
