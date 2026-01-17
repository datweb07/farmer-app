import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { StarRatingInput } from './StarRatingInput';
import { rateProject, getUserRatingForProject } from '../../lib/investments/rating.service';
import type { InvestmentProjectWithStats } from '../../lib/investments/types';

interface ProjectRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: InvestmentProjectWithStats;
    onSuccess?: () => void;
}

export function ProjectRatingModal({ isOpen, onClose, project, onSuccess }: ProjectRatingModalProps) {
    const [rating, setRating] = useState<number>(0);
    const [review, setReview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingRating, setExistingRating] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadExistingRating();
        }
    }, [isOpen, project.id]);

    const loadExistingRating = async () => {
        setLoading(true);
        const result = await getUserRatingForProject(project.id);

        if (result.rating) {
            setRating(result.rating.rating);
            setReview(result.rating.review || '');
            setExistingRating(result.rating.rating);
        } else {
            setRating(0);
            setReview('');
            setExistingRating(null);
        }

        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (rating < 1 || rating > 5) {
            setError('Vui lòng chọn số sao từ 1 đến 5');
            return;
        }

        setSubmitting(true);

        const result = await rateProject({
            project_id: project.id,
            rating,
            review: review.trim() || undefined,
        });

        setSubmitting(false);

        if (result.success) {
            onSuccess?.();
            onClose();
            // Reset form
            setRating(0);
            setReview('');
            setExistingRating(null);
        } else {
            setError(result.error || 'Không thể gửi đánh giá');
        }
    };

    const handleClose = () => {
        if (!submitting) {
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={existingRating ? 'Cập nhật đánh giá' : 'Đánh giá dự án'}
            maxWidth="lg"
        >
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            ) : (
                <>
                    {/* Project Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                        <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Star Rating */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Đánh giá của bạn *
                            </label>
                            <StarRatingInput
                                value={rating}
                                onChange={setRating}
                                disabled={submitting}
                                size="lg"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Click vào sao để chọn đánh giá từ 1 đến 5
                            </p>
                        </div>

                        {/* Review Text (Optional) */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">
                                Nhận xét chi tiết (không bắt buộc)
                            </label>
                            <textarea
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                rows={4}
                                maxLength={500}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                                placeholder="Chia sẻ trải nghiệm của bạn về dự án này..."
                                disabled={submitting}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {review.length}/500 ký tự
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting || rating === 0}
                            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang gửi...</span>
                                </>
                            ) : (
                                <>
                                    <Star className="w-4 h-4" />
                                    <span>{existingRating ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</span>
                                </>
                            )}
                        </button>
                    </form>
                </>
            )}
        </Modal>
    );
}
