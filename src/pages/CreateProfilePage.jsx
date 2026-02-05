//get sectors and companies from db in future iterations

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Calendar, MapPin, Building2, Landmark, IdCard, Globe, Briefcase, CheckCircle, XCircle, AlertCircle, Loader, Save, DollarSign } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;

// fetched from API: { id, name } for sectors and { id, symbol, name } for companies
const MAX_SECTORS = 4;
const MAX_COMPANIES = 8;
const CreateProfilePage = () => {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuth();
  const [createData, setCreateData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    username: '',
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
    phone: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [preferences, setPreferences] = useState({
    sectors: [],
    riskTolerance: 'moderate',
    preferredAsset: 'stocks', // only stocks selectable for now
    investmentGoals: 'short',
    companies: [],
  });
  const [sectorsList, setSectorsList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [profileCreated, setProfileCreated] = useState(false);
  const [prefSubmitting, setPrefSubmitting] = useState(false);
  const dropdownRef = useRef(null);
  const [showSectorsDropdown, setShowSectorsDropdown] = useState(false);
  const companiesDropdownRef = useRef(null);
  const [showCompaniesDropdown, setShowCompaniesDropdown] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | invalid | checking | available | unavailable
  const [usernameMessage, setUsernameMessage] = useState('');
  const debounceRef = useRef(null);

  // Username debounce + validation
  useEffect(() => {
    

    const name = createData.username.trim();
    setUsernameMessage('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!name) {
      setUsernameStatus('idle');
      return;
    }
    if (name.length <= 5 || !USERNAME_REGEX.test(name)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Invalid username. Min 6 chars, only letters, numbers, and _');
      return;
    }

    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await api.get('/profile/check-username', { params: { username: name } });
        const available = (
          resp.data.message === 'Username is available'|| resp.data.data === true
        );
        if (available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available');
        } else {
          setUsernameStatus('unavailable');
          setUsernameMessage('Username is not available');
        }
      } catch (e) {
        console.error('Username check failed', e);
        setUsernameStatus('unavailable');
        setUsernameMessage('Unable to verify username right now');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [createData.username]);

  useEffect(() => {
    // Fetch sectors and companies lists on mount so dropdowns have data
    const fetchLists = async () => {
      // Fetch sectors
      try {
        setSectorsLoading(true);
        const sres = await api.get('/sectors');
        const sdata = Array.isArray(sres?.data?.data) ? sres.data.data : [];
        setSectorsList(sdata);
      } catch (e) {
        console.error('Failed to load sectors', e);
        setSectorsList([]);
      } finally {
        setSectorsLoading(false);
      }

      // Fetch companies
      try {
        setCompaniesLoading(true);
        const cres = await api.get('/companies');
        const cdata = Array.isArray(cres?.data?.data) ? cres.data.data : [];
        setCompaniesList(cdata);
      } catch (e) {
        console.error('Failed to load companies', e);
        setCompaniesList([]);
      } finally {
        setCompaniesLoading(false);
      }
    };

    fetchLists();
  }, []);

  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  const handleToggleSectorsDropdown = async () => {
    if (!showSectorsDropdown) {
      if (!sectorsList.length) {
        setSectorsLoading(true);
        try {
          const sres = await api.get('/sectors');
          if (sres?.data?.data) setSectorsList(sres.data.data);
        } catch (e) {
          console.error('Failed to load sectors', e);
        } finally {
          setSectorsLoading(false);
        }
      }
      setShowSectorsDropdown(true);
    } else {
      setShowSectorsDropdown(false);
    }
  };

  const handleToggleCompaniesDropdown = async () => {
    if (!showCompaniesDropdown) {
      if (!companiesList.length) {
        setCompaniesLoading(true);
        try {
          const cres = await api.get('/companies');
          if (cres?.data?.data) setCompaniesList(cres.data.data);
        } catch (e) {
          console.error('Failed to load companies', e);
        } finally {
          setCompaniesLoading(false);
        }
      }
      setShowCompaniesDropdown(true);
    } else {
      setShowCompaniesDropdown(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const name = createData.username.trim();
    if (name.length <= 5 || !USERNAME_REGEX.test(name)) {
      setFormError('Please provide a valid username (min 6 chars, only letters, numbers, and _).');
      return;
    }
    if (usernameStatus !== 'available') {
      setFormError('Please choose an available username.');
      return;
    }
    const required = ['firstName','lastName','dateOfBirth','gender','addressLine1','city','postalCode','state','country','jobTitle','companyName','industry','salaryRange'];
    const missing = required.filter(f => !String(createData[f] || '').trim());
    if (missing.length) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      // console.log(createData);
      const resp = await api.post('/profile/create', createData);
      if (resp.status !== 200 && resp.status !== 201) throw new Error('Failed to create profile');
      // mark profile created and show preferences form
      setProfileCreated(true);
      setFormError('');
    } catch (err) {
      console.error('Create profile error:', err);
      setFormError(err?.response?.data?.message || 'Failed to create profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!preferences.sectors.length) {
      setFormError('Please select at least one sector.');
      return;
    }
    setPrefSubmitting(true);
    try {
      // map to backend PreferenceRequest DTO
      const payload = {
        investmentGoals: preferences.investmentGoals,
        riskTolerance: preferences.riskTolerance,
        preferredAsset: preferences.preferredAsset,
        sectorIds: preferences.sectors,
        companyIds: preferences.companies,
      };
      console.log('Submitting preferences payload:', payload);
      const resp = await api.post('/profile/create-preferences', payload);
      if (resp.status !== 200 && resp.status !== 201) throw new Error('Failed to save preferences');
      setPreferencesSaved(true);
      setShowSectorsDropdown(false);
      alert('Preferences saved!');
      api.post("/auth/refresh")
      .then(res => {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      });
      navigate('/profile');
    } catch (err) {
      console.error('Preferences save error:', err);
      setFormError(err?.response?.data?.message || 'Failed to save preferences. Please try again.');
    } finally {
      setPrefSubmitting(false);
    }
  };

  const toggleSector = (sectorId) => {
    setPreferences(prev => {
      const exists = prev.sectors.includes(sectorId);
      if (exists) return { ...prev, sectors: prev.sectors.filter(s => s !== sectorId) };
      if (prev.sectors.length >= MAX_SECTORS) return prev; // ignore additional
      const newSectors = [...prev.sectors, sectorId];
      if (newSectors.length >= MAX_SECTORS) setShowSectorsDropdown(false);
      return { ...prev, sectors: newSectors };
    });
  };

  const toggleCompany = (companyId) => {
    setPreferences(prev => {
      const exists = prev.companies.includes(companyId);
      if (exists) return { ...prev, companies: prev.companies.filter(c => c !== companyId) };
      if (prev.companies.length >= MAX_COMPANIES) return prev;
      const newCompanies = [...prev.companies, companyId];
      if (newCompanies.length >= MAX_COMPANIES) setShowCompaniesDropdown(false);
      return { ...prev, companies: newCompanies };
    });
  };

  const setRisk = (level) => setPreferences(prev => ({ ...prev, riskTolerance: level }));
  const setAsset = (asset) => setPreferences(prev => ({ ...prev, preferredAsset: asset }));
  const setGoal = (goal) => setPreferences(prev => ({ ...prev, investmentGoals: goal }));
  useEffect(() => {
    function handleDocClick(e) {
      // close either dropdown if click occurs outside
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSectorsDropdown(false);
      }
      if (companiesDropdownRef.current && !companiesDropdownRef.current.contains(e.target)) {
        setShowCompaniesDropdown(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setShowSectorsDropdown(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('touchstart', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('touchstart', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
            <h1 className="text-2xl font-bold text-white">Create Your Profile</h1>
            <p className="text-white/80 text-sm mt-1">Tell us a bit about you to personalize your experience.</p>
          </div>

          {!profileCreated && (
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
            {formError && (
              <div className="flex items-center text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>{formError}</span>
              </div>
            )}

            {/* Personal Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">First Name</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={createData.firstName}
                      onChange={(e)=>setCreateData({...createData, firstName: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Last Name</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={createData.lastName}
                      onChange={(e)=>setCreateData({...createData, lastName: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={createData.dateOfBirth}
                      onChange={(e)=>setCreateData({...createData, dateOfBirth: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Gender</label>
                  <select
                    value={createData.gender}
                    onChange={(e)=>setCreateData({...createData, gender: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Phone (optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={createData.phone}
                      onChange={(e)=>setCreateData({...createData, phone: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., +1 555 123 4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Choose a Username</h2>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={createData.username}
                  onChange={(e)=>setCreateData({...createData, username: e.target.value})}
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="at least 6 chars, letters/numbers/_"
                  required
                />
                <div className="absolute right-3 top-2.5">
                  {usernameStatus === 'checking' && <Loader className="w-5 h-5 animate-spin text-gray-400" />}
                  {usernameStatus === 'available' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {['invalid','unavailable'].includes(usernameStatus) && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </div>
              {usernameMessage && (
                <p className={`mt-1 text-xs ${usernameStatus==='available' ? 'text-green-600' : 'text-red-600'}`}>{usernameMessage}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Address</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Address Line 1</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={createData.addressLine1}
                      onChange={(e)=>setCreateData({...createData, addressLine1: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Address Line 2 (optional)</label>
                  <input
                    type="text"
                    value={createData.addressLine2}
                    onChange={(e)=>setCreateData({...createData, addressLine2: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={createData.city}
                      onChange={(e)=>setCreateData({...createData, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">State/Province</label>
                    <input
                      type="text"
                      value={createData.state}
                      onChange={(e)=>setCreateData({...createData, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={createData.postalCode}
                      onChange={(e)=>setCreateData({...createData, postalCode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Country</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={createData.country}
                        onChange={(e)=>setCreateData({...createData, country: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Occupation & Income */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Occupation & Income</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={createData.jobTitle}
                      onChange={(e)=>setCreateData({...createData, jobTitle: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>
                </div>

                  {/* preferences moved below; shown after profile creation */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={createData.companyName}
                      onChange={(e)=>setCreateData({...createData, companyName: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., TechCorp"
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1">Industry Background</label>
                  <div className="relative">
                    <Landmark className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={createData.industry}
                      onChange={(e)=>setCreateData({...createData, industry: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Technology"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Employment Status</label>
                  <select
                    value={createData.employmentStatus}
                    onChange={(e)=>setCreateData({...createData, employmentStatus: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="student">Student</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Annual Income Range</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <select
                      value={createData.salaryRange}
                      onChange={(e)=>setCreateData({...createData, salaryRange: e.target.value})}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="">Select range</option>
                      <option value="<50k">Below $50k</option>
                      <option value="50k-100k">$50k–$100k</option>
                      <option value="100k-250k">$100k–$250k</option>
                      <option value=">250k">Above $250k</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 flex items-center gap-2"
              >
                {submitting ? (<><Loader className="w-4 h-4 animate-spin" /> Creating...</>) : (<><Save className="w-4 h-4" /> Create Profile</>)}
              </button>
            </div>
            </form>
          )}
          {profileCreated && !preferencesSaved && (
            <div className="p-6 border-t">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Set Your Preferences</h2>
              <form onSubmit={handlePreferencesSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Interested Sectors (up to {MAX_SECTORS})</label>
                  <div className="flex items-start gap-3">
                      <div className="relative" ref={dropdownRef}>
                        <button type="button" onClick={handleToggleSectorsDropdown} disabled={preferences.sectors.length >= MAX_SECTORS} className="px-3 py-2 border rounded-lg">
                          Select sector
                        </button>
                        {showSectorsDropdown && (
                          <div className="absolute z-20 mt-2 w-56 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                            {sectorsLoading ? (
                              <div className="p-3 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin text-gray-400" /> <span className="text-sm text-gray-500">Loading...</span></div>
                            ) : (
                              <>
                                {sectorsList.filter(item => !preferences.sectors.includes(item.id)).map(item => (
                                  <button key={item.id} type="button" onClick={()=>toggleSector(item.id)} className="w-full text-left px-3 py-2 hover:bg-gray-100">{item.name}</button>
                                ))}
                                {sectorsList.filter(item => !preferences.sectors.includes(item.id)).length===0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">No more sectors</div>
                                )}
                                <div className="p-2 border-t">
                                  <button type="button" onClick={()=>setShowSectorsDropdown(false)} className="text-sm text-gray-600">Done</button>
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
                              <button type="button" onClick={()=>toggleSector(id)} className="text-gray-600 hover:text-gray-800">×</button>
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
                        <button type="button" onClick={handleToggleCompaniesDropdown} disabled={preferences.companies.length >= MAX_COMPANIES} className="px-3 py-2 border rounded-lg">
                          Select company
                        </button>
                        {showCompaniesDropdown && (
                          <div className="absolute z-20 mt-2 w-56 bg-white border rounded shadow-lg max-h-48 overflow-auto">
                            {companiesLoading ? (
                              <div className="p-3 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin text-gray-400" /> <span className="text-sm text-gray-500">Loading...</span></div>
                            ) : (
                              <>
                                {companiesList.filter(item => !preferences.companies.includes(item.id)).map(item => (
                                  <button key={item.id} type="button" onClick={()=>toggleCompany(item.id)} className="w-full text-left px-3 py-2 hover:bg-gray-100">{item.name} ({item.symbol})</button>
                                ))}
                                {companiesList.filter(item => !preferences.companies.includes(item.id)).length===0 && (
                                  <div className="px-3 py-2 text-sm text-gray-500">No more companies</div>
                                )}
                                <div className="p-2 border-t">
                                  <button type="button" onClick={()=>setShowCompaniesDropdown(false)} className="text-sm text-gray-600">Done</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {preferences.companies.map(id => {
                          const c = companiesList.find(x=>x.id===id);
                          return (
                            <div key={id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full border">
                              <span className="text-sm">{c ? `${c.name} (${c.symbol})` : id}</span>
                              <button type="button" onClick={()=>toggleCompany(id)} className="text-gray-600 hover:text-gray-800">×</button>
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
                  <label className="block text-sm text-gray-700 mb-2">Risk Profile</label>
                  <div className="flex gap-3">
                    <label className="p-3 border rounded-lg">
                      <input type="radio" name="risk2" value="low" checked={preferences.riskTolerance==='low'} onChange={()=>setRisk('low')} className="mr-2" />
                      <span className="font-medium">Low / Conservative</span>
                    </label>
                    <label className="p-3 border rounded-lg">
                      <input type="radio" name="risk2" value="moderate" checked={preferences.riskTolerance==='moderate'} onChange={()=>setRisk('moderate')} className="mr-2" />
                      <span className="font-medium">Moderate</span>
                    </label>
                    <label className="p-3 border rounded-lg">
                      <input type="radio" name="risk2" value="high" checked={preferences.riskTolerance==='high'} onChange={()=>setRisk('high')} className="mr-2" />
                      <span className="font-medium">High / Aggressive</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Preferred Asset Types</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={()=>setAsset('stocks')} className={`px-4 py-2 rounded-lg border ${preferences.preferredAsset==='stocks' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'}`}>Stocks (Equities)</button>
                    <button type="button" disabled title="In development" className="px-4 py-2 rounded-lg border bg-gray-50 text-gray-400 cursor-not-allowed">Crypto (coming soon)</button>
                    <button type="button" disabled title="In development" className="px-4 py-2 rounded-lg border bg-gray-50 text-gray-400 cursor-not-allowed">Commodities (coming soon)</button>
                    <button type="button" disabled title="In development" className="px-4 py-2 rounded-lg border bg-gray-50 text-gray-400 cursor-not-allowed">Mutual Funds / ETFs (coming soon)</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Investment Goals</label>
                  <div className="flex gap-2 flex-wrap">
                    <label className="p-2 border rounded-lg">
                      <input type="radio" name="goal2" value="super_short" checked={preferences.investmentGoals==='super_short'} onChange={()=>setGoal('super_short')} className="mr-2" />
                      <span className="text-sm">Super short &lt;2 yrs</span>
                    </label>
                    <label className="p-2 border rounded-lg">
                      <input type="radio" name="goal2" value="short" checked={preferences.investmentGoals==='short'} onChange={()=>setGoal('short')} className="mr-2" />
                      <span className="text-sm">Short &lt;5 yrs</span>
                    </label>
                    <label className="p-2 border rounded-lg">
                      <input type="radio" name="goal2" value="medium" checked={preferences.investmentGoals==='medium'} onChange={()=>setGoal('medium')} className="mr-2" />
                      <span className="text-sm">Medium 5–10 yrs</span>
                    </label>
                    <label className="p-2 border rounded-lg">
                      <input type="radio" name="goal2" value="long" checked={preferences.investmentGoals==='long'} onChange={()=>setGoal('long')} className="mr-2" />
                      <span className="text-sm">Long &gt;20 yrs</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" disabled={prefSubmitting} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60">
                    {prefSubmitting ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateProfilePage;
