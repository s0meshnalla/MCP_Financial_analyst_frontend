import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Shield, DollarSign, Target, Save, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
const ProfilePage = () => {
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        phone: '',
        riskProfile: 'moderate',
        balance: '',
        preferredAssets: [],
    });

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const didFetchProfile = useRef(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                
                const response = await api.get('/profile/me');
                if (response.status !== 200) {
                    console.log(response);
                    throw new Error('Failed to fetch user profile');
                }

                const data = response.data.data;
                // console.log('Fetched profile data:', data);
                setProfile({
                    username: data.username || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    balance: data.balance || '',
                    riskProfile: data.riskProfile || 'moderate',
                    preferredAssets: data.preferredAssets || ['stocks'],
                });
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        if (!didFetchProfile.current) {
            didFetchProfile.current = true;
            fetchUserProfile();
        }
    }, []);

    const handleSave = async () => {
        // alert('Profile updated successfully!');
        try {
            setIsEditing(false);
            const response = await api.put('/profile/me', {
                ...profile,
            });

            if (response.status !== 200) throw new Error('Failed to update profile');

            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            if (err.response.data.data==="JWT signature does not match locally computed signature. JWT validity cannot be asserted and should not be trusted.") {
                window.location.reload();
            }else{
                alert('Failed to update profile. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
                <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-3 rounded-full">
                                <User className="w-12 h-12 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
                                <p className="text-blue-100">Investor Profile</p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Information */}
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <User className="w-4 h-4 inline mr-2" />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={profile.username}
                                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Mail className="w-4 h-4 inline mr-2" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Phone className="w-4 h-4 inline mr-2" />
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            {/* Budget */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <DollarSign className="w-4 h-4 inline mr-2" />
                                    Account balance ($)
                                </label>
                                <input
                                    type="number"
                                    value={profile.balance}
                                    onChange={(e) => setProfile({ ...profile, balance: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>
                        </div>

                        {/* Investment Preferences */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                <Target className="w-5 h-5 inline mr-2" />
                                Investment Preferences
                            </h3>

                            {/* Risk Profile */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Shield className="w-4 h-4 inline mr-2" />
                                    Risk Profile
                                </label>
                                <select
                                    value={profile.riskProfile}
                                    onChange={(e) => setProfile({ ...profile, riskProfile: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="conservative">Conservative - Low Risk</option>
                                    <option value="moderate">Moderate - Balanced Risk</option>
                                    <option value="aggressive">Aggressive - High Risk</option>
                                </select>
                            </div>

                            {/* Assets */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Asset Types
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['stocks', 'etf', 'crypto', 'commodities'].map((asset) => (
                                        <label key={asset} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profile.preferredAssets.includes(asset)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setProfile({ ...profile, preferredAssets: [...profile.preferredAssets, asset] });
                                                    } else {
                                                        setProfile({
                                                            ...profile,
                                                            preferredAssets: profile.preferredAssets.filter(a => a !== asset),
                                                        });
                                                    }
                                                }}
                                                disabled={!isEditing}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 capitalize">{asset}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
