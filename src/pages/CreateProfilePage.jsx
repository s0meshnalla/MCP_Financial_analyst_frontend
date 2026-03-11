import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Calendar, MapPin, Building2, Landmark, IdCard, Globe,
  Briefcase, CheckCircle, XCircle, AlertCircle, Loader, DollarSign,
  ArrowRight, ArrowLeft, Shield, Target, TrendingUp, SkipForward, Sparkles, ChevronDown
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;
const MAX_SECTORS = 4;
const STEPS = [
  { label: 'Personal Info', icon: User, desc: 'Tell us who you are' },
  { label: 'Background', icon: Briefcase, desc: 'Location & employment' },
  { label: 'Preferences', icon: Target, desc: 'Investment profile' },
];

const CreateProfilePage = () => {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [direction, setDirection] = useState('next'); // 'next' | 'back' for animation

  // ---- Profile data ----
  const [createData, setCreateData] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'PREFER_NOT_TO_SAY',
    username: '', addressLine1: '', addressLine2: '', city: '', state: '',
    postalCode: '', country: '', jobTitle: '', companyName: '', industry: '',
    employmentStatus: 'EMPLOYED', salaryRange: '', phone: '',
  });

  // ---- Preferences ----
  const [preferences, setPreferences] = useState({
    sectors: [], riskTolerance: 'MODERATE', preferredAsset: 'STOCKS', investmentGoals: 'SHORT',
  });
  const [sectorsList, setSectorsList] = useState([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [showSectorsDropdown, setShowSectorsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ---- Username validation ----
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const debounceRef = useRef(null);

  // Username debounce
  useEffect(() => {
    const name = createData.username.trim();
    setUsernameMessage('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!name) { setUsernameStatus('idle'); return; }
    if (name.length <= 5 || !USERNAME_REGEX.test(name)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Min 6 chars, only letters, numbers, and _');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await api.get('/profile/check-username', { params: { username: name } });
        const available = resp.data.message === 'Username is available' || resp.data.data === true;
        setUsernameStatus(available ? 'available' : 'unavailable');
        setUsernameMessage(available ? 'Username is available' : 'Username is not available');
      } catch {
        setUsernameStatus('unavailable');
        setUsernameMessage('Unable to verify username right now');
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [createData.username]);

  // Fetch sectors on mount
  useEffect(() => {
    (async () => {
      try {
        setSectorsLoading(true);
        const sres = await api.get('/sectors');
        setSectorsList(Array.isArray(sres?.data?.data) ? sres.data.data : []);
      } catch { setSectorsList([]); }
      finally { setSectorsLoading(false); }
    })();
  }, []);

  // Close dropdown on outside click / escape
  useEffect(() => {
    const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowSectorsDropdown(false); };
    const handleKey = (e) => { if (e.key === 'Escape') setShowSectorsDropdown(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, []);

  const toggleSector = (id) => {
    setPreferences(prev => {
      if (prev.sectors.includes(id)) return { ...prev, sectors: prev.sectors.filter(s => s !== id) };
      if (prev.sectors.length >= MAX_SECTORS) return prev;
      const next = [...prev.sectors, id];
      if (next.length >= MAX_SECTORS) setShowSectorsDropdown(false);
      return { ...prev, sectors: next };
    });
  };

  // ---- Step validation ----
  const validateStep = (s) => {
    setFormError('');
    if (s === 0) {
      if (!createData.firstName.trim() || !createData.lastName.trim()) return 'First name and last name are required.';
      if (!createData.dateOfBirth) return 'Date of birth is required.';
      const name = createData.username.trim();
      if (!name || name.length <= 5 || !USERNAME_REGEX.test(name)) return 'Please provide a valid username (min 6 chars, letters/numbers/_).';
      if (usernameStatus !== 'available') return 'Please choose an available username before continuing.';
    }
    if (s === 1) {
      if (!createData.addressLine1.trim() || !createData.city.trim() || !createData.state.trim() || !createData.postalCode.trim() || !createData.country.trim())
        return 'Please fill in all address fields.';
      if (!createData.jobTitle.trim() || !createData.companyName.trim() || !createData.industry.trim() || !createData.salaryRange)
        return 'Please fill in all employment fields.';
    }
    return null;
  };

  // ---- Submit profile (after step 1 → 2 data collected) ----
  const submitProfile = async () => {
    setSubmitting(true);
    try {
      const resp = await api.post('/profile/create', createData);
      if (resp.status !== 200 && resp.status !== 201) throw new Error('Failed');
      setProfileCreated(true);
      setFormError('');
      return true;
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create profile. Please try again.');
      return false;
    } finally { setSubmitting(false); }
  };

  // ---- Submit preferences ----
  const submitPreferences = async (skip = false) => {
    setSubmitting(true);
    try {
      const payload = {
        investmentGoals: preferences.investmentGoals,
        riskTolerance: preferences.riskTolerance,
        preferredAsset: preferences.preferredAsset,
        sectorIds: skip ? [] : preferences.sectors,
        companyIds: [],
      };
      const resp = await api.post('/profile/create-preferences', payload);
      if (resp.status !== 200 && resp.status !== 201) throw new Error('Failed');
      // Refresh auth so the app knows profile is complete
      try {
        const refreshRes = await api.post('/auth/refresh');
        const p = refreshRes?.data?.data || refreshRes?.data;
        setAccessToken(p?.accessToken);
        setUser(p?.user);
      } catch { /* navigate anyway */ }
      navigate('/home');
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save preferences. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ---- Navigation ----
  const handleNext = async () => {
    const err = validateStep(step);
    if (err) { setFormError(err); return; }

    if (step === 1 && !profileCreated) {
      const ok = await submitProfile();
      if (!ok) return;
    }
    if (step === 2) {
      await submitPreferences(false);
      return;
    }
    setDirection('next');
    setFormError('');
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setDirection('back');
    setFormError('');
    setStep(s => s - 1);
  };

  const handleSkipPreferences = async () => {
    if (!profileCreated) {
      const err1 = validateStep(1);
      if (err1) { setFormError(err1); return; }
      const ok = await submitProfile();
      if (!ok) return;
    }
    await submitPreferences(true);
  };

  const field = (key, val) => setCreateData(prev => ({ ...prev, [key]: val }));

  // ---- Render ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-4 py-1.5 text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" /> Let's set up your account
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Profile</h1>
          <p className="text-gray-500 mt-1">Just a few steps to personalize your experience</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div className={`h-0.5 w-12 sm:w-20 transition-colors duration-300 ${done ? 'bg-purple-500' : 'bg-gray-200'}`} />
                )}
                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${done ? 'bg-purple-600 text-white' : active ? 'bg-purple-100 text-purple-600 ring-2 ring-purple-400' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-purple-700' : done ? 'text-purple-600' : 'text-gray-400'}`}>{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Step header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">{STEPS[step].label}</h2>
            <p className="text-white/70 text-sm">{STEPS[step].desc}</p>
          </div>

          <div className="p-6">
            {/* Error */}
            {formError && (
              <div className="flex items-center text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* ========== STEP 0: Personal Info ========== */}
            {step === 0 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="text" value={createData.firstName} onChange={e => field('firstName', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" placeholder="John" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="text" value={createData.lastName} onChange={e => field('lastName', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" placeholder="Doe" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="date" value={createData.dateOfBirth} onChange={e => field('dateOfBirth', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select value={createData.gender} onChange={e => field('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="tel" value={createData.phone} onChange={e => field('phone', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" placeholder="+1 555 123 4567" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="text" value={createData.username} onChange={e => field('username', e.target.value)}
                      className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      placeholder="at least 6 chars, letters/numbers/_" />
                    <div className="absolute right-3 top-2.5">
                      {usernameStatus === 'checking' && <Loader className="w-5 h-5 animate-spin text-gray-400" />}
                      {usernameStatus === 'available' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {['invalid','unavailable'].includes(usernameStatus) && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>
                  {usernameMessage && (
                    <p className={`mt-1 text-xs ${usernameStatus === 'available' ? 'text-green-600' : 'text-red-600'}`}>{usernameMessage}</p>
                  )}
                </div>
              </div>
            )}

            {/* ========== STEP 1: Background ========== */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Address */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-500" /> Address
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Address Line 1 *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input type="text" value={createData.addressLine1} onChange={e => field('addressLine1', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Address Line 2 (optional)</label>
                      <input type="text" value={createData.addressLine2} onChange={e => field('addressLine2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">City *</label>
                        <input type="text" value={createData.city} onChange={e => field('city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">State *</label>
                        <input type="text" value={createData.state} onChange={e => field('state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Postal Code *</label>
                        <input type="text" value={createData.postalCode} onChange={e => field('postalCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Country *</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                          <input type="text" value={createData.country} onChange={e => field('country', e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employment */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-500" /> Employment
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Job Title *</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input type="text" value={createData.jobTitle} onChange={e => field('jobTitle', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                          placeholder="e.g., Software Engineer" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Company Name *</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input type="text" value={createData.companyName} onChange={e => field('companyName', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                          placeholder="e.g., TechCorp" />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Industry *</label>
                      <div className="relative">
                        <Landmark className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input type="text" value={createData.industry} onChange={e => field('industry', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                          placeholder="e.g., Technology" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Employment Status</label>
                      <select value={createData.employmentStatus} onChange={e => field('employmentStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                        <option value="EMPLOYED">Employed</option>
                        <option value="SELF_EMPLOYED">Self-employed</option>
                        <option value="STUDENT">Student</option>
                        <option value="UNEMPLOYED">Unemployed</option>
                        <option value="RETIRED">Retired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Annual Income *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <select value={createData.salaryRange} onChange={e => field('salaryRange', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                          <option value="">Select range</option>
                          <option value="<50k">Below $50k</option>
                          <option value="50k-100k">$50k – $100k</option>
                          <option value="100k-250k">$100k – $250k</option>
                          <option value=">250k">Above $250k</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========== STEP 2: Investment Preferences ========== */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Risk Tolerance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" /> Risk Tolerance
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { val: 'LOW',      label: 'Conservative', desc: 'Low risk, steady returns', color: 'green' },
                      { val: 'MODERATE', label: 'Moderate',     desc: 'Balanced risk & reward', color: 'yellow' },
                      { val: 'HIGH',     label: 'Aggressive',   desc: 'High risk, high reward', color: 'red' },
                    ].map(r => (
                      <button key={r.val} type="button" onClick={() => setPreferences(p => ({ ...p, riskTolerance: r.val }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200
                          ${preferences.riskTolerance === r.val
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                        <div className={`w-8 h-8 rounded-full mb-2 flex items-center justify-center
                          ${r.color === 'green' ? 'bg-green-100 text-green-600' : r.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{r.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Investment Horizon */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-500" /> Investment Horizon
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { val: 'SUPER_SHORT', label: '< 2 years',   tag: 'Very Short' },
                      { val: 'SHORT',       label: '2–5 years',   tag: 'Short' },
                      { val: 'MEDIUM',      label: '5–10 years',  tag: 'Medium' },
                      { val: 'LONG',        label: '10+ years',   tag: 'Long' },
                    ].map(g => (
                      <button key={g.val} type="button" onClick={() => setPreferences(p => ({ ...p, investmentGoals: g.val }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all duration-200
                          ${preferences.investmentGoals === g.val
                            ? 'border-purple-500 bg-purple-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                        <p className="font-semibold text-gray-900 text-sm">{g.tag}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{g.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Asset */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" /> Preferred Asset
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button type="button"
                      className="px-4 py-2 rounded-lg border-2 border-purple-500 bg-purple-50 text-purple-700 font-medium text-sm">
                      Stocks (Equities)
                    </button>
                    {['Crypto', 'Commodities', 'Mutual Funds / ETFs'].map(a => (
                      <button key={a} type="button" disabled
                        className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm cursor-not-allowed">
                        {a} <span className="text-xs">(soon)</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sectors */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-purple-500" /> Interested Sectors
                    <span className="text-xs font-normal text-gray-400 normal-case">(optional, up to {MAX_SECTORS})</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">Help us tailor recommendations. You can always update this later.</p>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="relative" ref={dropdownRef}>
                      <button type="button" onClick={() => setShowSectorsDropdown(v => !v)}
                        disabled={preferences.sectors.length >= MAX_SECTORS}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition">
                        Select sector <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {showSectorsDropdown && (
                        <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-auto">
                          {sectorsLoading ? (
                            <div className="p-3 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin text-gray-400" /> <span className="text-sm text-gray-500">Loading...</span></div>
                          ) : (
                            <>
                              {sectorsList.filter(s => !preferences.sectors.includes(s.id)).map(s => (
                                <button key={s.id} type="button" onClick={() => toggleSector(s.id)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 hover:text-purple-700 transition">{s.name}</button>
                              ))}
                              {sectorsList.filter(s => !preferences.sectors.includes(s.id)).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No more sectors</div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {preferences.sectors.map(id => {
                      const s = sectorsList.find(x => x.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {s ? s.name : id}
                          <button type="button" onClick={() => toggleSector(id)} className="hover:text-purple-900 transition">×</button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
            <div>
              {step > 0 && (
                <button type="button" onClick={handleBack} disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 2 && (
                <button type="button" onClick={handleSkipPreferences} disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
                  <SkipForward className="w-4 h-4" /> Skip for now
                </button>
              )}
              <button type="button" onClick={handleNext} disabled={submitting}
                className="flex items-center gap-1.5 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 font-medium text-sm transition shadow-sm">
                {submitting ? (
                  <><Loader className="w-4 h-4 animate-spin" /> {step === 2 ? 'Saving...' : 'Submitting...'}</>
                ) : step === 2 ? (
                  <><CheckCircle className="w-4 h-4" /> Finish</>
                ) : (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step hint */}
        <p className="text-center text-xs text-gray-400 mt-4">Step {step + 1} of {STEPS.length}</p>
      </div>

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default CreateProfilePage;
