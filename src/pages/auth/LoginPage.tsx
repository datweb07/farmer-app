// ============================================
// Login Page
// ============================================
// User login interface with validation and error handling
// Includes password reset functionality
// ============================================

import { useState, type FormEvent } from 'react';
import { LogIn, User, Lock, AlertCircle, Loader2, KeyRound, Phone, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignInData, validatePhoneNumber, validateResetCode, validatePassword } from '../../lib/auth/validation';
import { requestPasswordReset, resetPasswordWithCode } from '../../lib/auth/auth.service';

interface LoginPageProps {
    onNavigateToRegister: () => void;
}

type ResetStep = 'phone' | 'code' | 'password';

export function LoginPage({ onNavigateToRegister }: LoginPageProps) {
    const { signIn } = useAuth();

    // Login state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset password state
    const [showReset, setShowReset] = useState(false);
    const [resetStep, setResetStep] = useState<ResetStep>('phone');
    const [resetPhone, setResetPhone] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [devCode, setDevCode] = useState(''); // For development - shows the code

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate inputs
        const validationErrors = validateSignInData({ username, password });
        if (validationErrors.length > 0) {
            setError(validationErrors[0].message);
            return;
        }

        setLoading(true);

        try {
            const result = await signIn(username, password);

            if (!result.success) {
                setError(result.error || 'Đăng nhập thất bại');
            }
            // On success, AuthContext will update and ProtectedRoute will show app
        } catch (err) {
            setError('Đã xảy ra lỗi không mong muốn');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestReset = async (e: FormEvent) => {
        e.preventDefault();
        setResetError('');
        setResetSuccess('');

        const phoneError = validatePhoneNumber(resetPhone);
        if (phoneError) {
            setResetError(phoneError.message);
            return;
        }

        setResetLoading(true);

        try {
            const result = await requestPasswordReset(resetPhone);

            if (result.error) {
                setResetError(result.error.message);
            } else {
                setResetSuccess(result.data?.message || 'Mã xác nhận đã được gửi');
                if (result.data?.code) {
                    setDevCode(result.data.code);
                }
                setResetStep('code');
            }
        } catch (err) {
            setResetError('Đã xảy ra lỗi không mong muốn');
        } finally {
            setResetLoading(false);
        }
    };

    const handleVerifyCode = async (e: FormEvent) => {
        e.preventDefault();
        setResetError('');

        const codeError = validateResetCode(resetCode);
        if (codeError) {
            setResetError(codeError.message);
            return;
        }

        setResetStep('password');
    };

    const handleResetPassword = async (e: FormEvent) => {
        e.preventDefault();
        setResetError('');
        setResetSuccess('');

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setResetError(passwordError.message);
            return;
        }

        setResetLoading(true);

        try {
            const result = await resetPasswordWithCode(resetPhone, resetCode, newPassword);

            if (result.error) {
                setResetError(result.error.message);
            } else {
                setResetSuccess(result.data?.message || 'Đã đặt lại mật khẩu thành công');
                setTimeout(() => {
                    setShowReset(false);
                    setResetStep('phone');
                    setResetPhone('');
                    setResetCode('');
                    setNewPassword('');
                    setDevCode('');
                }, 2000);
            }
        } catch (err) {
            setResetError('Đã xảy ra lỗi không mong muốn');
        } finally {
            setResetLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setShowReset(false);
        setResetStep('phone');
        setResetPhone('');
        setResetCode('');
        setNewPassword('');
        setResetError('');
        setResetSuccess('');
        setDevCode('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-40 right-10 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Login/Reset Card */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/50">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mb-4 shadow-lg">
                            <span className="text-4xl">🌾</span>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                            {showReset ? 'Đặt lại mật khẩu' : 'Đăng nhập'}
                        </h1>
                        <p className="text-gray-600 mt-2">Nền tảng Nông nghiệp ĐBSCL</p>
                    </div>

                    {!showReset ? (
                        <>
                            {/* Error Alert */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Username Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tên đăng nhập
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                                            placeholder="Nhập tên đăng nhập"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mật khẩu
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                                            placeholder="Nhập mật khẩu"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Forgot Password Link */}
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => setShowReset(true)}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Đang đăng nhập...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-5 h-5" />
                                            Đăng nhập
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Register Link */}
                            <div className="mt-6 text-center">
                                <p className="text-gray-600">
                                    Chưa có tài khoản?{' '}
                                    <button
                                        onClick={onNavigateToRegister}
                                        className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                                    >
                                        Đăng ký ngay
                                    </button>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Back Button */}
                            <button
                                onClick={handleBackToLogin}
                                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Quay lại đăng nhập
                            </button>

                            {/* Success Alert */}
                            {resetSuccess && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-800">{resetSuccess}</p>
                                </div>
                            )}

                            {/* Error Alert */}
                            {resetError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{resetError}</p>
                                </div>
                            )}

                            {/* Dev Code Display */}
                            {devCode && (
                                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Mã xác nhận (Development):</strong> {devCode}
                                    </p>
                                </div>
                            )}

                            {/* Step 1: Phone Number */}
                            {resetStep === 'phone' && (
                                <form onSubmit={handleRequestReset} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Số điện thoại
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="tel"
                                                value={resetPhone}
                                                onChange={(e) => setResetPhone(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                                                placeholder="Nhập số điện thoại"
                                                disabled={resetLoading}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Nhập số điện thoại đã đăng ký
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {resetLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Đang gửi...
                                            </>
                                        ) : (
                                            <>
                                                <KeyRound className="w-5 h-5" />
                                                Gửi mã xác nhận
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Step 2: Verification Code */}
                            {resetStep === 'code' && (
                                <form onSubmit={handleVerifyCode} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mã xác nhận
                                        </label>
                                        <input
                                            type="text"
                                            value={resetCode}
                                            onChange={(e) => setResetCode(e.target.value)}
                                            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 text-center text-2xl tracking-widest"
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                        <p className="mt-2 text-xs text-gray-500 text-center">
                                            Nhập mã 6 chữ số đã gửi đến số điện thoại của bạn
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    >
                                        Xác nhận
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setResetStep('phone')}
                                        className="w-full text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    >
                                        Gửi lại mã
                                    </button>
                                </form>
                            )}

                            {/* Step 3: New Password */}
                            {resetStep === 'password' && (
                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu mới
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                                                placeholder="Nhập mật khẩu mới"
                                                disabled={resetLoading}
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Ít nhất 8 ký tự, bao gồm chữ cái và số
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {resetLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Đang cập nhật...
                                            </>
                                        ) : (
                                            <>
                                                <KeyRound className="w-5 h-5" />
                                                Đặt lại mật khẩu
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>© 2025 Nền tảng Nông nghiệp ĐBSCL</p>
                </div>
            </div>
        </div>
    );
}
