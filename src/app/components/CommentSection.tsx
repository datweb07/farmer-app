// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
import { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { getComments, addComment } from '../../lib/community/posts.service';
import type { PostComment } from '../../lib/community/types';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { CommentItem } from './CommentItem';
import { buildCommentTree } from '../../lib/community/comment-tree';

interface CommentSectionProps {
    postId: string;
    onCommentAdded?: () => void;
}

const MAX_DEPTH = 3; // Maximum visual depth for UI

export function CommentSection({ postId, onCommentAdded }: CommentSectionProps) {
    const { user, profile } = useAuth();
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
        if (!result.error) {
            // Build tree structure from flat list
            const tree = buildCommentTree(result.comments);
            setComments(tree);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        setSubmitting(true);
        setError(null);

        const result = await addComment(postId, newComment.trim());

        if (result.success) {
            setNewComment('');
            await loadComments(); // Reload to rebuild tree
            onCommentAdded?.();
        } else {
            setError(result.error || 'Không thể gửi bình luận');
        }

        setSubmitting(false);
    };

    const handleDelete = async (commentId: string) => {
        // Reload entire tree after delete
        await loadComments();
    };

    const handleReplySuccess = async (parentId: string, reply: PostComment) => {
        // Reload entire tree to rebuild structure
        await loadComments();
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Comments Tree */}
            {comments.length > 0 ? (
                <div className="space-y-2">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={postId}
                            depth={0}
                            maxDepth={MAX_DEPTH}
                            onDelete={handleDelete}
                            onReplySuccess={handleReplySuccess}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 text-sm py-3">
                    Chưa có bình luận nào
                </p>
            )}

            {/* Add Comment Form */}
            {user ? (
                <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-3">
                    {error && (
                        <div className="mb-2 bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-red-700 text-xs">{error}</p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <UserAvatar
                            avatarUrl={profile?.avatar_url}
                            username={profile?.username}
                            size="md"
                        />
                        <div className="flex-1">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Viết bình luận..."
                                rows={2}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-600 focus:outline-none resize-none text-sm"
                                disabled={submitting}
                            />
                            <div className="flex justify-end mt-1">
                                <button
                                    type="submit"
                                    disabled={submitting || !newComment.trim()}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>Đang gửi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3 h-3" />
                                            <span>Gửi</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-600 text-sm">
                        Đăng nhập để bình luận
                    </p>
                </div>
            )}
        </div>
    );
}