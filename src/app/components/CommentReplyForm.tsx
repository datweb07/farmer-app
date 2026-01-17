import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { createCommentReply } from '../../lib/community/posts.service';
import type { PostComment } from '../../lib/community/types';

interface CommentReplyFormProps {
    postId: string;
    parentCommentId: string;
    parentUsername: string;
    currentUsername?: string;
    onCancel: () => void;
    onSuccess: (reply: PostComment) => void;
}

export function CommentReplyForm({
    postId,
    parentCommentId,
    parentUsername,
    currentUsername,
    onCancel,
    onSuccess,
}: CommentReplyFormProps) {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Only add mention if not replying to yourself
    const shouldMention = currentUsername !== parentUsername;
    const mentionText = shouldMention ? `${parentUsername} ` : '';

    useEffect(() => {
        setContent(mentionText);

        setTimeout(() => {
            textareaRef.current?.focus();
            if (textareaRef.current) {
                textareaRef.current.selectionStart = mentionText.length;
                textareaRef.current.selectionEnd = mentionText.length;
            }
        }, 10);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedContent = content.trim();
        if (!trimmedContent || trimmedContent === mentionText.trim()) {
            setError('Vui lòng nhập nội dung');
            return;
        }

        setSubmitting(true);
        setError(null);

        const result = await createCommentReply(postId, parentCommentId, trimmedContent);

        setSubmitting(false);

        if (result.success && result.comment) {
            setContent('');
            onSuccess(result.comment);
        } else {
            setError(result.error || 'Không thể gửi reply');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }

        if (e.key === 'Backspace' && textareaRef.current) {
            const cursorPos = textareaRef.current.selectionStart;

            if (cursorPos <= mentionText.length) {
                e.preventDefault();
            }

            if (textareaRef.current.selectionStart !== textareaRef.current.selectionEnd) {
                const value = textareaRef.current.value;
                const selectedText = value.substring(
                    textareaRef.current.selectionStart,
                    textareaRef.current.selectionEnd
                );

                if (value.substring(0, mentionText.length).includes(selectedText)) {
                    e.preventDefault();
                }
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;

        if (value.startsWith(mentionText)) {
            setContent(value);
        } else {
            const newValue = mentionText + value;
            setContent(newValue);

            setTimeout(() => {
                if (textareaRef.current) {
                    const cursorPos = textareaRef.current.selectionStart + mentionText.length;
                    textareaRef.current.selectionStart = cursorPos;
                    textareaRef.current.selectionEnd = cursorPos;
                }
            }, 0);
        }
    };

    return (
        <div className="mt-2 ml-8 bg-white border border-gray-200 rounded-lg p-3">
            <form onSubmit={handleSubmit} className="space-y-2">
                <div className="relative">
                    {/* Textarea với text trong suốt */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:border-blue-600 focus:outline-none resize-none text-sm whitespace-pre-wrap bg-transparent relative z-10 caret-gray-900"
                        style={{
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            lineHeight: '1.5',
                            color: 'transparent',
                        }}
                        rows={2}
                        disabled={submitting}
                    />

                    {/* Overlay hiển thị text với màu sắc đúng */}
                    <div
                        className="absolute top-0 left-0 pointer-events-none select-none px-2 py-1.5 w-full"
                        style={{
                            fontFamily: "'Inter', 'Segoe UI', sans-serif",
                            lineHeight: '1.5',
                            fontSize: '0.875rem',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                        }}
                    >
                        <span className="text-blue-600 font-medium">
                            {content.substring(0, mentionText.length)}
                        </span>
                        <span className="text-gray-900">
                            {content.substring(mentionText.length)}
                        </span>
                    </div>
                </div>

                {error && (
                    <p className="text-red-600 text-xs">{error}</p>
                )}

                <div className="flex items-center gap-1">
                    <button
                        type="submit"
                        disabled={submitting || content.trim() === mentionText.trim()}
                        className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                        {submitting ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Đang gửi...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-3 h-3" />
                                <span>Gửi</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs"
                    >
                        <X className="w-3 h-3" />
                        <span>Hủy</span>
                    </button>
                </div>
            </form>
        </div>
    );
}