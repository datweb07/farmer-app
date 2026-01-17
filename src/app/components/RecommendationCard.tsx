interface RecommendationCardProps {
  title: string;
  recommendations: string[];
  color: 'green' | 'yellow' | 'red';
}

export function RecommendationCard({ title, recommendations, color }: RecommendationCardProps) {
  const colorConfig = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      title: 'text-green-800',
      text: 'text-green-700',
      icon: '✓',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      title: 'text-yellow-800',
      text: 'text-yellow-700',
      icon: '⚠',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      title: 'text-red-800',
      text: 'text-red-700',
      icon: '✗',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-2xl p-6`}>
      <h3 className={`${config.title} font-bold text-xl mb-4 flex items-center gap-2`}>
        <span className="text-2xl">{config.icon}</span>
        {title}
      </h3>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className={`${config.text} flex items-start gap-3 text-lg`}>
            <span className="text-xl mt-1 flex-shrink-0">{rec.charAt(0)}</span>
            <p className="flex-1">{rec.substring(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
