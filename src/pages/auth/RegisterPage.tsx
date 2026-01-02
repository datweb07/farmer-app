// ============================================
// Register Page
// ============================================
// User registration interface with real-time validation
// ============================================

import { useState, type FormEvent, useEffect } from 'react';
import { UserPlus, User, Lock, Phone, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    validateUsername,
    validatePassword,
    validatePhoneNumber,
    getPasswordStrength,
} from '../../lib/auth/validation';

interface RegisterPageProps {
    onNavigateToLogin: () => void;
}

export function RegisterPage({ onNavigateToLogin }: RegisterPageProps) {
    const { signUp } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Real-time password strength
    const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;

    // Validate username on blur
    const handleUsernameBlur = () => {
        const validationError = validateUsername(username);
        if (validationError) {
            setFieldErrors((prev) => ({ ...prev, username: validationError.message }));
        } else {
            setFieldErrors((prev) => {
                const { username, ...rest } = prev;
                return rest;
            });
        }
    };

    // Validate password on change
    useEffect(() => {
        if (password.length > 0) {
            const validationError = validatePassword(password);
            if (validationError) {
                setFieldErrors((prev) => ({ ...prev, password: validationError.message }));
            } else {
                setFieldErrors((prev) => {
                    const { password, ...rest } = prev;
                    return rest;
                });
            }
        }
    }, [password]);

    // Validate phone on blur
    const handlePhoneBlur = () => {
        const validationError = validatePhoneNumber(phoneNumber);
        if (validationError) {
            setFieldErrors((prev) => ({ ...prev, phoneNumber: validationError.message }));
        } else {
            setFieldErrors((prev) => {
                const { phoneNumber, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate all fields
        const usernameError = validateUsername(username);
        const passwordError = validatePassword(password);
        const phoneError = validatePhoneNumber(phoneNumber);

        const errors: Record<string, string> = {};
        if (usernameError) errors.username = usernameError.message;
        if (passwordError) errors.password = passwordError.message;
        if (phoneError) errors.phoneNumber = phoneError.message;

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Vui lòng kiểm tra lại thông tin');
            return;
        }

        setLoading(true);

        try {
            const result = await signUp(username, password, phoneNumber);

            if (!result.success) {
                setError(result.error || 'Đăng ký thất bại');
            }
            // On success, AuthContext will update and user will be auto-logged in
        } catch (err) {
            setError('Đã xảy ra lỗi không mong muốn');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-green-50 relative overflow-hidden py-8">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-40 right-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Register Card */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/50">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-4 shadow-lg">
                            <span className="text-4xl">🌾</span>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                            Đăng ký tài khoản
                        </h1>
                        <p className="text-gray-600 mt-2">Tham gia cộng đồng nông dân ngày hôm nay</p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tên đăng nhập <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onBlur={handleUsernameBlur}
                                    className={`block w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 ${fieldErrors.username ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="3-20 ký tự, chỉ chữ cái, số và _"
                                    disabled={loading}
                                />
                            </div>
                            {fieldErrors.username && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`block w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 ${fieldErrors.password ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="Ít nhất 8 ký tự, có chữ và số"
                                    disabled={loading}
                                />
                            </div>
                            {fieldErrors.password && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                            )}
                            {/* Password Strength Indicator */}
                            {passwordStrength && !fieldErrors.password && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${passwordStrength.level === 'weak'
                                                    ? 'bg-red-500 w-1/3'
                                                    : passwordStrength.level === 'medium'
                                                        ? 'bg-yellow-500 w-2/3'
                                                        : 'bg-green-500 w-full'
                                                    }`}
                                            />
                                        </div>
                                        <span
                                            className={`text-xs font-medium ${passwordStrength.level === 'weak'
                                                ? 'text-red-600'
                                                : passwordStrength.level === 'medium'
                                                    ? 'text-yellow-600'
                                                    : 'text-green-600'
                                                }`}
                                        >
                                            {passwordStrength.level === 'weak'
                                                ? 'Yếu'
                                                : passwordStrength.level === 'medium'
                                                    ? 'Trung bình'
                                                    : 'Mạnh'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Phone Number Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Số điện thoại <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    onBlur={handlePhoneBlur}
                                    className={`block w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/50 ${fieldErrors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="VD: 0912345678"
                                    disabled={loading}
                                />
                            </div>
                            {fieldErrors.phoneNumber && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.phoneNumber}</p>
                            )}
                            {!fieldErrors.phoneNumber && phoneNumber.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-sm text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    Số điện thoại hợp lệ
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || Object.keys(fieldErrors).length > 0}
                            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Đăng ký
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Đã có tài khoản?{' '}
                            <button
                                onClick={onNavigateToLogin}
                                className="text-green-600 font-semibold hover:text-green-700 transition-colors"
                            >
                                Đăng nhập ngay
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>© 2025 Nền tảng Nông nghiệp ĐBSCL</p>
                </div>
            </div>
        </div>
    );
}
