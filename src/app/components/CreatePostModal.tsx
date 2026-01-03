import { useState, type FormEvent } from 'react';
import { X, Image, Loader2 } from 'lucide-react';
import { createPost } from '../../lib/community/posts.service';
import { validateImageFile } from '../../lib/community/image-upload';
import type { CreatePostData } from '../../lib/community/types';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
    const [formData, setFormData] = useState<Partial<CreatePostData>>({
        title: '',
        content: '',
        category: 'experience',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const categories = [
        { value: 'experience', label: 'Kinh nghiệm', emoji: '💡' },
        { value: 'salinity-solution', label: 'Giải pháp mặn', emoji: '💧' },
        { value: 'product', label: 'Sản phẩm', emoji: '🛒' },
    ];

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setImageFile(file);
        setError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.title?.trim()) {
            setError('Vui lòng nhập tiêu đề');
            return;
        }

        if (!formData.content?.trim()) {
            setError('Vui lòng nhập nội dung');
            return;
        }

        if (formData.category === 'product' && !formData.product_link?.trim()) {
            setError('Vui lòng nhập link sản phẩm cho bài viết sản phẩm');
            return;
        }

        setLoading(true);

        try {
            const result = await createPost({
                title: formData.title!,
                content: formData.content!,
                category: formData.category as 'experience' | 'salinity-solution' | 'product',
                image: imageFile || undefined,
                product_link: formData.product_link,
            });

            if (result.success) {
                // Reset form
                setFormData({ title: '', content: '', category: 'experience' });
                setImageFile(null);
                setImagePreview(null);
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Không thể tạo bài viết');
            }
        } catch (err) {
            setError('Đã xảy ra lỗi không mong muốn');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            ✍️ Đăng bài mới
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                            <p className="text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Chủ đề
                            </label>
                            <div className="flex gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, category: cat.value as any })}
                                        className={`flex-1 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${formData.category === cat.value
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <span className="text-xl">{cat.emoji}</span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Tiêu đề
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Nhập tiêu đề bài viết..."
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Nội dung
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Chia sẻ kinh nghiệm, giải pháp của bạn..."
                                rows={6}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                                required
                            />
                        </div>

                        {/* Product Link (only for product category) */}
                        {formData.category === 'product' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Link sản phẩm (tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    value={formData.product_link || ''}
                                    onChange={(e) => setFormData({ ...formData, product_link: e.target.value })}
                                    placeholder="ID sản phẩm liên quan..."
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        )}

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Hình ảnh (tùy chọn)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="max-h-64 mx-auto rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer">
                                        <Image className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                        <p className="text-gray-600 mb-1">
                                            Nhấn để chọn ảnh
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            JPG, PNG, GIF, WebP (tối đa 5MB)
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Points Info */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <p className="text-sm text-blue-800">
                                ⭐ <strong>Nhận +10 điểm</strong> khi đăng bài mới!
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
                                disabled={loading}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang đăng...
                                    </>
                                ) : (
                                    'Đăng bài'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
