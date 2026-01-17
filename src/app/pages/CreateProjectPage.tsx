import { useState } from 'react';
import { ArrowLeft, Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { createProject } from '../../lib/investments/investments.service';
import { useAuth } from '../../contexts/AuthContext';

interface CreateProjectPageProps {
    onNavigate?: (page: string) => void;
}

export function CreateProjectPage({ onNavigate }: CreateProjectPageProps) {
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        funding_goal: '',
        farmers_impacted: '',
        area: '',
        start_date: '',
        end_date: '',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Kích thước ảnh không được vượt quá 5MB');
                return;
            }
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const formatNumber = (value: string) => {
        const number = value.replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const handleNumberInput = (field: 'funding_goal' | 'farmers_impacted', value: string) => {
        const number = value.replace(/\D/g, '');
        setFormData({ ...formData, [field]: number });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.title || !formData.description || !formData.funding_goal ||
            !formData.farmers_impacted || !formData.area) {
            setError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        if (parseInt(formData.funding_goal) <= 0) {
            setError('Mục tiêu vốn phải lớn hơn 0');
            return;
        }

        if (parseInt(formData.farmers_impacted) <= 0) {
            setError('Số nông dân hưởng lợi phải lớn hơn 0');
            return;
        }

        setSubmitting(true);

        const result = await createProject({
            title: formData.title,
            description: formData.description,
            funding_goal: parseInt(formData.funding_goal),
            farmers_impacted: parseInt(formData.farmers_impacted),
            area: formData.area,
            image: imageFile || undefined,
            start_date: formData.start_date || undefined,
            end_date: formData.end_date || undefined,
        });

        setSubmitting(false);

        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                onNavigate?.('invest');
            }, 2000);
        } else {
            setError(result.error || 'Không thể tạo dự án');
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Vui lòng đăng nhập
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Bạn cần đăng nhập để tạo dự án đầu tư
                    </p>
                    <button
                        onClick={() => onNavigate?.('invest')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md text-center">
                    <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Tạo dự án thành công!
                    </h2>
                    <p className="text-gray-600">
                        Dự án của bạn đang chờ phê duyệt. Chúng tôi sẽ liên hệ với bạn sớm nhất.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <button
                    onClick={() => onNavigate?.('invest')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại trang Đầu tư
                </button>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                        Tạo dự án đầu tư mới
                    </h1>
                    <p className="text-gray-600 mb-6">
                        Chia sẻ dự án của bạn với cộng đồng và kêu gọi đầu tư
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">
                                Tên dự án *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                placeholder="VD: Hệ thống cống ngăn mặn Cái Lớn - Cái Bé"
                                disabled={submitting}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">
                                Mô tả dự án *
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                                placeholder="Mô tả chi tiết về dự án, mục tiêu, tác động dự kiến..."
                                disabled={submitting}
                            />
                        </div>

                        {/* Funding Goal & Farmers Impacted */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Mục tiêu vốn (VNĐ) *
                                </label>
                                <input
                                    type="text"
                                    value={formatNumber(formData.funding_goal)}
                                    onChange={(e) => handleNumberInput('funding_goal', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                    placeholder="85.000.000.000"
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Số nông dân hưởng lợi *
                                </label>
                                <input
                                    type="text"
                                    value={formatNumber(formData.farmers_impacted)}
                                    onChange={(e) => handleNumberInput('farmers_impacted', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                    placeholder="15.000"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Area */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">
                                Khu vực triển khai *
                            </label>
                            <input
                                type="text"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                placeholder="VD: Vĩnh Long, Đồng Tháp"
                                disabled={submitting}
                            />
                        </div>

                        {/* Start & End Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Ngày bắt đầu
                                </label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-1">
                                    Ngày dự kiến hoàn thành
                                </label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">
                                Hình ảnh dự án
                            </label>
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                        disabled={submitting}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-48 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-gray-600">Nhấn để tải ảnh lên</span>
                                    <span className="text-sm text-gray-500 mt-1">Tối đa 5MB</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        disabled={submitting}
                                    />
                                </label>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => onNavigate?.('invest')}
                                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                disabled={submitting}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang tạo dự án...
                                    </>
                                ) : (
                                    'Tạo dự án'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}