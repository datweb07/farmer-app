import { useState, useEffect } from 'react';
import { Target, Users, MapPin, TrendingUp, Edit, Trash2, UserCheck, Star } from 'lucide-react';
import type { InvestmentProjectWithStats } from '../../lib/investments/types';
import { InvestmentModal } from './InvestmentModal';
import { InvestorsListModal } from './InvestorsListModal';
import { ProjectRatingModal } from './ProjectRatingModal';
import { deleteProject } from '../../lib/investments/investments.service';
import { getProjectRatingStats, canUserRateProject } from '../../lib/investments/rating.service';
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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [canRate, setCanRate] = useState<boolean>(false);

  useEffect(() => {
    loadRatingStats();
    checkCanRate();
  }, [project.id, user]);

  const loadRatingStats = async () => {
    const result = await getProjectRatingStats(project.id);
    if (result.stats) {
      setAvgRating(result.stats.avg_rating);
      setTotalRatings(result.stats.total_ratings);
    }
  };

  const checkCanRate = async () => {
    if (!user) {
      setCanRate(false);
      return;
    }
    const result = await canUserRateProject(project.id);
    setCanRate(result.canRate);
  };

  const handleRatingSuccess = () => {
    loadRatingStats();
    onUpdate?.();
  };

  const formatMoney = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} tỷ VNĐ`;
    }
    return `${(amount / 1000000).toFixed(0)} triệu VNĐ`;
  };

  const progress = project.progress_percentage || 0;
  const isCompleted = progress >= 100;

  const getStatusBadge = () => {
    if (isCompleted) {
      return { text: 'Hoàn thành', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
    }

    switch (project.status) {
      case 'active':
        return { text: 'Đang kêu gọi', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
      case 'funded':
        return { text: 'Đã đủ vốn', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
      case 'pending':
        return { text: 'Chờ phê duyệt', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
      case 'completed':
        return { text: 'Hoàn thành', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
      case 'cancelled':
        return { text: 'Đã hủy', color: 'bg-gray-50 text-gray-600 border border-gray-200' };
      default:
        return { text: 'Đang kêu gọi', color: 'bg-blue-50 text-blue-600 border border-blue-200' };
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
      onUpdate?.();
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight pr-2">
              {project.title}
            </h3>
            <span className={`${statusBadge.color} px-2 py-1 rounded text-xs font-medium whitespace-nowrap`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
        </div>

        {/* Project Image */}
        {project.image_url && (
          <div className="w-full border-b border-gray-100">
            <img
              src={project.image_url}
              alt={project.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Stats */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 text-xs font-medium">Nông dân hưởng lợi</span>
              </div>
              <p className="text-gray-900 font-semibold">
                {project.farmers_impacted.toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 text-xs font-medium">Khu vực</span>
              </div>
              <p className="text-gray-900 font-semibold">{project.area}</p>
            </div>
          </div>

          {/* Funding Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700 font-medium text-sm">Tiến độ gọi vốn</span>
              </div>
              <span className="font-semibold text-blue-600">{progress.toFixed(0)}%</span>
            </div>

            <div className="bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-600">
              <span>
                Đã huy động: <span className="font-medium text-blue-600">{formatMoney(project.current_funding)}</span>
              </span>
              <span>
                Mục tiêu: <span className="font-medium text-gray-700">{formatMoney(project.funding_goal)}</span>
              </span>
            </div>

            {project.investors_count > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {project.investors_count} nhà đầu tư đã tham gia
              </p>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex justify-between items-center text-sm mb-4">
            {project.creator_username && (
              <span className="text-gray-600">
                Bởi <span className="font-medium text-gray-800">{project.creator_username}</span>
              </span>
            )}

            {totalRatings > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-blue-500" />
                <span className="font-medium text-gray-800">{avgRating.toFixed(1)}</span>
                <span className="text-gray-500">({totalRatings})</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isOwner ? (
            <div className="space-y-3">
              <button
                onClick={() => setShowInvestorsList(true)}
                className="w-full bg-blue-600 text-white px-3 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <UserCheck className="w-4 h-4" />
                Nhà đầu tư ({project.investors_count})
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit?.(project.id)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 text-sm"
                  disabled={deleting}
                >
                  <Edit className="w-3 h-3" />
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-white border border-gray-300 text-red-600 px-3 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1 text-sm"
                >
                  <Trash2 className="w-3 h-3" />
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {isCompleted ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2.5 rounded-lg text-center text-sm font-medium">
                  Dự án đã hoàn thành gọi vốn
                </div>
              ) : (
                <>
                  {project.status === 'active' && (
                    <button
                      onClick={() => setShowInvestModal(true)}
                      className="w-full bg-blue-600 text-white px-3 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Tham gia đầu tư
                    </button>
                  )}

                  {project.status === 'funded' && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2.5 rounded-lg text-center text-sm font-medium">
                      Dự án đã đủ vốn
                    </div>
                  )}

                  {project.status === 'pending' && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2.5 rounded-lg text-center text-sm font-medium">
                      Đang chờ phê duyệt
                    </div>
                  )}
                </>
              )}

              {canRate && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Star className="w-4 h-4" />
                  Đánh giá dự án
                </button>
              )}
            </div>
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

      {/* Rating Modal */}
      <ProjectRatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        project={project}
        onSuccess={handleRatingSuccess}
      />
    </>
  );
}