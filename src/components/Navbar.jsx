import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, BarChart3, User, LogOut, TrendingUp, ArrowLeftRight } from 'lucide-react';
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";



const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const navItems = [
        { path: '/home', icon: Home, label: 'Home' },
        { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
        { path: '/trade', icon: ArrowLeftRight, label: 'Trade' },
        { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
    ];
    const { logout } = useAuth();
    const handleLogout = async () => {
        try {
            await api.post("/auth/logout"); // clears refresh cookie
        } catch (e) {
            // ignore – logout should be client-forced anyway
        } finally {
            logout();       // clears access token + user from context
            navigate("/");
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="bg-white shadow-md relative z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/home" className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">MCP Analyst</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}

                        {/* Profile Dropdown */}
                        <div className="relative ml-3" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen((prev) => !prev)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 focus:outline-none transition"
                            >
                                <User className="w-5 h-5" />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Profile</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setDropdownOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
