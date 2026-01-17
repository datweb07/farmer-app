// @ts-nocheck
// Recursive comment component - supports 1 level nesting (Comment → Reply only)
import { useState } from 'react';
import { Trash2, MessageCircle } from 'lucide-react';
import type { PostComment } from '../../lib/community/types';
import { useAuth } from '../../contexts/AuthContext';
import { deleteComment } from '../../lib/community/posts.service';
import { CommentLikeButton } from './CommentLikeButton';
import { CommentReplyForm } from './CommentReplyForm';
import { UserAvatar } from './UserAvatar';
import { CommentContent } from './CommentContent';
import { UserProfileModal } from './UserProfileModal';

interface CommentItemProps {
    comment: PostComment;
    postId: string;
    depth: number;
    maxDepth: number;
    rootCommentId?: string; // ID of the root comment (for flat reply structure)
    parentCommentUsername?: string; // Username of the comment being replied to
    onDelete: (commentId: string) => void;
    onReplySuccess: (parentId: string, reply: PostComment) => void;
}

const INDENT_PX = 32; // Pixels to indent per level
const MAX_DEPTH = 3; // Maximum visual depth before flattening

export function CommentItem({
    comment,
    postId,
    depth,
    maxDepth,
    rootCommentId,
    parentCommentUsername,
    onDelete,
    onReplySuccess,
}: CommentItemProps) {
    const { user, profile } = useAuth();
    const [replyingTo, setReplyingTo] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // For flat structure: always use root comment ID as parent
    const parentIdForReply = rootCommentId || comment.id;

    const handleDelete = async () => {
        if (!confirm('Xóa bình luận này?')) return;
        const result = await deleteComment(comment.id);
        if (result.success) {
            onDelete(comment.id);
        }
    };

    const handleReplySuccess = (reply: PostComment) => {
        onReplySuccess(comment.id, reply);
        setReplyingTo(false);
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

    // Calculate visual depth (cap at maxDepth for UI)
    const visualDepth = Math.min(depth, maxDepth);
    const indentStyle = { marginLeft: `${visualDepth * INDENT_PX}px` };
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
        <div style={indentStyle} className="mb-2">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                    <UserAvatar
                        avatarUrl={comment.avatar_url}
                        username={comment.username}
                        size={depth === 0 ? 'md' : 'sm'}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 text-sm">
                                    {comment.username || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatDate(comment.created_at)}
                                </p>
                            </div>
                            {user && user.id === comment.user_id && (
                                <button
                                    onClick={handleDelete}
                                    className="text-red-500 hover:text-red-700 p-0.5"
                                    title="Xóa"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <CommentContent
                            content={comment.content}
                            isReply={depth > 0}
                            parentUsername={parentCommentUsername}
                        />

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <CommentLikeButton
                                commentId={comment.id}
                                initialLiked={comment.user_liked || false}
                                initialCount={comment.like_count || 0}
                            />

                            {/* Show reply button at all levels, but replies go to root comment */}
                            {user && (
                                <button
                                    onClick={() => setReplyingTo(!replyingTo)}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>Trả lời</span>
                                </button>
                            )}

                            {hasReplies && (
                                <button
                                    onClick={() => setCollapsed(!collapsed)}
                                    className="text-xs font-medium text-gray-600 hover:text-gray-800"
                                >
                                    {collapsed ? 'Hiện' : 'Ẩn'} {comment.replies!.length} trả lời
                                </button>
                            )}
                        </div>

                        {/* Reply Form */}
                        {replyingTo && (
                            <div className="mt-2">
                                <CommentReplyForm
                                    postId={postId}
                                    parentCommentId={parentIdForReply}
                                    parentUsername={comment.username || 'Unknown'}
                                    currentUsername={user?.user_metadata?.username || profile?.username}
                                    onSuccess={handleReplySuccess}
                                    onCancel={() => setReplyingTo(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recursive Nested Replies */}
            {hasReplies && !collapsed && (
                <div className="mt-1">
                    {comment.replies!.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            postId={postId}
                            depth={depth + 1}
                            maxDepth={maxDepth}
                            rootCommentId={rootCommentId || comment.id}
                            parentCommentUsername={comment.username}
                            onDelete={onDelete}
                            onReplySuccess={onReplySuccess}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
