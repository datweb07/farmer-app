import { useState } from 'react';
import { Target, Users, MapPin, TrendingUp, Edit, Trash2, UserCheck } from 'lucide-react';
import type { InvestmentProjectWithStats } from '../../lib/investments/types';
import { InvestmentModal } from './InvestmentModal';
import { InvestorsListModal } from './InvestorsListModal';
import { deleteProject } from '../../lib/investments/investments.service';
import { useAuth } from '../../contexts/AuthContext';

interface InvestmentProjectCardProps {
  project: InvestmentProjectWithStats;
  onUpdate?: () => void;
  onEdit?: (projectId: string) => void;
}

export function InvestmentProjectCard({ project, onUpdate, onEdit }: InvestmentProjectCardProps) {
  const { user } = useAuth();
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showInvestorsList, setShowInvestorsList] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatMoney = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} tỷ VNĐ`;
    }
    return `${(amount / 1000000).toFixed(0)} triệu VNĐ`;
  };

  const progress = project.progress_percentage || 0;

  const getStatusBadge = () => {
    switch (project.status) {
      case 'active':
        return { text: 'Đang kêu gọi', color: 'bg-green-100 text-green-700' };
      case 'funded':
        return { text: 'Đã đủ vốn', color: 'bg-blue-100 text-blue-700' };
      case 'pending':
        return { text: 'Chờ phê duyệt', color: 'bg-yellow-100 text-yellow-700' };
      case 'completed':
        return { text: 'Hoàn thành', color: 'bg-purple-100 text-purple-700' };
      case 'cancelled':
        return { text: 'Đã hủy', color: 'bg-red-100 text-red-700' };
    }
  };

  const statusBadge = getStatusBadge();
  const isOwner = user?.id === project.user_id;

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa dự án này?')) return;

    setDeleting(true);
    const result = await deleteProject(project.id);
    setDeleting(false);

    if (result.success) {
      alert('Đã xóa dự án thành công');
      onUpdate?.();
    } else {
      alert(result.error || 'Không thể xóa dự án');
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-xl flex-1">{project.title}</h3>
            <span className={`${statusBadge.color} px-3 py-1 rounded-full text-sm font-bold`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="text-white/90 leading-relaxed">{project.description}</p>
          {project.creator_username && (
            <p className="text-white/80 text-sm mt-2">
              Bởi: <span className="font-bold">{project.creator_username}</span>
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Nông dân hưởng lợi</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {project.farmers_impacted.toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-sm font-medium">Khu vực</span>
              </div>
              <p className="text-lg font-bold text-green-700">{project.area}</p>
            </div>
          </div>

          {/* Funding Progress */}
          <div className="bg-gray-50 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-gray-700">Tiến độ gọi vốn</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">{progress.toFixed(0)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-4 mb-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Đã huy động: <span className="font-bold text-green-600">{formatMoney(project.current_funding)}</span>
              </span>
              <span className="text-gray-600">
                Mục tiêu: <span className="font-bold text-blue-600">{formatMoney(project.funding_goal)}</span>
              </span>
            </div>

            {project.investors_count > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {project.investors_count} nhà đầu tư đã tham gia
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {isOwner ? (
            <div className="space-y-3">
              {/* Investors List Button */}
              <button
                onClick={() => setShowInvestorsList(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"
              >
                <UserCheck className="w-5 h-5" />
                Xem danh sách nhà đầu tư ({project.investors_count})
              </button>

              {/* Edit and Delete Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onEdit?.(project.id)}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  disabled={deleting}
                >
                  <Edit className="w-5 h-5" />
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-100 text-red-700 px-6 py-3 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {project.status === 'active' && (
                <button
                  onClick={() => setShowInvestModal(true)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg"
                >
                  <TrendingUp className="w-6 h-6" />
                  Tham gia đầu tư
                </button>
              )}

              {project.status === 'funded' && (
                <div className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-4 rounded-xl font-bold text-center">
                  ✓ Dự án đã hoàn thành gọi vốn
                </div>
              )}

              {project.status === 'pending' && (
                <div className="w-full bg-yellow-100 text-yellow-700 px-6 py-4 rounded-xl font-bold text-center">
                  ⏳ Dự án đang chờ phê duyệt
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
        project={project}
        onSuccess={() => {
          onUpdate?.();
        }}
      />

      {/* Investors List Modal */}
      <InvestorsListModal
        isOpen={showInvestorsList}
        onClose={() => setShowInvestorsList(false)}
        projectId={project.id}
        projectTitle={project.title}
      />
    </>
  );
}
