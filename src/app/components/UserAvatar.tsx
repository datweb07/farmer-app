// UserAvatar component - displays user avatar with fallback to initials

interface UserAvatarProps {
    avatarUrl?: string | null;
    username?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
};

export function UserAvatar({
    avatarUrl,
    username = 'User',
    size = 'md',
    className = ''
}: UserAvatarProps) {
    const sizeClass = sizeClasses[size];

    // If avatar URL exists, show image
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={username}
                className={`${sizeClass} rounded-full object-cover border-2 border-gray-200 ${className}`}
                onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                        parent.innerHTML = getInitialsAvatar(username, sizeClass, className);
                    }
                }}
            />
        );
    }

    // Fallback to initials
    return getInitialsAvatarElement(username, sizeClass, className);
}

function getInitialsAvatarElement(username: string, sizeClass: string, className: string) {
    const initials = getInitials(username);
    const bgColor = getColorFromString(username);

    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white border-2 border-gray-200 ${className}`}
            style={{ backgroundColor: bgColor }}
        >
            {initials}
        </div>
    );
}

function getInitialsAvatar(username: string, sizeClass: string, className: string): string {
    const initials = getInitials(username);
    const bgColor = getColorFromString(username);

    return `<div class="${sizeClass} rounded-full flex items-center justify-center font-bold text-white border-2 border-gray-200 ${className}" style="background-color: ${bgColor}">${initials}</div>`;
}

function getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function getColorFromString(str: string): string {
    // Generate consistent color from string
    const colors = [
        '#3B82F6', // blue
        '#10B981', // green
        '#F59E0B', // amber
        '#EF4444', // red
        '#8B5CF6', // purple
        '#EC4899', // pink
        '#14B8A6', // teal
        '#F97316', // orange
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
