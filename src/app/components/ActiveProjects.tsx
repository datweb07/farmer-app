import { ArrowRight } from "lucide-react";
import type { InvestmentProjectWithStats } from "../../lib/investments/types";

interface ActiveProjectsProps {
  projects: InvestmentProjectWithStats[];
  loading?: boolean;
  onNavigate?: (page: string) => void;
}

export function ActiveProjects({
  projects,
  loading,
  onNavigate,
}: ActiveProjectsProps) {
  const formatMoney = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} tỷ`;
    }
    return `${(amount / 1000000).toFixed(0)} triệu`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Dự án đang kêu gọi
        </h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-2 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">
          Dự án đang kêu gọi
        </h3>
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">Chưa có dự án nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
          Dự án đang kêu gọi
        </h3>
        <button
          onClick={() => onNavigate?.("invest")}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Xem tất cả
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <h4 className="text-sm font-medium text-gray-900 mb-2 group-hover:text-blue-600">
              {project.title}
            </h4>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{formatMoney(project.current_funding)} VNĐ</span>
                <span>{project.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(project.progress_percentage, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Mục tiêu: {formatMoney(project.funding_goal)} VNĐ</span>
              <span>•</span>
              <span>{project.investors_count} nhà đầu tư</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
