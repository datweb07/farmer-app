import { useState, type FormEvent } from 'react';
import { X, Image, Loader2 } from 'lucide-react';
import { createProduct } from '../../lib/community/products.service';
import { validateImageFile } from '../../lib/community/image-upload';
import type { CreateProductData } from '../../lib/community/types';

interface CreateProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateProductModal({ isOpen, onClose, onSuccess }: CreateProductModalProps) {
    const [formData, setFormData] = useState<Partial<CreateProductData>>({
        name: '',
        description: '',
        price: 0,
        category: 'Thiết bị đo',
        contact: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const categories = [
        { value: 'Thiết bị đo', emoji: '📊' },
        { value: 'Giống cây trồng', emoji: '🌾' },
        { value: 'Máy móc', emoji: '⚙️' },
        { value: 'Phân bón', emoji: '🧪' },
        { value: 'Vật tư', emoji: '🔧' },
        { value: 'Hệ thống tưới', emoji: '💦' },
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
        if (!formData.name?.trim()) {
            setError('Vui lòng nhập tên sản phẩm');
            return;
        }

        if (!formData.description?.trim()) {
            setError('Vui lòng nhập mô tả sản phẩm');
            return;
        }

        if (!formData.price || formData.price <= 0) {
            setError('Vui lòng nhập giá hợp lệ');
            return;
        }

        if (!formData.contact?.trim()) {
            setError('Vui lòng nhập số điện thoại liên hệ');
            return;
        }

        // Validate phone number format
        const phoneRegex = /^[0-9]{10,11}$/;
        const cleanPhone = formData.contact.replace(/\D/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            setError('Số điện thoại không hợp lệ (10-11 số)');
            return;
        }

        setLoading(true);

        try {
            const result = await createProduct({
                name: formData.name!,
                description: formData.description!,
                price: formData.price!,
                category: formData.category!,
                contact: cleanPhone,
                image: imageFile || undefined,
            });

            if (result.success) {
                // Reset form
                setFormData({
                    name: '',
                    description: '',
                    price: 0,
                    category: 'Thiết bị đo',
                    contact: '',
                });
                setImageFile(null);
                setImagePreview(null);
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Không thể tạo sản phẩm');
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
                            🛒 Đăng bán sản phẩm
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
                        {/* Product Name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Tên sản phẩm
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ví dụ: Máy đo độ mặn cầm tay"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Danh mục
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.emoji} {cat.value}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Giá bán (VND)
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                placeholder="450000"
                                min="0"
                                step="1000"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                                required
                            />
                            {formData.price && formData.price > 0 && (
                                <p className="mt-2 text-sm text-gray-600">
                                    ≈ {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                    }).format(formData.price)}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Mô tả sản phẩm
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả chi tiết sản phẩm, tính năng, chất lượng..."
                                rows={5}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                                required
                            />
                        </div>

                        {/* Contact */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Số điện thoại liên hệ (Zalo)
                            </label>
                            <input
                                type="tel"
                                value={formData.contact}
                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                placeholder="0912345678"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                📱 Khách hàng sẽ liên hệ qua Zalo với số này
                            </p>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Hình ảnh sản phẩm
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
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
                                            Nhấn để chọn ảnh sản phẩm
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

                        {/* Info Box */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                            <p className="text-sm text-green-800 mb-2">
                                <strong>✅ Lợi ích khi đăng bán:</strong>
                            </p>
                            <ul className="text-sm text-green-700 space-y-1">
                                <li>• Tiếp cận 48,500+ nông dân</li>
                                <li>• Không tính phí trung gian</li>
                                <li>• Tăng uy tín qua điểm đánh giá</li>
                            </ul>
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
                                className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Đang đăng...
                                    </>
                                ) : (
                                    'Đăng bán'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
