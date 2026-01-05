import { useState, useEffect } from 'react';
import { Users, Mail, Phone, Calendar } from 'lucide-react';
import { Modal } from './Modal';
import { getProjectInvestments } from '../../lib/investments/investments.service';
import type { ProjectInvestment } from '../../lib/investments/types';

interface InvestorsListModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectTitle: string;
}

export function InvestorsListModal({ isOpen, onClose, projectId, projectTitle }: InvestorsListModalProps) {
    const [investments, setInvestments] = useState<ProjectInvestment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadInvestments();
        }
    }, [isOpen, projectId]);

    const loadInvestments = async () => {
        setLoading(true);
        const result = await getProjectInvestments(projectId);
        if (!result.error) {
            setInvestments(result.investments);
        }
        setLoading(false);
    };

    const formatMoney = (amount: number) => {
        if (amount >= 1000000000) {
            return `${(amount / 1000000000).toFixed(1)} tỷ VNĐ`;
        }
        return `${(amount / 1000000).toFixed(0)} triệu VNĐ`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Danh sách nhà đầu tư" maxWidth="2xl">
            <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">{projectTitle}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <p>
                        Số nhà đầu tư: <span className="font-medium text-blue-600">{investments.length}</span>
                    </p>
                    <p>
                        Tổng vốn: <span className="font-medium text-blue-600">{formatMoney(totalInvestment)}</span>
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : investments.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {investments.map((investment) => (
                        <div
                            key={investment.id}
                            className="bg-white border border-gray-200 rounded-lg p-3"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-medium text-gray-900">
                                            {investment.investor_name}
                                        </h4>
                                    </div>
                                    <p className="text-lg font-semibold text-blue-600">
                                        {formatMoney(investment.amount)}
                                    </p>
                                </div>
                                <div className={`px-2 py-0.5 rounded text-xs font-medium ${investment.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    investment.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {investment.status === 'confirmed' ? 'Đã xác nhận' :
                                        investment.status === 'pending' ? 'Chờ xác nhận' :
                                            'Đã hủy'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-1 text-sm">
                                <div className="flex items-center gap-1 text-gray-700">
                                    <Mail className="w-3 h-3 text-gray-500" />
                                    <a href={`mailto:${investment.investor_email}`} className="text-sm hover:text-blue-600">
                                        {investment.investor_email}
                                    </a>
                                </div>
                                {investment.investor_phone && (
                                    <div className="flex items-center gap-1 text-gray-700">
                                        <Phone className="w-3 h-3 text-gray-500" />
                                        <a href={`tel:${investment.investor_phone}`} className="text-sm hover:text-blue-600">
                                            {investment.investor_phone}
                                        </a>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-gray-600">
                                    <Calendar className="w-3 h-3 text-gray-500" />
                                    <span className="text-xs">Ngày: {formatDate(investment.created_at)}</span>
                                </div>
                            </div>

                            {investment.message && (
                                <div className="mt-2 bg-gray-50 rounded p-2">
                                    <p className="text-xs text-gray-600">
                                        "{investment.message}"
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Chưa có nhà đầu tư nào</p>
                </div>
            )}

            <div className="mt-4 flex justify-end">
                <button
                    onClick={onClose}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                    Đóng
                </button>
            </div>
        </Modal>
    );
}