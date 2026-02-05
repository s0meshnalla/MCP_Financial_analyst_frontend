import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, UserPlus, Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from "../context/AuthContext";
const SignupPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOtpStage, setIsOtpStage] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [signupError, setSignupError] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showPwHintsFocus, setShowPwHintsFocus] = useState(false);
    const [showPwHintsHover, setShowPwHintsHover] = useState(false);
    const [expiryTs, setExpiryTs] = useState(null);
    const [remainingSecs, setRemainingSecs] = useState(0);
    const [resendCount, setResendCount] = useState(0);
    const resendLimit = 3;
    const [cooldownTs, setCooldownTs] = useState(null);
    const [cooldownSecs, setCooldownSecs] = useState(0);
    const { setAccessToken, setUser } = useAuth();
    const navigate = useNavigate();

    const isStrongPassword = (pw) => {
        // At least 8 chars, uppercase, lowercase, number, special char
        const hasUpper = /[A-Z]/.test(pw);
        const hasLower = /[a-z]/.test(pw);
        const hasNumber = /[0-9]/.test(pw);
        const hasSpecial = /[^A-Za-z0-9]/.test(pw);
        const longEnough = pw.length >= 8;
        return hasUpper && hasLower && hasNumber && hasSpecial && longEnough;
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        // Validate confirm password matches
        if (password !== confirmPassword) {
            setConfirmError('Passwords do not match.');
            return;
        }

        setConfirmError('');
        // Validate password strength before submitting
        if (!isStrongPassword(password)) {
            setPasswordError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
            return;
        }

        setPasswordError('');
        setSignupError('');
        setIsLoading(true);

        try {
            const resp = await api.post('/auth/signup', { email, password });
            if(resp.status !== 200 && resp.status !== 201) {
                throw new Error('Signup failed');
            }
            // Move to OTP verification stage
            setIsOtpStage(true);
            // Set 5-minute expiry for OTP
            const ts = Date.now() + 5 * 60 * 1000;
            setExpiryTs(ts);
            setResendCount(0);
            setCooldownTs(null);
            setCooldownSecs(0);
            // Optionally show inline info message in OTP view. Here we just switch views.
        } catch (error) {
            console.error('Signup error:', error);
            if (error.response) {
                const status = error.response.status;
                const msg = error.response.data?.message || error.response.data?.body?.message || 'Signup failed';
                if (status === 409) {
                    setSignupError('User already exists. Please log in instead.');
                } else {
                    setSignupError(msg);
                }
            } else {
                setSignupError('Network error. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Countdown timer for OTP expiry
    React.useEffect(() => {
        if (!isOtpStage || !expiryTs) return;
        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((expiryTs - now) / 1000));
            setRemainingSecs(diff);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isOtpStage, expiryTs]);

    // Cooldown timer for OTP resend (1 minute)
    React.useEffect(() => {
        if (!cooldownTs) {
            setCooldownSecs(0);
            return;
        }
        const tick = () => {
            const now = Date.now();
            const diff = Math.max(0, Math.floor((cooldownTs - now) / 1000));
            setCooldownSecs(diff);
            if (diff === 0) {
                setCooldownTs(null);
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [cooldownTs]);

    const handleResendOtp = async () => {
        if (resendCount >= resendLimit) {
            setVerifyError('Resend limit reached.');
            return;
        }
        if (cooldownTs && Date.now() < cooldownTs) {
            const secs = Math.ceil((cooldownTs - Date.now()) / 1000);
            setVerifyError(`Please wait ${secs}s before resending.`);
            return;
        }
        setVerifyError('');
        setIsLoading(true);
        try {
            const resp = await api.post('/auth/resend-otp', { email,password });
            if (resp.status !== 200 && resp.status !== 201) {
                throw new Error('Resend failed');
            }
            setResendCount((c) => c + 1);
            // Reset expiry on resend
            setExpiryTs(Date.now() + 5 * 60 * 1000);
            // Start 1-minute cooldown
            setCooldownTs(Date.now() + 60 * 1000);
        } catch (error) {
            console.error('Resend OTP error:', error);
            const msg = error.response?.data?.message || 'Failed to resend OTP';
            setVerifyError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!otp || otp.trim().length === 0) {
            alert('Please enter the OTP.');
            return;
        }

        setVerifyError('');
        setIsLoading(true);
        try {
            const resp = await api.post('/auth/verify-email', { email, password, otp });
            if(resp.status !== 200 && resp.status !== 201) {
                throw new Error('Verification failed');
            }
            var { accessToken, user } = resp.data.data;
            user={...user, isProfileCreated: false};
            setAccessToken(accessToken);

            setUser(user);
            // Redirect to dedicated profile creation page
            navigate('/create-profile');
        } catch (error) {
            console.error('Verify error:', error);
            const status = error.response?.status;
            const msg = error.response?.data?.message || error.response?.data?.body?.message || 'Verification failed. Please check the OTP and try again.';
            if (status === 400) {
                setVerifyError('Wrong OTP, retry again.');
            } else {
                setVerifyError(msg);
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-blue-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-purple-600 p-3 rounded-full mb-4">
                            <UserPlus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                        <p className="text-gray-300 text-sm">Join the MCP Multi-Agent System</p>
                    </div>

                    {!isOtpStage ? (
                        <form onSubmit={handleSignup} className="space-y-6">
                            {/* Email */}
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
                                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onFocus={() => setShowPwHintsFocus(true)}
                                        onBlur={() => setShowPwHintsFocus(false)}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-20 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Enter a strong password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-9 top-2.5 text-gray-400 hover:text-gray-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Password requirements"
                                        onMouseEnter={() => setShowPwHintsHover(true)}
                                        onMouseLeave={() => setShowPwHintsHover(false)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                                    >
                                        <Info className="w-5 h-5" />
                                    </button>
                                    {(showPwHintsFocus || showPwHintsHover) && (
                                        <div className="absolute z-10 left-0 top-full mt-2 w-full sm:w-72 bg-slate-900/90 border border-white/20 rounded-lg p-3 shadow-xl">
                                            {(() => {
                                                const hasUpper = /[A-Z]/.test(password);
                                                const hasLower = /[a-z]/.test(password);
                                                const hasNumber = /[0-9]/.test(password);
                                                const hasSpecial = /[^A-Za-z0-9]/.test(password);
                                                const longEnough = password.length >= 8;
                                                const Item = ({ ok, label }) => (
                                                    <div className={`flex items-center text-xs ${ok ? 'text-green-400' : 'text-gray-300'}`}>
                                                        {ok ? (
                                                            <CheckCircle className="w-4 h-4 mr-2" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                        )}
                                                        <span>{label}</span>
                                                    </div>
                                                );
                                                return (
                                                    <>
                                                        <Item ok={hasUpper} label="Uppercase letter (A-Z)" />
                                                        <Item ok={hasLower} label="Lowercase letter (a-z)" />
                                                        <Item ok={hasNumber} label="Number (0-9)" />
                                                        <Item ok={hasSpecial} label="Special character (!@#$%^&*)" />
                                                        <Item ok={longEnough} label="Minimum length 8" />
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                                {passwordError && (
                                <div className="text-red-400 text-sm">
                                    {passwordError}
                                </div>
                            )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Re-enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                        onClick={() => setShowConfirmPassword((v) => !v)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {confirmError && (
                                    <p className="text-red-400 text-xs mt-2">{confirmError}</p>
                                )}
                            </div>

                            {/* Inline signup error */}
                            {signupError && (
                                <div className="text-red-400 text-sm">
                                    {signupError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
                            >
                                {isLoading ? 'Signing Up...' : 'Sign Up'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-6">
                            {/* Info */}
                            <p className="text-gray-300 text-sm">An OTP has been sent to {email}. Please enter it below.</p>
                            {/* Expiry + Resend */}
                            <div className="flex items-center justify-between text-xs text-gray-300">
                                <span>
                                    {remainingSecs > 0 ? (
                                        <>OTP expires in {Math.floor(remainingSecs / 60)}:{String(remainingSecs % 60).padStart(2, '0')}</>
                                    ) : (
                                        <>OTP expired. Please resend.</>
                                    )}
                                </span>
                                <div className="flex items-center space-x-2">
                                    {cooldownSecs > 0 ? (
                                        <span>Resend in {Math.floor(cooldownSecs / 60)}:{String(cooldownSecs % 60).padStart(2, '0')}</span>
                                    ) : (
                                        <span>Resends left: {Math.max(0, resendLimit - resendCount)}</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isLoading || resendCount >= resendLimit || cooldownSecs > 0}
                                        className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                                    >
                                        Resend OTP
                                    </button>
                                </div>
                            </div>
                            {/* OTP */}
                            <div>
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Enter OTP
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]{4,6}"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Enter the OTP sent to your email"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Inline verify error */}
                            {verifyError && (
                                <div className="text-red-400 text-sm">
                                    {verifyError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50"
                            >
                                {isLoading ? 'Verifying...' : 'Verify'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-300">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-purple-400 hover:text-purple-300 font-medium"
                            >
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
