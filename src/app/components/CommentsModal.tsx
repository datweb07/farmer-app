import { X, MessageCircle } from 'lucide-react';
import { useEffect } from 'react';
import { CommentSection } from './CommentSection';

interface CommentsModalProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
    commentsCount: number;
    onCommentAdded: () => void;
}

export function CommentsModal({
    postId,
    isOpen,
    onClose,
    commentsCount,
    onCommentAdded
}: CommentsModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay với backdrop blur */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-gray-600" />
                            <h2 className="text-base font-semibold text-gray-900">
                                Bình luận
                            </h2>
                            {commentsCount > 0 && (
                                <span className="text-sm text-gray-500">
                                    ({commentsCount})
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto">
                        <CommentSection
                            postId={postId}
                            onCommentAdded={onCommentAdded}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}