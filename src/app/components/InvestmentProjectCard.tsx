import { Target, Users, MapPin, TrendingUp } from 'lucide-react';
import type { InvestmentProject } from '../../data/mockData';

interface InvestmentProjectCardProps {
  project: InvestmentProject;
}

export function InvestmentProjectCard({ project }: InvestmentProjectCardProps) {
  const formatMoney = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} tỷ VNĐ`;
    }
    return `${(amount / 1000000).toFixed(0)} triệu VNĐ`;
  };

  const progress = (project.currentFunding / project.fundingGoal) * 100;

  const getStatusBadge = () => {
    switch (project.status) {
      case 'active':
        return { text: 'Đang kêu gọi', color: 'bg-green-100 text-green-700' };
      case 'funded':
        return { text: 'Đã đủ vốn', color: 'bg-blue-100 text-blue-700' };
      case 'pending':
        return { text: 'Chờ phê duyệt', color: 'bg-yellow-100 text-yellow-700' };
    }
  };

  const statusBadge = getStatusBadge();

  return (
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
              {project.farmersImpacted.toLocaleString('vi-VN')}
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
              Đã huy động: <span className="font-bold text-green-600">{formatMoney(project.currentFunding)}</span>
            </span>
            <span className="text-gray-600">
              Mục tiêu: <span className="font-bold text-blue-600">{formatMoney(project.fundingGoal)}</span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        {project.status === 'active' && (
          <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg">
            <TrendingUp className="w-6 h-6" />
            Tham gia đầu tư
          </button>
        )}

        {project.status === 'funded' && (
          <div className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-4 rounded-xl font-bold text-center">
            ✓ Dự án đã hoàn thành gọi vốn
          </div>
        )}
      </div>
    </div>
  );
}
