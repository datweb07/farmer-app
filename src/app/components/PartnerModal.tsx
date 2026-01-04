import { useState } from 'react';
import { TrendingUp, Building2, Award, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import { submitContactRequest } from '../../lib/contact/contact.service';
import type { ContactRequest } from '../../lib/investments/types';

interface PartnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'investor' | 'business' | 'research';
}

export function PartnerModal({ isOpen, onClose, type }: PartnerModalProps) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        message: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const content = {
        investor: {
            icon: TrendingUp,
            title: 'Dành cho Nhà đầu tư',
            color: 'blue',
            benefits: [
                'Báo cáo minh bạch hàng tháng về tiến độ dự án',
                'Giám sát trực tuyến 24/7 qua dashboard',
                'Ưu đãi thuế cho đầu tư vào nông nghiệp',
                'Tác động xã hội tích cực, hỗ trợ nông dân ĐBSCL',
                'ROI hấp dẫn với mức tăng trưởng bền vững',
            ],
        },
        business: {
            icon: Building2,
            title: 'Dành cho Doanh nghiệp',
            color: 'green',
            benefits: [
                'Nguồn nguyên liệu ổn định, chất lượng cao',
                'Kết nối trực tiếp với 48,500+ nông dân',
                'Hỗ trợ chuyển đổi số trong nông nghiệp',
                'Xây dựng chuỗi giá trị bền vững',
                'Nâng cao thương hiệu với trách nhiệm xã hội',
            ],
        },
        research: {
            icon: Award,
            title: 'Dành cho Tổ chức Khoa học - Kỹ thuật',
            color: 'purple',
            benefits: [
                'Dữ liệu thực tế từ 125,000 ha đất canh tác',
                'Cộng đồng nông dân sẵn sàng thử nghiệm',
                'Hỗ trợ chuyển giao công nghệ đến nông dân',
                'Phòng thí nghiệm thực địa quy mô lớn',
                'Tác động trực tiếp đến cuộc sống nông dân',
            ],
        },
    };

    const config = content[type];
    const Icon = config.icon;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.fullName || !formData.email || !formData.phone || !formData.message) {
            setError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        setSubmitting(true);

        const requestData: ContactRequest = {
            full_name: formData.fullName,
            email: formData.email,
            phone_number: formData.phone,
            partnership_type: type,
            message: formData.message,
        };

        const result = await submitContactRequest(requestData);
        setSubmitting(false);

        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
                // Reset form
                setFormData({
                    fullName: '',
                    email: '',
                    phone: '',
                    message: '',
                });
            }, 2000);
        } else {
            setError(result.error || 'Không thể gửi yêu cầu');
        }
    };

    if (showSuccess) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Thành công!" maxWidth="md">
                <div className="text-center py-8">
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Đã gửi yêu cầu!
                    </h3>
                    <p className="text-gray-600">
                        Cảm ơn bạn đã quan tâm. Chúng tôi sẽ liên hệ với bạn trong vòng 24 giờ.
                    </p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={config.title} maxWidth="xl">
            {/* Header */}
            <div className={`bg-gradient-to-r from-${config.color}-50 to-${config.color}-100 rounded-xl p-6 mb-6`}>
                <div className={`bg-${config.color}-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-8 h-8 text-${config.color}-600`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Tại sao hợp tác với chúng tôi?
                </h3>
                <ul className="space-y-3">
                    {config.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <span className={`text-${config.color}-500 mt-1`}>✓</span>
                            <span className="text-gray-700">{benefit}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="font-bold text-lg text-gray-900">
                    Để lại thông tin liên hệ
                </h4>

                <div>
                    <label className="block text-gray-700 font-bold mb-2">
                        Họ và tên *
                    </label>
                    <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        placeholder="Nguyễn Văn A"
                        disabled={submitting}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="email@example.com"
                            disabled={submitting}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">
                            Số điện thoại *
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="0912345678"
                            disabled={submitting}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 font-bold mb-2">
                        Nội dung *
                    </label>
                    <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="Mô tả ý tưởng hợp tác của bạn..."
                        disabled={submitting}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <p className="text-red-700 font-bold">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full bg-gradient-to-r from-${config.color}-500 to-${config.color}-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                    {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Đang gửi...
                        </div>
                    ) : (
                        'Gửi yêu cầu hợp tác'
                    )}
                </button>
            </form>
        </Modal>
    );
}
