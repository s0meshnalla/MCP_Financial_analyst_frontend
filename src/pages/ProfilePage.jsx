import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Target, Save, Loader, Calendar, MapPin, Building2, Landmark, IdCard, Globe, Briefcase, DollarSign } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';

const ProfilePage = () => {
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        phone: '',
        balance: 0.0,
        riskProfile: 'moderate',
        preferredAssets: ['stocks'],
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'prefer_not_to_say',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        jobTitle: '',
        companyName: '',
        industry: '',
        employmentStatus: 'employed',
        salaryRange: '',
    });
    const didFetchProfile = useRef(false);

    // Preference lists (fetched from API)
    const [sectorsList, setSectorsList] = useState([]);
    const [companiesList, setCompaniesList] = useState([]);
    const MAX_SECTORS = 4;
    const MAX_COMPANIES = 8;

    const [preferences, setPreferences] = useState({
        sectors: [],
        companies: [],
        riskTolerance: 'moderate',
        preferredAsset: 'stocks',
        investmentGoal: 'short',
    });
    const [prefLoading, setPrefLoading] = useState(true);
    const [isEditingPrefs, setIsEditingPrefs] = useState(false);
    const [prefSubmitting, setPrefSubmitting] = useState(false);
    const prefDropdownRef = useRef(null);
    const companiesDropdownRef = useRef(null);
    const [showSectorsDropdown, setShowSectorsDropdown] = useState(false);
    const [showCompaniesDropdown, setShowCompaniesDropdown] = useState(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await api.get('/profile/me');
                if (response.status !== 200) throw new Error('Failed to fetch user profile');
                const data = response.data.data || {};
                // Normalize certain fields from backend to match frontend option values
                const normalizeGender = (g) => {
                    if (!g) return 'prefer_not_to_say';
                    const low = String(g).toLowerCase();
                    if (low.startsWith('m')) return 'male';
                    if (low.startsWith('f')) return 'female';
                    return 'prefer_not_to_say';
                };

                const normalizeEmployment = (s) => {
                    if (!s) return 'employed';
                    const low = String(s).toLowerCase();
                    if (low.includes('student')) return 'student';
                    if (low.includes('self')) return 'self_employed';
                    if (low.includes('unemploy')) return 'unemployed';
                    if (low.includes('retire')) return 'retired';
                    return 'employed';
                };

                const normalizeSalary = (r) => {
                    if (!r) return '';
                    const val = String(r).toLowerCase();
                    if (val.includes('below') || val.includes('below_50') || val.includes('below50') || (val.includes('50k') && val.includes('below'))) return 'Below_50k';
                    if (val.includes('between') && val.includes('50') && val.includes('100')) return 'BETWEEN_50k_100k';
                    if (val.includes('between') && val.includes('100') && val.includes('200')) return 'BETWEEN_100k_200k';
                    if (val.includes('above') || val.includes('>') || val.includes('200')) return 'Above_200k';
                    // fallback: try some common backend constants
                    if (val === 'below_50k' || val === 'below50k' || val === 'below50') return 'Below_50k';
                    if (val === 'below_50_k' || val === 'below_50') return 'Below_50k';
                    if (val === 'below_50k') return 'Below_50k';
                    return r;
                };
                setProfile({
                    username: data.username || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    balance: data.balance || 0.0,
                    riskProfile: data.riskProfile || 'moderate',
                    preferredAssets: data.preferredAssets || ['stocks'],
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    dateOfBirth: data.dateOfBirth || '',
                    gender: normalizeGender(data.gender),
                    addressLine1: data.addressLine1 || '',
                    addressLine2: data.addressLine2 || '',
                    city: data.city || '',
                    state: data.state || '',
                    postalCode: data.postalCode || '',
                    country: data.country || '',
                    jobTitle: data.jobTitle || '',
                    companyName: data.companyName || '',
                    industry: data.industry || '',
                    employmentStatus: normalizeEmployment(data.employmentStatus),
                    salaryRange: normalizeSalary(data.salaryRange) || '',
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

    // Fetch user preferences separately
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const res = await api.get('/profile/preferences');
                if (res.status !== 200) throw new Error('Failed to fetch preferences');
                const data = res.data?.data || {};
                // backend may return arrays of objects: sectors [{ id, name }], companies [{ id, name, symbol }]
                const rawSectors = Array.isArray(data.sectorIds) ? data.sectorIds : (data.sectorIds ? [data.sectorIds] : []);
                const rawCompanies = Array.isArray(data.companyIds) ? data.companyIds : (data.companyIds ? [data.companyIds] : []);

                // Extract ids for state, and collect provided objects to hydrate local caches
                const sectors = rawSectors.map(s => (typeof s === 'object' && s !== null && s.id ? s.id : s)).filter(Boolean);
                const companies = rawCompanies.map(c => (typeof c === 'object' && c !== null && c.id ? c.id : c)).filter(Boolean);

                const sectorObjs = rawSectors.filter(s => typeof s === 'object' && s !== null && s.id);
                const companyObjs = rawCompanies.filter(c => typeof c === 'object' && c !== null && c.id);

                setPreferences(prev => ({
                    sectors,
                    companies,
                    riskTolerance: data.riskTolerance || prev.riskTolerance || 'moderate',
                    preferredAsset: data.preferredAsset || prev.preferredAsset || 'stocks',
                    investmentGoal: data.investmentGoals || data.investmentGoal || prev.investmentGoal || 'short',
                }));

                // Hydrate lists with known selected items so chips can resolve names without extra fetches
                if (sectorObjs.length) {
                    setSectorsList(prev => {
                        const byId = new Map(prev.map(x => [x.id, x]));
                        sectorObjs.forEach(obj => {
                            byId.set(obj.id, { ...byId.get(obj.id), ...obj });
                        });
                        return Array.from(byId.values());
                    });
                }
                if (companyObjs.length) {
                    setCompaniesList(prev => {
                        const byId = new Map(prev.map(x => [x.id, x]));
                        companyObjs.forEach(obj => {
                            byId.set(obj.id, { ...byId.get(obj.id), ...obj });
                        });
                        return Array.from(byId.values());
                    });
                }
            } catch (err) {
                console.error('Error fetching preferences:', err);
            } finally {
                setPrefLoading(false);
            }
        };
        fetchPreferences();
    }, []);

    // previously fetched lists on mount; we'll fetch on dropdown open and on-demand when ids exist
    const [sectorsLoading, setSectorsLoading] = useState(false);
    const [companiesLoading, setCompaniesLoading] = useState(false);

    const loadSectorsIfNeeded = async () => {
        if (sectorsLoading || sectorsList.length) return;
        setSectorsLoading(true);
        try {
            const sres = await api.get('/sectors');
            setSectorsList(sres?.data?.data || []);
        } catch (e) {
            console.error('Failed to fetch sectors', e);
        } finally {
            setSectorsLoading(false);
        }
    };

    const loadCompaniesIfNeeded = async () => {
        if (companiesLoading || companiesList.length) return;
        setCompaniesLoading(true);
        try {
            const cres = await api.get('/companies');
            setCompaniesList(cres?.data?.data || []);
        } catch (e) {
            console.error('Failed to fetch companies', e);
        } finally {
            setCompaniesLoading(false);
        }
    };

    const handleToggleSectorsDropdown = async () => {
        if (!showSectorsDropdown) {
            await loadSectorsIfNeeded();
            setShowSectorsDropdown(true);
        } else setShowSectorsDropdown(false);
    };

    const handleToggleCompaniesDropdown = async () => {
        if (!showCompaniesDropdown) {
            await loadCompaniesIfNeeded();
            setShowCompaniesDropdown(true);
        } else setShowCompaniesDropdown(false);
    };

    // Do not auto-fetch lists on load; resolve names only after user opens dropdown
    useEffect(() => {
        // Fetch lists on mount so dropdowns have data ready
        (async () => {
            try {
                await loadSectorsIfNeeded();
            } catch (e) {
                console.error('Initial sectors load failed', e);
            }
            try {
                await loadCompaniesIfNeeded();
            } catch (e) {
                console.error('Initial companies load failed', e);
            }
        })();
    }, []);

    // Preference toggles and handlers
    const toggleSector = (sectorId) => setPreferences(prev => {
        const exists = prev.sectors.includes(sectorId);
        if (exists) return { ...prev, sectors: prev.sectors.filter(x => x !== sectorId) };
        if (prev.sectors.length >= MAX_SECTORS) return prev;
        const newS = [...prev.sectors, sectorId];
        if (newS.length >= MAX_SECTORS) setShowSectorsDropdown(false);
        return { ...prev, sectors: newS };
    });
    const toggleCompany = (companyId) => setPreferences(prev => {
        const exists = prev.companies.includes(companyId);
        if (exists) return { ...prev, companies: prev.companies.filter(x => x !== companyId) };
        if (prev.companies.length >= MAX_COMPANIES) return prev;
        const newC = [...prev.companies, companyId];
        if (newC.length >= MAX_COMPANIES) setShowCompaniesDropdown(false);
        return { ...prev, companies: newC };
    });
    const setPreferredAsset = (a) => setPreferences(prev => ({ ...prev, preferredAsset: a }));
    const setInvestmentGoal = (g) => setPreferences(prev => ({ ...prev, investmentGoal: g }));
    const setRiskTolerance = (r) => setPreferences(prev => ({ ...prev, riskTolerance: r }));

    const handlePreferencesSave = async () => {
        setPrefSubmitting(true);
        try {
            // Map frontend preference state to backend PreferenceRequest DTO
            const payload = {
                investmentGoals: preferences.investmentGoal || preferences.investmentGoals,
                riskTolerance: preferences.riskTolerance || profile.riskProfile || 'moderate',
                preferredAsset: preferences.preferredAsset,
                sectorIds: preferences.sectors,
                companyIds: preferences.companies,
            };
            console.log('Submitting preferences payload:', payload);
            const resp = await api.put('/profile/update-preferences', payload);
            if (resp.status !== 200 && resp.status !== 201) throw new Error('Failed to update preferences');
            alert('Preferences updated');
            setIsEditingPrefs(false);
        } catch (err) {
            console.error('Preferences update error:', err);
            alert(err?.response?.data?.message || 'Failed to update preferences');
        } finally {
            setPrefSubmitting(false);
        }
    };
    const handleSave = async () => {
        try {
            setIsEditing(false);
            const response = await api.put('/profile/update', { ...profile });
            if (response.status !== 200 && response.status !== 201) throw new Error('Failed to update profile');
            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile:', err);
            if (err?.response?.data?.data === "JWT signature does not match locally computed signature. JWT validity cannot be asserted and should not be trusted.") {
                window.location.reload();
            } else {
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


    // Split view: sidebar with Profile / Preferences

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <aside className="md:col-span-1">
                        <div className="bg-white rounded-xl shadow-md p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-blue-100 p-3 rounded-full">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">{profile.username}</h3>
                                    <p className="text-xs text-gray-500">Investor Profile</p>
                                </div>
                            </div>

                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full text-left px-3 py-2 rounded-lg ${activeTab === 'profile' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                                    Profile
                                </button>
                                <button
                                    onClick={() => setActiveTab('preferences')}
                                    className={`w-full text-left px-3 py-2 rounded-lg ${activeTab === 'preferences' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                                    Preferences
                                </button>
                            </nav>
                        </div>
                    </aside>

                    {/* Main content */}
                    <main className="md:col-span-3">
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-3 rounded-full">
                                        <User className="w-12 h-12 text-blue-600" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-white">{activeTab === 'profile' ? 'Profile' : 'Preferences'}</h1>
                                        <p className="text-blue-100">Manage your {activeTab === 'profile' ? 'personal information' : 'investment preferences'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {activeTab === 'profile' ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                                            <div className="flex items-center gap-3">
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
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <User className="w-4 h-4 inline mr-2" />
                                                    Username
                                                </label>
                                                <input
                                                    type="text"
                                                    value={profile.username}
                                                    disabled
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                />
                                            </div>

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

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <DollarSign className="w-4 h-4 inline mr-2" />
                                                    Account balance ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={profile.balance}
                                                    disabled
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                                <div className="relative">
                                                    <IdCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.firstName}
                                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                                <div className="relative">
                                                    <IdCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.lastName}
                                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="date"
                                                        value={profile.dateOfBirth}
                                                        onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                                <select
                                                    value={profile.gender}
                                                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                                    disabled={!isEditing}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                >
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                                </select>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.addressLine1}
                                                        onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                                                <input
                                                    type="text"
                                                    value={profile.addressLine2}
                                                    onChange={(e) => setProfile({ ...profile, addressLine2: e.target.value })}
                                                    disabled={!isEditing}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                                <input
                                                    type="text"
                                                    value={profile.city}
                                                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                                    disabled={!isEditing}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                                                <input
                                                    type="text"
                                                    value={profile.state}
                                                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                                    disabled={!isEditing}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                                                <input
                                                    type="text"
                                                    value={profile.postalCode}
                                                    onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                                                    disabled={!isEditing}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.country}
                                                        onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.jobTitle}
                                                        onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.companyName}
                                                        onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Industry Background</label>
                                                <div className="relative">
                                                    <Landmark className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={profile.industry}
                                                        onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                                                <select
                                                    value={profile.employmentStatus}
                                                    onChange={(e) => setProfile({ ...profile, employmentStatus: e.target.value })}
                                                    disabled={!isEditing}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                >
                                                    <option value="employed">Employed</option>
                                                    <option value="self_employed">Self-employed</option>
                                                    <option value="student">Student</option>
                                                    <option value="unemployed">Unemployed</option>
                                                    <option value="retired">Retired</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income Range</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                                    <select
                                                        value={profile.salaryRange}
                                                        onChange={(e) => setProfile({ ...profile, salaryRange: e.target.value })}
                                                        disabled={!isEditing}
                                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                    >
                                                        <option value="">Select range</option>
                                                        <option value="Below_50k">Below $50k</option>
                                                        <option value="BETWEEN_50k_100k">$50k–$100k</option>
                                                        <option value="BETWEEN_100k_200k">$100k–$200k</option>
                                                        <option value="Above_200k">Above $200k</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                <Target className="w-5 h-5 inline mr-2" />
                                                Investment Preferences
                                            </h3>
                                            <div>
                                                {!isEditingPrefs ? (
                                                    <button onClick={() => setIsEditingPrefs(true)} className="px-3 py-1 bg-blue-600 text-white rounded-lg">Edit Preferences</button>
                                                ) : (
                                                    <button onClick={() => setIsEditingPrefs(false)} className="px-3 py-1 bg-gray-200 rounded-lg">Cancel</button>
                                                )}
                                            </div>
                                        </div>

                                        {prefLoading ? (
                                            <div className="text-sm text-gray-500">Loading preferences...</div>
                                        ) : (
                                                <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm text-gray-700 mb-2">Risk Tolerance</label>
                                                    <div className="flex gap-3">
                                                        <label className="p-3 border rounded-lg">
                                                            <input type="radio" name="risk_pref" value="low" checked={preferences.riskTolerance==='low'} onChange={() => setRiskTolerance('low')} disabled={!isEditingPrefs} className="mr-2" />
                                                            <span className="font-medium">Low / Conservative</span>
                                                        </label>
                                                        <label className="p-3 border rounded-lg">
                                                            <input type="radio" name="risk_pref" value="moderate" checked={preferences.riskTolerance==='moderate'} onChange={() => setRiskTolerance('moderate')} disabled={!isEditingPrefs} className="mr-2" />
                                                            <span className="font-medium">Moderate</span>
                                                        </label>
                                                        <label className="p-3 border rounded-lg">
                                                            <input type="radio" name="risk_pref" value="high" checked={preferences.riskTolerance==='high'} onChange={() => setRiskTolerance('high')} disabled={!isEditingPrefs} className="mr-2" />
                                                            <span className="font-medium">High / Aggressive</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-gray-700 mb-2">Interested Sectors (up to {MAX_SECTORS})</label>
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative" ref={prefDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={handleToggleSectorsDropdown}
                                                                disabled={!isEditingPrefs || preferences.sectors.length >= MAX_SECTORS}
                                                                className="px-3 py-2 border rounded-lg"
                                                            >
                                                                Select sector
                                                            </button>
                                                            {showSectorsDropdown && (
                                                                <div className="absolute z-20 mt-2 w-56 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                                                                    {sectorsLoading ? (
                                                                        <div className="p-3 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin text-gray-400" /> <span className="text-sm text-gray-500">Loading...</span></div>
                                                                    ) : (
                                                                        <>
                                                                            {sectorsList.filter(item => !preferences.sectors.includes(item.id)).map(item => (
                                                                                <button key={item.id} type="button" onClick={() => toggleSector(item.id)} className="w-full text-left px-3 py-2 hover:bg-gray-100">{item.name}</button>
                                                                            ))}
                                                                            {sectorsList.filter(item => !preferences.sectors.includes(item.id)).length === 0 && (
                                                                                <div className="px-3 py-2 text-sm text-gray-500">No more sectors</div>
                                                                            )}
                                                                            <div className="p-2 border-t">
                                                                                <button type="button" onClick={() => setShowSectorsDropdown(false)} className="text-sm text-gray-600">Done</button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {preferences.sectors.map(id => {
                                                                const s = sectorsList.find(x=>x.id===id);
                                                                return (
                                                                    <div key={id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full border">
                                                                        <span className="text-sm">{s ? s.name : id}</span>
                                                                        <button type="button" onClick={() => toggleSector(id)} disabled={!isEditingPrefs} className="text-gray-600 hover:text-gray-800">×</button>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    {preferences.sectors.length >= MAX_SECTORS && (
                                                        <p className="mt-1 text-xs text-gray-600">Maximum of {MAX_SECTORS} sectors selected.</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-gray-700 mb-2">Interested Companies (up to {MAX_COMPANIES})</label>
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative" ref={companiesDropdownRef}>
                                                            <button
                                                                type="button"
                                                                onClick={handleToggleCompaniesDropdown}
                                                                disabled={!isEditingPrefs || preferences.companies.length >= MAX_COMPANIES}
                                                                className="px-3 py-2 border rounded-lg"
                                                            >
                                                                Select company
                                                            </button>
                                                            {showCompaniesDropdown && (
                                                                <div className="absolute z-20 mt-2 w-56 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                                                                    {companiesList.filter(item => !preferences.companies.includes(item.id)).map(item => (
                                                                        <button key={item.id} type="button" onClick={() => toggleCompany(item.id)} className="w-full text-left px-3 py-2 hover:bg-gray-100">{item.name} ({item.symbol})</button>
                                                                    ))}
                                                                    {companiesList.filter(item => !preferences.companies.includes(item.id)).length === 0 && (
                                                                        <div className="px-3 py-2 text-sm text-gray-500">No more companies</div>
                                                                    )}
                                                                    <div className="p-2 border-t">
                                                                        <button type="button" onClick={() => setShowCompaniesDropdown(false)} className="text-sm text-gray-600">Done</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {preferences.companies.map(id => {
                                                                const c = companiesList.find(x=>x.id===id);
                                                                return (
                                                                    <div key={id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full border">
                                                                        <span className="text-sm">{c ? `${c.name} (${c.symbol})` : id}</span>
                                                                        <button type="button" onClick={() => toggleCompany(id)} disabled={!isEditingPrefs} className="text-gray-600 hover:text-gray-800">×</button>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                    {preferences.companies.length >= MAX_COMPANIES && (
                                                        <p className="mt-1 text-xs text-gray-600">Maximum of {MAX_COMPANIES} companies selected.</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-gray-700 mb-2">Preferred Asset</label>
                                                    <div className="flex gap-3">
                                                        <button type="button" onClick={() => setPreferredAsset('stocks')} disabled={!isEditingPrefs} className={`px-4 py-2 rounded-lg border ${preferences.preferredAsset === 'stocks' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}>Stocks</button>
                                                        <button type="button" onClick={() => setPreferredAsset('crypto')} disabled className="px-4 py-2 rounded-lg border bg-gray-50 text-gray-400 cursor-not-allowed">Crypto (soon)</button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-gray-700 mb-2">Investment Goal</label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {['super_short', 'short', 'medium', 'long'].map(g => (
                                                            <label key={g} className="p-2 border rounded-lg">
                                                                <input type="radio" name="pref_goal" value={g} checked={preferences.investmentGoal === g} onChange={() => setInvestmentGoal(g)} disabled={!isEditingPrefs} className="mr-2" />
                                                                <span className="text-sm">{g === 'super_short' ? 'Super short <2 yrs' : g === 'short' ? 'Short <5 yrs' : g === 'medium' ? 'Medium 5–10 yrs' : 'Long >20 yrs'}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="pt-2 flex justify-end">
                                                    <button onClick={handlePreferencesSave} disabled={!isEditingPrefs || prefSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60">
                                                        {prefSubmitting ? 'Saving...' : 'Save Preferences'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
