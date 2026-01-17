import { AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface SalinityCardProps {
  currentSalinity: number;
  forecastSalinity: number;
  level: 'safe' | 'warning' | 'danger';
}

export function SalinityCard({ currentSalinity, forecastSalinity, level }: SalinityCardProps) {
  const getLevelConfig = () => {
    switch (level) {
      case 'safe':
        return {
          icon: CheckCircle,
          bg: 'bg-gradient-to-br from-green-400 to-green-600',
          text: 'An toàn',
          description: 'Có thể canh tác bình thường',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bg: 'bg-gradient-to-br from-yellow-400 to-orange-500',
          text: 'Cảnh báo',
          description: 'Cần theo dõi và chuẩn bị',
        };
      case 'danger':
        return {
          icon: XCircle,
          bg: 'bg-gradient-to-br from-red-500 to-red-700',
          text: 'Nguy hiểm',
          description: 'Cần hành động ngay',
        };
    }
  };

  const config = getLevelConfig();
  const Icon = config.icon;
  const trend = forecastSalinity > currentSalinity;
  const TrendIcon = trend ? TrendingUp : TrendingDown;

  return (
    <div className={`${config.bg} rounded-2xl p-6 text-white shadow-xl`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className="w-10 h-10" />
          <div>
            <h3 className="font-bold text-xl">{config.text}</h3>
            <p className="text-sm opacity-90">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
          <p className="text-sm opacity-90 mb-1">Hiện tại</p>
          <p className="text-3xl font-bold">{currentSalinity}‰</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
          <p className="text-sm opacity-90 mb-1 flex items-center gap-1">
            Dự báo 7 ngày
            <TrendIcon className="w-4 h-4" />
          </p>
          <p className="text-3xl font-bold">{forecastSalinity}‰</p>
        </div>
      </div>

      <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-3">
        <p className="text-sm text-center font-medium">
          {trend ? '📈 Độ mặn đang tăng' : '📉 Độ mặn đang giảm'}
        </p>
      </div>
    </div>
  );
}
