// @ts-nocheck - Types will be fully available after running SQL schema in Supabase
// ============================================
// Posts Service
// ============================================
// Handles all post-related operations
// ============================================

import { supabase } from '../supabase/supabase';
import type {
    CreatePostData,
    UpdatePostData,
    PostWithStats,
    PostComment,
} from './types';
import { uploadImage } from './image-upload';

/**
 * Create a new post
 */
export async function createPost(data: CreatePostData): Promise<{
    success: boolean;
    post?: PostWithStats;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Posts] Creating post...');

        // Upload image if provided
        let imageUrl: string | undefined;
        if (data.image) {
            const { url, error } = await uploadImage(data.image, 'post-images', user.id);
            if (error) {
                return { success: false, error };
            }
            imageUrl = url || undefined;
        }

        // Insert post
        const { data: post, error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                title: data.title,
                content: data.content,
                category: data.category,
                image_url: imageUrl,
                product_link: data.product_link,
            })
            .select()
            .single();

        if (insertError || !post) {
            console.error('🔴 [Posts] Insert error:', insertError);
            return { success: false, error: 'Không thể tạo bài viết' };
        }

        // Fetch full post with stats
        const fullPost = await getPostById(post.id);
        if (!fullPost) {
            return { success: false, error: 'Bài viết đã tạo nhưng không thể tải lại' };
        }

        console.log('✅ [Posts] Post created:', post.id);
        return { success: true, post: fullPost };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get posts with filters
 */
export async function getPosts(params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
}): Promise<{
    posts: PostWithStats[];
    error?: string;
}> {
    try {
        console.log('🔵 [Posts] Fetching posts...');

        const { data, error } = await supabase.rpc('get_posts_with_stats', {
            category_filter: params?.category || null,
            search_query: params?.search || null,
            limit_count: params?.limit || 20,
            offset_count: params?.offset || 0,
        });

        if (error) {
            console.error('🔴 [Posts] Fetch error:', error);
            return { posts: [], error: 'Không thể tải bài viết' };
        }

        // Check if current user liked each post
        const { data: { user } } = await supabase.auth.getUser();
        if (user && data) {
            const postIds = data.map((p: PostWithStats) => p.id);
            const { data: likes } = await supabase
                .from('post_likes')
                .select('post_id')
                .eq('user_id', user.id)
                .in('post_id', postIds);

            const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
            data.forEach((post: PostWithStats) => {
                post.is_liked = likedPostIds.has(post.id);
            });
        }

        console.log('✅ [Posts] Fetched', data?.length || 0, 'posts');
        return { posts: (data as PostWithStats[]) || [] };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { posts: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get single post by ID
 */
export async function getPostById(postId: string): Promise<PostWithStats | null> {
    try {
        const { data, error } = await supabase.rpc('get_post_with_stats', {
            post_uuid: postId,
        });

        if (error || !data || data.length === 0) {
            console.error('🔴 [Posts] Fetch error:', error);
            return null;
        }

        const post = data[0] as PostWithStats;

        // Check if current user liked this post
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: like } = await supabase
                .from('post_likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', user.id)
            // .single();
            post.is_liked = !!like;
        }

        return post;
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return null;
    }
}

/**
 * Update post
 */
export async function updatePost(
    postId: string,
    updates: UpdatePostData
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', postId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Posts] Update error:', error);
            return { success: false, error: 'Không thể cập nhật bài viết' };
        }

        console.log('✅ [Posts] Post updated:', postId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Delete post
 */
export async function deletePost(postId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Posts] Delete error:', error);
            return { success: false, error: 'Không thể xóa bài viết' };
        }

        console.log('✅ [Posts] Post deleted:', postId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('post_likes')
            .insert({ post_id: postId, user_id: user.id });

        if (error) {
            console.error('🔴 [Posts] Like error:', error);
            return { success: false, error: 'Không thể thích bài viết' };
        }

        console.log('✅ [Posts] Post liked:', postId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Posts] Unlike error:', error);
            return { success: false, error: 'Không thể bỏ thích' };
        }

        console.log('✅ [Posts] Post unliked:', postId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Track post view
 */
export async function trackPostView(postId: string): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.rpc('increment_post_views', {
            post_uuid: postId,
            viewer_id: user?.id || null,
        });

        console.log('✅ [Posts] View tracked:', postId);
    } catch (err) {
        console.error('🔴 [Posts] View tracking error:', err);
    }
}

/**
 * Get comments for a post
 */
export async function getComments(postId: string): Promise<{
    comments: PostComment[];
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('post_comments')
            .select(`
                *,
                profiles:user_id (
                    username,
                    avatar_url
                )
            `)
            .eq('post_id', postId)
            // Removed .is('parent_comment_id', null) to get ALL comments for tree building
            .order('created_at', { ascending: true });

        if (error) {
            console.error('🔴 [Posts] Comments fetch error:', error);
            return { comments: [], error: 'Không thể tải bình luận' };
        }

        // Check if user liked each comment
        let commentsWithData = data || [];
        if (user && data && data.length > 0) {
            const commentIds = data.map((c: any) => c.id);
            const { data: likes } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .in('comment_id', commentIds)
                .eq('user_id', user.id);

            const likedIds = new Set(likes?.map(l => l.comment_id) || []);

            commentsWithData = data.map((c: any) => ({
                ...c,
                username: c.profiles?.username || 'Unknown',
                avatar_url: c.profiles?.avatar_url,
                user_liked: likedIds.has(c.id),
            }));
        } else if (data) {
            commentsWithData = data.map((c: any) => ({
                ...c,
                username: c.profiles?.username || 'Unknown',
                avatar_url: c.profiles?.avatar_url,
                user_liked: false,
            }));
        }

        return { comments: commentsWithData as PostComment[] };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { comments: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Create a reply to a comment
 */
export async function createCommentReply(
    postId: string,
    parentCommentId: string,
    content: string
): Promise<{
    success: boolean;
    comment?: PostComment;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Posts] Creating comment reply...');

        const { data: comment, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: postId,
                user_id: user.id,
                content,
                parent_comment_id: parentCommentId,
            })
            .select()
            .single();

        if (error || !comment) {
            console.error('🔴 [Posts] Reply error:', error);
            return { success: false, error: 'Không thể tạo reply' };
        }

        console.log('✅ [Posts] Comment reply created');
        return { success: true, comment: comment as PostComment };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Get replies for a comment
 */
export async function getCommentReplies(commentId: string): Promise<{
    replies: PostComment[];
    error?: string;
}> {
    try {
        console.log('🔵 [Posts] Fetching comment replies...');

        const { data: { user } } = await supabase.auth.getUser();

        const { data: replies, error } = await supabase
            .from('post_comments')
            .select(`
                *,
                profiles:user_id (username, avatar_url)
            `)
            .eq('parent_comment_id', commentId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('🔴 [Posts] Fetch replies error:', error);
            return { replies: [], error: 'Không thể tải replies' };
        }

        // Check if user liked each reply
        let repliesWithLikes = replies || [];
        if (user && replies) {
            const replyIds = replies.map(r => r.id);
            const { data: likes } = await supabase
                .from('comment_likes')
                .select('comment_id')
                .in('comment_id', replyIds)
                .eq('user_id', user.id);

            const likedIds = new Set(likes?.map(l => l.comment_id) || []);

            repliesWithLikes = replies.map(reply => ({
                ...reply,
                username: reply.profiles?.username,
                avatar_url: reply.profiles?.avatar_url,
                user_liked: likedIds.has(reply.id),
            }));
        }

        console.log('✅ [Posts] Fetched', repliesWithLikes.length, 'replies');
        return { replies: repliesWithLikes as PostComment[] };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { replies: [], error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Like a comment
 */
export async function likeComment(commentId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Posts] Liking comment...');

        const { error } = await supabase
            .from('comment_likes')
            .insert({
                comment_id: commentId,
                user_id: user.id,
            });

        if (error) {
            // Duplicate like error is OK (already liked)
            if (error.code === '23505') {
                console.log('🟡 [Posts] Already liked');
                return { success: true };
            }
            console.error('🔴 [Posts] Like error:', error);
            return { success: false, error: 'Không thể like comment' };
        }

        console.log('✅ [Posts] Comment liked');
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Unlike a comment
 */
export async function unlikeComment(commentId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        console.log('🔵 [Posts] Unliking comment...');

        const { error } = await supabase
            .from('comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Posts] Unlike error:', error);
            return { success: false, error: 'Không thể unlike comment' };
        }

        console.log('✅ [Posts] Comment unliked');
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}


/**
 * Add comment to post
 */
export async function addComment(postId: string, content: string): Promise<{
    success: boolean;
    comment?: PostComment;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { data, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: postId,
                user_id: user.id,
                content,
            })
            .select(`
                *,
                profiles:user_id (
                    username
                )
            `)
            .single();

        if (error || !data) {
            console.error('🔴 [Posts] Comment error:', error);
            return { success: false, error: 'Không thể thêm bình luận' };
        }

        const comment: PostComment = {
            id: data.id,
            post_id: data.post_id,
            user_id: data.user_id,
            content: data.content,
            created_at: data.created_at,
            updated_at: data.updated_at,
            author_username: (data as any).profiles?.username,
            author_avatar: (data as any).profiles?.avatar_url,
        };

        console.log('✅ [Posts] Comment added:', comment.id);
        return { success: true, comment };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}

/**
 * Delete comment
 */
export async function deleteComment(commentId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const { error } = await supabase
            .from('post_comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', user.id);

        if (error) {
            console.error('🔴 [Posts] Delete comment error:', error);
            return { success: false, error: 'Không thể xóa bình luận' };
        }

        console.log('✅ [Posts] Comment deleted:', commentId);
        return { success: true };
    } catch (err) {
        console.error('🔴 [Posts] Unexpected error:', err);
        return { success: false, error: 'Đã xảy ra lỗi không mong muốn' };
    }
}
