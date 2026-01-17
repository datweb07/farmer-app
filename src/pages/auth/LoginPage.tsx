import { useState, type FormEvent } from 'react';
import { LogIn, User, Lock, AlertCircle, Loader2, KeyRound, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateSignInData, validatePhoneNumber, validateResetCode, validatePassword } from '../../lib/auth/validation';
import { requestPasswordReset, resetPasswordWithCode } from '../../lib/auth/auth.service';

interface LoginPageProps {
    onNavigateToRegister: () => void;
}

type ResetStep = 'phone' | 'code' | 'password';

export function LoginPage({ onNavigateToRegister }: LoginPageProps) {
    const { signIn } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [showReset, setShowReset] = useState(false);
    const [resetStep, setResetStep] = useState<ResetStep>('phone');
    const [resetPhone, setResetPhone] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [devCode, setDevCode] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-emerald-50">
            <div className="w-full max-w-md px-4">
                {/* Login/Reset Card */}
                <div className="bg-white rounded-xl shadow-md border border-green-100 p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        {/* <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4 shadow-sm">
                            <span className="text-2xl text-white">🌾</span>
                        </div> */}
                        <h1 className="text-2xl font-bold text-gray-800">
                            {showReset ? 'Đặt lại mật khẩu' : 'Đăng nhập'}
                        </h1>
                        <p className="text-green-700 text-sm mt-1 font-medium">
                            Nền tảng Nông nghiệp ĐBSCL - Nông dân & Doanh nghiệp
                        </p>
                    </div>

                    {!showReset ? (
                        <>
                            {/* Error Alert */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Username Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên đăng nhập
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-green-600" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                            placeholder="Nhập tên đăng nhập"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mật khẩu
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-green-600" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-10 pr-10 py-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                            placeholder="Nhập mật khẩu"
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-600 hover:text-green-700"
                                            disabled={loading}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Forgot Password Link */}
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => setShowReset(true)}
                                        className="text-sm text-green-700 hover:text-green-800 font-medium"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Đang đăng nhập...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn className="w-4 h-4" />
                                            Đăng nhập
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Register Link */}
                            <div className="mt-6 text-center pt-4 border-t border-green-100">
                                <p className="text-gray-600 text-sm">
                                    Chưa có tài khoản?{' '}
                                    <button
                                        onClick={onNavigateToRegister}
                                        className="text-green-700 font-semibold hover:text-green-800 hover:underline"
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
                                className="mb-5 flex items-center gap-2 text-green-700 hover:text-green-800 font-medium text-sm"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                Quay lại đăng nhập
                            </button>

                            {/* Success Alert */}
                            {resetSuccess && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-800">{resetSuccess}</p>
                                </div>
                            )}

                            {/* Error Alert */}
                            {resetError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{resetError}</p>
                                </div>
                            )}

                            {/* Dev Code Display */}
                            {devCode && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800">
                                        <span className="font-medium">Mã xác nhận (Development):</span> {devCode}
                                    </p>
                                </div>
                            )}

                            {/* Step 1: Phone Number */}
                            {resetStep === 'phone' && (
                                <form onSubmit={handleRequestReset} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Số điện thoại
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-4 w-4 text-green-600" />
                                            </div>
                                            <input
                                                type="tel"
                                                value={resetPhone}
                                                onChange={(e) => setResetPhone(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                placeholder="Nhập số điện thoại"
                                                disabled={resetLoading}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-green-700">
                                            Nhập số điện thoại đã đăng ký
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {resetLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang gửi...
                                            </>
                                        ) : (
                                            <>
                                                <KeyRound className="w-4 h-4" />
                                                Gửi mã xác nhận
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Step 2: Verification Code */}
                            {resetStep === 'code' && (
                                <form onSubmit={handleVerifyCode} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mã xác nhận
                                        </label>
                                        <input
                                            type="text"
                                            value={resetCode}
                                            onChange={(e) => setResetCode(e.target.value)}
                                            className="block w-full px-4 py-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50/50 text-center text-xl tracking-widest"
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                        <p className="mt-1 text-xs text-green-700 text-center">
                                            Nhập mã 6 chữ số đã gửi đến số điện thoại của bạn
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <button
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow"
                                        >
                                            Xác nhận
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setResetStep('phone')}
                                            className="w-full text-green-700 hover:text-green-800 font-medium text-sm"
                                        >
                                            Gửi lại mã
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Step 3: New Password */}
                            {resetStep === 'password' && (
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mật khẩu mới
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-4 w-4 text-green-600" />
                                            </div>
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="block w-full pl-10 pr-10 py-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50/50 transition-colors"
                                                placeholder="Nhập mật khẩu mới"
                                                disabled={resetLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-600 hover:text-green-700"
                                                disabled={resetLoading}
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-green-700">
                                            Ít nhất 8 ký tự, bao gồm chữ cái và số
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {resetLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang cập nhật...
                                            </>
                                        ) : (
                                            <>
                                                <KeyRound className="w-4 h-4" />
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
                <div className="mt-6 text-center text-xs text-green-800">
                    <p>© 2025 Nền tảng Nông nghiệp ĐBSCL</p>
                </div>
            </div>
        </div>
    );
}