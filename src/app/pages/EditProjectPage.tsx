import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, X, CheckCircle, Loader2 } from 'lucide-react';
import { updateProject, getProjectById } from '../../lib/investments/investments.service';
import { uploadImage } from '../../lib/community/image-upload';
import { useAuth } from '../../contexts/AuthContext';
import type { InvestmentProjectWithStats } from '../../lib/investments/types';

interface EditProjectPageProps {
    projectId: string;
    onNavigate?: (page: string) => void;
    onSuccess?: () => void;
}

export function EditProjectPage({ projectId, onNavigate, onSuccess }: EditProjectPageProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<InvestmentProjectWithStats | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        funding_goal: '',
        farmers_impacted: '',
        area: '',
        start_date: '',
        end_date: '',
        status: 'active' as 'pending' | 'active' | 'funded' | 'completed' | 'cancelled',
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        setLoading(true);
        const proj = await getProjectById(projectId);
        if (proj) {
            setProject(proj);
            setFormData({
                title: proj.title,
                description: proj.description,
                funding_goal: proj.funding_goal.toString(),
                farmers_impacted: proj.farmers_impacted.toString(),
                area: proj.area,
                start_date: proj.start_date || '',
                end_date: proj.end_date || '',
                status: proj.status,
            });
            setImagePreview(proj.image_url || null);
        }
        setLoading(false);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
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

        if (!formData.title || !formData.description || !formData.funding_goal ||
            !formData.farmers_impacted || !formData.area) {
            setError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        setSubmitting(true);

        // Upload new image if provided
        let imageUrl = project?.image_url;
        if (imageFile && user) {
            const { url, error: uploadError } = await uploadImage(imageFile, 'project-images', user.id);
            if (uploadError) {
                setError(uploadError);
                setSubmitting(false);
                return;
            }
            imageUrl = url || undefined;
        }

        const result = await updateProject(projectId, {
            title: formData.title,
            description: formData.description,
            funding_goal: parseInt(formData.funding_goal),
            farmers_impacted: parseInt(formData.farmers_impacted),
            area: formData.area,
            image_url: imageUrl,
            start_date: formData.start_date || undefined,
            end_date: formData.end_date || undefined,
            status: formData.status,
        });

        setSubmitting(false);

        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onNavigate?.('invest');
            }, 1500);
        } else {
            setError(result.error || 'Không thể cập nhật dự án');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!project || !user || project.user_id !== user.id) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Không có quyền truy cập
                    </h2>
                    <button
                        onClick={() => onNavigate?.('invest')}
                        className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-600"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Cập nhật thành công!
                    </h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <button
                    onClick={() => onNavigate?.('invest')}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 font-bold"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Quay lại trang Đầu tư
                </button>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Chỉnh sửa dự án
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Cập nhật thông tin dự án của bạn
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                Tên dự án *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                disabled={submitting}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                Mô tả dự án *
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={5}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none resize-none"
                                disabled={submitting}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">
                                    Mục tiêu vốn (VNĐ) *
                                </label>
                                <input
                                    type="text"
                                    value={formatNumber(formData.funding_goal)}
                                    onChange={(e) => handleNumberInput('funding_goal', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">
                                    Số nông dân hưởng lợi *
                                </label>
                                <input
                                    type="text"
                                    value={formatNumber(formData.farmers_impacted)}
                                    onChange={(e) => handleNumberInput('farmers_impacted', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                Khu vực triển khai *
                            </label>
                            <input
                                type="text"
                                value={formData.area}
                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                disabled={submitting}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">
                                    Ngày bắt đầu
                                </label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">
                                    Ngày dự kiến hoàn thành
                                </label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                Trạng thái dự án
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                                disabled={submitting}
                            >
                                <option value="pending">Chờ phê duyệt</option>
                                <option value="active">Đang kêu gọi</option>
                                <option value="funded">Đã đủ vốn</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="cancelled">Đã hủy</option>
                            </select>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">
                                Hình ảnh dự án
                            </label>
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-64 object-cover rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                        disabled={submitting}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                    <span className="text-gray-600">Nhấn để tải ảnh lên</span>
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

                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                                <p className="text-red-700 font-bold">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => onNavigate?.('invest')}
                                className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                                disabled={submitting}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    'Lưu thay đổi'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
