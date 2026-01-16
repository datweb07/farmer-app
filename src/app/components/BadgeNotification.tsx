import React, { useEffect, useState } from 'react';
import type { BadgeProgress } from '../../lib/badges/types';

interface BadgeNotificationProps {
    badge: BadgeProgress | null;
    onClose: () => void;
}

const BadgeNotification: React.FC<BadgeNotificationProps> = ({
    badge,
    onClose,
}) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (badge) {
            setShow(true);
            // Auto close after 5 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [badge]);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for animation to complete
    };

    if (!badge) return null;

    return (
        <div
            className={`
        fixed top-20 right-4 z-50
        transform transition-all duration-300 ease-out
        ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm border-2"
                style={{
                    borderColor: badge.badge_color,
                    boxShadow: `0 10px 40px ${badge.badge_color}40`,
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        🎉 Thành tích mới!
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Badge Display */}
                <div className="flex items-center gap-4 mb-4">
                    {/* Animated Badge Icon */}
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl animate-bounce relative"
                        style={{
                            backgroundColor: badge.badge_color + '20',
                            borderColor: badge.badge_color,
                            borderWidth: '3px',
                            borderStyle: 'solid',
                        }}
                    >
                        <span className="animate-pulse">{badge.badge_icon}</span>

                        {/* Sparkle Effect */}
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-30 animate-spin-slow"></div>
                        </div>
                    </div>

                    {/* Badge Info */}
                    <div className="flex-1">
                        <h4
                            className="text-xl font-bold mb-1"
                            style={{ color: badge.badge_color }}
                        >
                            {badge.badge_name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {badge.badge_description}
                        </p>
                    </div>
                </div>

                {/* Confetti Animation Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full animate-confetti"
                            style={{
                                backgroundColor: badge.badge_color,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random()}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Message */}
                <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    Chúc mừng! Bạn đã đạt được thành tích mới! 🎊
                </p>
            </div>
        </div>
    );
};

export default BadgeNotification;
