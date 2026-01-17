import React from 'react';
import type { BadgeProgress } from '../../lib/badges/types';

interface BadgeProps {
    badge: BadgeProgress;
    size?: 'small' | 'medium' | 'large';
    showProgress?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
    badge,
    size = 'medium',
    showProgress = true,
}) => {
    const sizeClasses = {
        small: 'w-12 h-12 text-xl',
        medium: 'w-16 h-16 text-3xl',
        large: 'w-24 h-24 text-5xl',
    };

    const progressPercentage =
        badge.target > 0 ? Math.min((badge.progress / badge.target) * 100, 100) : 0;

    return (
        <div className="flex flex-col items-center gap-2 relative group">
            {/* Badge Icon */}
            <div
                className={`
          ${sizeClasses[size]}
          rounded-full
          flex items-center justify-center
          transition-all duration-300
          ${badge.earned
                        ? 'bg-gradient-to-br shadow-lg scale-100 hover:scale-110'
                        : 'bg-gray-200 dark:bg-gray-700 opacity-50 grayscale'
                    }
        `}
                style={{
                    backgroundColor: badge.earned ? badge.badge_color + '20' : undefined,
                    borderColor: badge.earned ? badge.badge_color : undefined,
                    borderWidth: badge.earned ? '3px' : '2px',
                    borderStyle: 'solid',
                }}
            >
                <span className={badge.earned ? 'animate-pulse-slow' : ''}>
                    {badge.badge_icon}
                </span>
            </div>

            {/* Badge Name & Description Tooltip */}
            <div className="text-center">
                <p
                    className={`
            text-sm font-semibold
            ${badge.earned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}
          `}
                >
                    {badge.badge_name}
                </p>

                {/* Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <p className="font-medium">{badge.badge_description}</p>
                    {!badge.earned && showProgress && (
                        <p className="text-gray-300 mt-1">
                            {badge.progress} / {badge.target}
                        </p>
                    )}
                    {badge.earned && badge.earned_at && (
                        <p className="text-gray-300 mt-1">
                            Đạt được: {new Date(badge.earned_at).toLocaleDateString('vi-VN')}
                        </p>
                    )}
                </div>
            </div>

            {/* Progress Bar (for unearned badges) */}
            {!badge.earned && showProgress && badge.target > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                            width: `${progressPercentage}%`,
                            backgroundColor: badge.badge_color,
                        }}
                    />
                </div>
            )}

            {/* Progress Text */}
            {!badge.earned && showProgress && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {badge.progress} / {badge.target}
                </p>
            )}

            {/* Earned Checkmark */}
            {badge.earned && (
                <div
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                >
                    ✓
                </div>
            )}
        </div>
    );
};

export default Badge;
