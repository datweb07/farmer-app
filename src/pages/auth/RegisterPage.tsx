import { useState, type FormEvent, useEffect } from 'react';
import { UserPlus, User, Lock, Phone, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    validateUsername,
    validatePassword,
    validatePhoneNumber,
    validateConfirmPassword,
    getPasswordStrength,
} from '../../lib/auth/validation';

interface RegisterPageProps {
    onNavigateToLogin: () => void;
}

export function RegisterPage({ onNavigateToLogin }: RegisterPageProps) {
    const { signUp } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [role, setRole] = useState<'farmer' | 'business'>('farmer');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;

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

    useEffect(() => {
        if (confirmPassword.length > 0) {
            const validationError = validateConfirmPassword(password, confirmPassword);
            if (validationError) {
                setFieldErrors((prev) => ({ ...prev, confirmPassword: validationError.message }));
            } else {
                setFieldErrors((prev) => {
                    const { confirmPassword, ...rest } = prev;
                    return rest;
                });
            }
        }
    }, [confirmPassword, password]);

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

        const usernameError = validateUsername(username);
        const passwordError = validatePassword(password);
        const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
        const phoneError = validatePhoneNumber(phoneNumber);

        const errors: Record<string, string> = {};
        if (usernameError) errors.username = usernameError.message;
        if (passwordError) errors.password = passwordError.message;
        if (confirmPasswordError) errors.confirmPassword = confirmPasswordError.message;
        if (phoneError) errors.phoneNumber = phoneError.message;

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Vui lòng kiểm tra lại thông tin');
            return;
        }

        setLoading(true);

        try {
            const result = await signUp(username, password, phoneNumber, role);

            if (!result.success) {
                setError(result.error || 'Đăng ký thất bại');
            }
        } catch (err) {
            setError('Đã xảy ra lỗi không mong muốn');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-emerald-50">
            <div className="w-full max-w-md px-4">
                {/* Register Card */}
                <div className="bg-white rounded-xl shadow-md border border-green-100 p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">
                            Đăng ký tài khoản
                        </h1>
                        <p className="text-green-700 text-sm mt-1 font-medium">
                            Tham gia cộng đồng nông nghiệp ĐBSCL
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tên đăng nhập <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-green-600" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onBlur={handleUsernameBlur}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${fieldErrors.username ? 'border-red-300' : 'border-green-200'
                                        }`}
                                    placeholder="3-20 ký tự, chỉ chữ cái, số và _"
                                    disabled={loading}
                                />
                            </div>
                            {fieldErrors.username && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
                            )}
                        </div>

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Loại tài khoản <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('farmer')}
                                    className={`p-3 border-2 rounded-lg transition-all ${role === 'farmer'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-green-300'
                                        }`}
                                    disabled={loading}
                                >
                                    <div className="font-medium text-gray-900">Nông dân</div>
                                    <div className="text-xs text-gray-600 mt-1">Truy cập đầy đủ tính năng</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('business')}
                                    className={`p-3 border-2 rounded-lg transition-all ${role === 'business'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-green-300'
                                        }`}
                                    disabled={loading}
                                >
                                    <div className="font-medium text-gray-900">Doanh nghiệp</div>
                                    <div className="text-xs text-gray-600 mt-1">Tập trung đầu tư</div>
                                </button>
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-green-600" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${fieldErrors.password ? 'border-red-300' : 'border-green-200'
                                        }`}
                                    placeholder="Ít nhất 8 ký tự, có chữ và số"
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
                            {fieldErrors.password && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                            )}
                            {/* Password Strength Indicator */}
                            {passwordStrength && !fieldErrors.password && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${passwordStrength.level === 'weak'
                                                    ? 'bg-red-500 w-1/3'
                                                    : passwordStrength.level === 'medium'
                                                        ? 'bg-amber-500 w-2/3'
                                                        : 'bg-green-500 w-full'
                                                    }`}
                                            />
                                        </div>
                                        <span
                                            className={`text-xs font-medium ${passwordStrength.level === 'weak'
                                                ? 'text-red-600'
                                                : passwordStrength.level === 'medium'
                                                    ? 'text-amber-600'
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
                                    <p className="text-xs text-green-700">
                                        Gợi ý: Sử dụng chữ hoa, số và ký tự đặc biệt để tăng độ mạnh
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Xác nhận mật khẩu <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-green-600" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${fieldErrors.confirmPassword ? 'border-red-300' : 'border-green-200'
                                        }`}
                                    placeholder="Nhập lại mật khẩu"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-600 hover:text-green-700"
                                    disabled={loading}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                            )}
                            {!fieldErrors.confirmPassword && confirmPassword.length > 0 && password === confirmPassword && (
                                <div className="mt-1 flex items-center gap-1 text-sm text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Mật khẩu khớp
                                </div>
                            )}
                        </div>

                        {/* Phone Number Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Số điện thoại <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-green-600" />
                                </div>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    onBlur={handlePhoneBlur}
                                    className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${fieldErrors.phoneNumber ? 'border-red-300' : 'border-green-200'
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
                                    <CheckCircle className="w-3 h-3" />
                                    Số điện thoại hợp lệ
                                </div>
                            )}
                            {!fieldErrors.phoneNumber && phoneNumber.length === 0 && (
                                <p className="mt-1 text-xs text-green-700">
                                    Số điện thoại dùng để khôi phục mật khẩu
                                </p>
                            )}
                        </div>

                        {/* Terms and Conditions */}
                        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <input
                                type="checkbox"
                                id="terms"
                                required
                                className="mt-0.5 w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                                disabled={loading}
                            />
                            <label htmlFor="terms" className="text-xs text-gray-700">
                                Tôi đồng ý với{' '}
                                <a href="#" className="text-green-700 font-medium hover:underline">
                                    Điều khoản dịch vụ
                                </a>{' '}
                                và{' '}
                                <a href="#" className="text-green-700 font-medium hover:underline">
                                    Chính sách bảo mật
                                </a>{' '}
                                của nền tảng
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || Object.keys(fieldErrors).length > 0}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Đăng ký
                                </>
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-6 text-center pt-4 border-t border-green-100">
                        <p className="text-gray-600 text-sm">
                            Đã có tài khoản?{' '}
                            <button
                                onClick={onNavigateToLogin}
                                className="text-green-700 font-semibold hover:text-green-800 hover:underline"
                            >
                                Đăng nhập ngay
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-green-800">
                    <p>© 2025 Nền tảng Nông nghiệp ĐBSCL</p>
                </div>
            </div>
        </div>
    );
}