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
                <h3 className="font-bold text-lg text-gray-900 mb-1">{projectTitle}</h3>
                <p className="text-gray-600">
                    Tổng số nhà đầu tư: <span className="font-bold text-indigo-600">{investments.length}</span>
                </p>
                <p className="text-gray-600">
                    Tổng vốn đã huy động: <span className="font-bold text-green-600">{formatMoney(totalInvestment)}</span>
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : investments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {investments.map((investment) => (
                        <div
                            key={investment.id}
                            className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-100"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                        {investment.investor_name}
                                    </h4>
                                    <p className="text-2xl font-bold text-green-600 mt-1">
                                        {formatMoney(investment.amount)}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${investment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    investment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {investment.status === 'confirmed' ? '✓ Đã xác nhận' :
                                        investment.status === 'pending' ? '⏳ Chờ xác nhận' :
                                            investment.status === 'completed' ? '🎉 Hoàn thành' : 'Đã hủy'}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                    <a href={`mailto:${investment.investor_email}`} className="hover:text-blue-600 font-medium">
                                        {investment.investor_email}
                                    </a>
                                </div>
                                {investment.investor_phone && (
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Phone className="w-4 h-4 text-green-600" />
                                        <a href={`tel:${investment.investor_phone}`} className="hover:text-green-600 font-medium">
                                            {investment.investor_phone}
                                        </a>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    <span>Ngày đầu tư: {formatDate(investment.created_at)}</span>
                                </div>
                            </div>

                            {investment.message && (
                                <div className="mt-3 bg-white/50 rounded-lg p-3">
                                    <p className="text-sm text-gray-700 italic">
                                        💬 "{investment.message}"
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Chưa có nhà đầu tư nào</p>
                </div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    onClick={onClose}
                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                >
                    Đóng
                </button>
            </div>
        </Modal>
    );
}
