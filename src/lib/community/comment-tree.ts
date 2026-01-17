import type { PostComment } from './types';

/**
 * Build nested comment tree from flat array
 * @param comments - Flat array of comments
 * @returns Tree structure with children
 */
export function buildCommentTree(comments: PostComment[]): PostComment[] {
    const commentMap = new Map<string, PostComment>();
    const rootComments: PostComment[] = [];

    // First pass: Create map and initialize children array
    comments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: Build tree structure
    comments.forEach(comment => {
        const node = commentMap.get(comment.id)!;

        if (!comment.parent_comment_id) {
            // Root level comment
            rootComments.push(node);
        } else {
            // Child comment - add to parent's replies
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
                parent.replies = parent.replies || [];
                parent.replies.push(node);
            } else {
                // Parent not found (orphaned comment) - add to root
                rootComments.push(node);
            }
        }
    });

    // Sort each level by created_at
    const sortReplies = (items: PostComment[]) => {
        items.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        items.forEach(item => {
            if (item.replies && item.replies.length > 0) {
                sortReplies(item.replies);
            }
        });
    };

    sortReplies(rootComments);
    return rootComments;
}
