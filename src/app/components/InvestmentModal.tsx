import { useState } from 'react';
import { TrendingUp, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import { investInProject } from '../../lib/investments/investments.service';
import type { InvestmentProjectWithStats } from '../../lib/investments/types';

interface InvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: InvestmentProjectWithStats;
    onSuccess?: () => void;
}

export function InvestmentModal({ isOpen, onClose, project, onSuccess }: InvestmentModalProps) {
    const [amount, setAmount] = useState('');
    const [investorName, setInvestorName] = useState('');
    const [investorEmail, setInvestorEmail] = useState('');
    const [investorPhone, setInvestorPhone] = useState('');
    const [message, setMessage] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatNumber = (value: string) => {
        const number = value.replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setAmount(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!amount || parseInt(amount) <= 0) {
            setError('Vui lòng nhập số tiền đầu tư');
            return;
        }

        if (!investorName || !investorEmail) {
            setError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (!acceptTerms) {
            setError('Vui lòng đồng ý với điều khoản');
            return;
        }

        setSubmitting(true);

        const result = await investInProject({
            project_id: project.id,
            amount: parseInt(amount),
            investor_name: investorName,
            investor_email: investorEmail,
            investor_phone: investorPhone,
            message: message,
        });

        setSubmitting(false);

        if (result.success) {
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                onSuccess?.();
                onClose();
                // Reset form
                setAmount('');
                setInvestorName('');
                setInvestorEmail('');
                setInvestorPhone('');
                setMessage('');
                setAcceptTerms(false);
            }, 2000);
        } else {
            setError(result.error || 'Không thể thực hiện đầu tư');
        }
    };

    const handleClose = () => {
        if (!submitting) {
            onClose();
        }
    };

    if (showSuccess) {
        return (
            <Modal isOpen={isOpen} onClose={handleClose} title="Thành công!" maxWidth="md">
                <div className="text-center py-8">
                    <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Đầu tư thành công!
                    </h3>
                    <p className="text-gray-600">
                        Cảm ơn bạn đã đầu tư vào dự án "{project.title}".
                        Chúng tôi sẽ liên hệ với bạn sớm nhất.
                    </p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Tham gia đầu tư" maxWidth="xl">
            {/* Project Info */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-xl text-gray-900 mb-2">{project.title}</h3>
                <p className="text-gray-700 mb-4">{project.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Mục tiêu: </span>
                        <span className="font-bold text-purple-600">
                            {(project.funding_goal / 1_000_000_000).toFixed(1)} tỷ VNĐ
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Đã huy động: </span>
                        <span className="font-bold text-green-600">
                            {project.progress_percentage.toFixed(0)}%
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Investment Amount */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2">
                        Số tiền đầu tư *
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={formatNumber(amount)}
                            onChange={handleAmountChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-lg font-bold"
                            placeholder="10.000.000"
                            disabled={submitting}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                            VNĐ
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Nhập số tiền bạn muốn đầu tư vào dự án này
                    </p>
                </div>

                {/* Investor Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">
                            Họ và tên *
                        </label>
                        <input
                            type="text"
                            value={investorName}
                            onChange={(e) => setInvestorName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                            placeholder="Nguyễn Văn A"
                            disabled={submitting}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={investorEmail}
                            onChange={(e) => setInvestorEmail(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                            placeholder="email@example.com"
                            disabled={submitting}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 font-bold mb-2">
                        Số điện thoại
                    </label>
                    <input
                        type="tel"
                        value={investorPhone}
                        onChange={(e) => setInvestorPhone(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                        placeholder="0912345678"
                        disabled={submitting}
                    />
                </div>

                <div>
                    <label className="block text-gray-700 font-bold mb-2">
                        Lời nhắn (không bắt buộc)
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                        placeholder="Chia sẻ suy nghĩ của bạn về dự án..."
                        disabled={submitting}
                    />
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
                    <input
                        type="checkbox"
                        id="terms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        disabled={submitting}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700">
                        Tôi đồng ý với <a href="#" className="text-purple-600 font-bold hover:underline">Điều khoản đầu tư</a> và hiểu rằng đây là cam kết đầu tư. Đội ngũ dự án sẽ liên hệ với tôi để hoàn tất thủ tục.
                    </label>
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
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Đang xử lý...
                        </>
                    ) : (
                        <>
                            <TrendingUp className="w-6 h-6" />
                            Xác nhận đầu tư
                        </>
                    )}
                </button>
            </form>
        </Modal>
    );
}
