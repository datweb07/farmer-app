import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { getProjectLeaderboard } from '../../lib/investments/rating.service';
import { StarRating } from './StarRating';
import { UserProfileModal } from './UserProfileModal';
import type { LeaderboardProject } from '../../lib/investments/types';

interface ProjectLeaderboardProps {
    limit?: number;
    onProjectClick?: (projectId: string) => void;
}

export function ProjectLeaderboard({ limit = 10, onProjectClick }: ProjectLeaderboardProps) {
    const [projects, setProjects] = useState<LeaderboardProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

    useEffect(() => {
        loadLeaderboard();
    }, [limit]);

    const loadLeaderboard = async () => {
        setLoading(true);
        const result = await getProjectLeaderboard(limit);

        if (result.error) {
            setError(result.error);
        } else {
            setProjects(result.projects);
        }

        setLoading(false);
    };

    const getRankNumber = (rank: number) => {
        if (rank <= 3) {
            return ['🥇', '🥈', '🥉'][rank - 1];
        }
        return `#${rank}`;
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <p className="text-red-600 text-center">{error}</p>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Chưa có dự án nào được đánh giá</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-gray-900">
                        {/* <Trophy className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">Bảng Xếp Hạng Dự Án</h2> */}
                    </div>
                    <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-blue-600" />
                        <span>Top {projects.length} dự án được đánh giá cao nhất</span>
                    </p>

                </div>

                {/* Leaderboard List */}
                <div className="divide-y divide-gray-100">
                    {projects.map((project, index) => {
                        const rank = index + 1;
                        const fundingProgress = project.funding_progress;

                        return (
                            <div
                                key={project.project_id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${onProjectClick ? 'cursor-pointer' : ''
                                    }`}
                                onClick={() => onProjectClick?.(project.project_id)}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Rank */}
                                    <div className="flex-shrink-0">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${rank <= 3
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-gray-50 text-gray-600'
                                            }`}>
                                            {getRankNumber(rank)}
                                        </div>
                                    </div>

                                    {/* Project Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium text-gray-900 line-clamp-1 pr-2">
                                                {project.title}
                                            </h3>
                                            <div className="flex-shrink-0 text-sm font-medium text-blue-600">
                                                {project.rating_score.toFixed(1)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <StarRating
                                                rating={project.avg_rating}
                                                totalRatings={project.total_ratings}
                                                size="sm"
                                            />
                                        </div>

                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-3 h-3 text-blue-600" />
                                                <span>
                                                    Tiến độ: {fundingProgress.toFixed(0)}%
                                                </span>
                                            </div>

                                            <div
                                                className="text-gray-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUsername(project.creator_username);
                                                }}
                                            >
                                                {project.creator_username}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Funding Progress Bar */}
                                <div className="mt-3 ml-11">
                                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-full rounded-full transition-all"
                                            style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* User Profile Modal - Outside container for proper z-index */}
            <UserProfileModal
                username={selectedUsername || ""}
                isOpen={!!selectedUsername}
                onClose={() => setSelectedUsername(null)}
            />
        </>
    );
}