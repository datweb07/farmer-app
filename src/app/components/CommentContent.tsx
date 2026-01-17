import { useState } from 'react';
import { UserProfileModal } from './UserProfileModal';

interface CommentContentProps {
    content: string;
    isReply?: boolean; // Only parse mentions for replies, not root comments
    parentUsername?: string; // Username of parent comment author (to detect mentions)
}

/**
 * Parse comment content and render mentions as bold, clickable links
 * Only applies to replies that actually contain mentions
 */
export function CommentContent({ content, isReply = false, parentUsername }: CommentContentProps) {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // If not a reply, just show plain text
    if (!isReply) {
        return <p className="text-gray-700 text-sm mb-2">{content}</p>;
    }

    // Check if content actually starts with a mention (first word = parentUsername)
    const firstWord = content.split(' ')[0];
    const hasMention = parentUsername && firstWord === parentUsername;

    // If no mention, show plain text
    if (!hasMention) {
        return <p className="text-gray-700 text-sm mb-2">{content}</p>;
    }

    // Parse mentions - first word is username
    const parseMentions = (text: string) => {
        const parts: Array<{ type: 'text' | 'mention'; value: string }> = [];
        const words = text.split(' ');

        if (words.length > 0) {
            // First word is mention
            const firstWord = words[0];
            if (firstWord && !firstWord.includes('\n')) {
                parts.push({ type: 'mention', value: firstWord });
            }

            // Rest is normal text
            if (words.length > 1) {
                parts.push({ type: 'text', value: words.slice(1).join(' ') });
            }
        }

        return parts;
    };

    const parts = parseMentions(content);

    return (
        <>
            <p className="text-gray-700 text-sm mb-2">
                {parts.map((part, index) => {
                    if (part.type === 'mention') {
                        return (
                            <button
                                key={index}
                                onClick={() => setSelectedUser(part.value)}
                                className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                            >
                                {part.value}
                            </button>
                        );
                    }
                    return <span key={index}> {part.value}</span>;
                })}
            </p>

            {/* User Profile Modal */}
            {selectedUser && (
                <UserProfileModal
                    username={selectedUser}
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </>
    );
}
