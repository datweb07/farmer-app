import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
}

export function StatsCard({ title, value, icon: Icon, color, subtitle }: StatsCardProps) {
  const colorConfig = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
      icon: 'bg-blue-200/30',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-400 to-green-600',
      icon: 'bg-green-200/30',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-400 to-purple-600',
      icon: 'bg-purple-200/30',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-400 to-orange-600',
      icon: 'bg-orange-200/30',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={`${config.bg} rounded-2xl p-6 text-white shadow-xl`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm opacity-90 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-sm opacity-90 mt-2">{subtitle}</p>}
        </div>
        <div className={`${config.icon} p-3 rounded-xl`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
