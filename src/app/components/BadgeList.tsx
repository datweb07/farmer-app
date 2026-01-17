import React, { useEffect, useState } from 'react';
import Badge from './Badge';
import { getUserBadgeProgress } from '../../lib/badges/badge.service';
import type { BadgeProgress } from '../../lib/badges/types';

interface BadgeListProps {
    userId: string;
    title?: string;
    showProgress?: boolean;
    compact?: boolean;
}

const BadgeList: React.FC<BadgeListProps> = ({
    userId,
    title = 'Thành tích',
    showProgress = true,
    compact = false,
}) => {
    const [badges, setBadges] = useState<BadgeProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

    useEffect(() => {
        loadBadges();
    }, [userId]);

    const loadBadges = async () => {
        try {
            setLoading(true);
            const data = await getUserBadgeProgress(userId);
            setBadges(data);
        } catch (error) {
            console.error('Error loading badges:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBadges = badges.filter((badge) => {
        if (filter === 'earned') return badge.earned;
        if (filter === 'locked') return !badge.earned;
        return true;
    });

    const earnedCount = badges.filter((b) => b.earned).length;
    const totalCount = badges.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {earnedCount} / {totalCount} thành tích đã đạt được
                    </p>
                </div>

                {/* Filter Buttons */}
                {!compact && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${filter === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }
              `}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setFilter('earned')}
                            className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${filter === 'earned'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }
              `}
                        >
                            Đã đạt ({earnedCount})
                        </button>
                        <button
                            onClick={() => setFilter('locked')}
                            className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${filter === 'locked'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }
              `}
                        >
                            Chưa đạt ({totalCount - earnedCount})
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {!compact && (
                <div className="mb-6">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                            style={{ width: `${(earnedCount / totalCount) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Badge Grid */}
            <div
                className={`
          grid gap-6
          ${compact
                        ? 'grid-cols-3 sm:grid-cols-5'
                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                    }
        `}
            >
                {filteredBadges.map((badge) => (
                    <Badge
                        key={badge.badge_id}
                        badge={badge}
                        size={compact ? 'small' : 'medium'}
                        showProgress={showProgress}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredBadges.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                        {filter === 'earned'
                            ? 'Chưa có thành tích nào được đạt'
                            : 'Không có thành tích nào'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default BadgeList;
