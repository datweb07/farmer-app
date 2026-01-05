import { useState } from 'react';
import { Heart } from 'lucide-react';
import { likeComment, unlikeComment } from '../../lib/community/posts.service';

interface CommentLikeButtonProps {
    commentId: string;
    initialLiked?: boolean;
    initialLikeCount: number;
    onLikeChange?: (liked: boolean, newCount: number) => void;
}

export function CommentLikeButton({
    commentId,
    initialLiked = false,
    initialLikeCount,
    onLikeChange,
}: CommentLikeButtonProps) {
    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [processing, setProcessing] = useState(false);

    const handleLikeToggle = async () => {
        if (processing) return;

        const previousLiked = liked;
        const previousCount = likeCount;

        // Optimistic update
        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);
        setProcessing(true);

        try {
            const result = liked
                ? await unlikeComment(commentId)
                : await likeComment(commentId);

            if (!result.success) {
                // Revert on error
                setLiked(previousLiked);
                setLikeCount(previousCount);
            } else {
                // Notify parent
                onLikeChange?.(!previousLiked, liked ? likeCount - 1 : likeCount + 1);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on error
            setLiked(previousLiked);
            setLikeCount(previousCount);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <button
            onClick={handleLikeToggle}
            disabled={processing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${liked
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={liked ? 'Unlike comment' : 'Like comment'}
        >
            <Heart
                className={`w-4 h-4 transition-all ${liked ? 'fill-red-600 scale-110' : ''
                    }`}
            />
            <span>{likeCount > 0 ? likeCount : ''}</span>
        </button>
    );
}
