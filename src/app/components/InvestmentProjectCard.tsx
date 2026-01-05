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
        return { text: 'Đang kêu gọi', color: 'bg-blue-100 text-blue-700' };
      case 'funded':
        return { text: 'Đã đủ vốn', color: 'bg-blue-100 text-blue-700' };
      case 'pending':
        return { text: 'Chờ phê duyệt', color: 'bg-blue-100 text-blue-700' };
      case 'completed':
        return { text: 'Hoàn thành', color: 'bg-blue-100 text-blue-700' };
      case 'cancelled':
        return { text: 'Đã hủy', color: 'bg-blue-100 text-blue-700' };
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
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-4 text-white">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg flex-1">{project.title}</h3>
            <span className={`${statusBadge.color} px-2 py-1 rounded text-xs font-medium`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="text-white/90 text-sm line-clamp-2">{project.description}</p>
          {project.creator_username && (
            <p className="text-white/80 text-xs mt-2">
              Bởi: <span className="font-medium">{project.creator_username}</span>
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1 text-blue-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Nông dân hưởng lợi</span>
              </div>
              <p className="text-lg font-semibold text-blue-700">
                {project.farmers_impacted.toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1 text-blue-600 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium">Khu vực</span>
              </div>
              <p className="text-sm font-semibold text-blue-700">{project.area}</p>
            </div>
          </div>

          {/* Funding Progress */}
          <div className="border border-gray-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700 text-sm">Tiến độ gọi vốn</span>
              </div>
              <span className="text-lg font-semibold text-blue-600">{progress.toFixed(0)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-gray-600">
                Đã huy động: <span className="font-medium text-blue-600">{formatMoney(project.current_funding)}</span>
              </span>
              <span className="text-gray-600">
                Mục tiêu: <span className="font-medium text-blue-600">{formatMoney(project.funding_goal)}</span>
              </span>
            </div>

            {project.investors_count > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {project.investors_count} nhà đầu tư đã tham gia
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {isOwner ? (
            <div className="space-y-2">
              {/* Investors List Button */}
              <button
                onClick={() => setShowInvestorsList(true)}
                className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Xem nhà đầu tư ({project.investors_count})
              </button>

              {/* Edit and Delete Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onEdit?.(project.id)}
                  className="bg-gray-100 text-gray-700 px-2 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 text-sm"
                  disabled={deleting}
                >
                  <Edit className="w-3 h-3" />
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-50 text-red-700 px-2 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1 text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {project.status === 'active' && (
                <button
                  onClick={() => setShowInvestModal(true)}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Tham gia đầu tư
                </button>
              )}

              {project.status === 'funded' && (
                <div className="w-full bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-medium text-center text-sm">
                  Dự án đã hoàn thành gọi vốn
                </div>
              )}

              {project.status === 'pending' && (
                <div className="w-full bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-medium text-center text-sm">
                  Dự án đang chờ phê duyệt
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