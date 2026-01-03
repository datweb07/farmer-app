import { useState, useEffect } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { getComments, addComment, deleteComment } from '../../lib/community/posts.service';
import type { PostComment } from '../../lib/community/types';
import { useAuth } from '../../contexts/AuthContext';

interface CommentSectionProps {
    postId: string;
    onCommentAdded?: () => void;
}

export function CommentSection({ postId, onCommentAdded }: CommentSectionProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<PostComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadComments();
    }, [postId]);

    const loadComments = async () => {
        setLoading(true);
        const result = await getComments(postId);
        if (result.error) {
            setError(result.error);
        } else {
            setComments(result.comments);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setSubmitting(true);
        setError(null);

        const result = await addComment(postId, newComment.trim());
        if (result.success && result.comment) {
            setComments([...comments, result.comment]);
            setNewComment('');
            onCommentAdded?.();
        } else {
            setError(result.error || 'Không thể thêm bình luận');
        }

        setSubmitting(false);
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa bình luận này?')) return;

        const result = await deleteComment(commentId);
        if (result.success) {
            setComments(comments.filter(c => c.id !== commentId));
        } else {
            alert(result.error || 'Không thể xóa bình luận');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} giờ trước`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} ngày trước`;

        return date.toLocaleDateString('vi-VN');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Comment List */}
            {comments.length > 0 ? (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <img
                                    src={comment.author_avatar || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
                                    alt={comment.author_username}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {comment.author_username || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(comment.created_at)}
                                            </p>
                                        </div>
                                        {user && user.id === comment.user_id && (
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Xóa bình luận"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-gray-700 mt-2">{comment.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 py-4">
                    Chưa có bình luận nào. Hãy là người đầu tiên!
                </p>
            )}

            {/* Add Comment Form */}
            {user ? (
                <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                    {error && (
                        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <img
                            src={user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100'}
                            alt="Your avatar"
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Viết bình luận..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                                disabled={submitting}
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || !newComment.trim()}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Gửi
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="text-center bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                    <p className="text-gray-600">
                        Đăng nhập để bình luận
                    </p>
                </div>
            )}
        </div>
    );
}
