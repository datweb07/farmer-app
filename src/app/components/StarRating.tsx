import { Star } from 'lucide-react';

interface StarRatingProps {
    rating: number; // 0-5, can be decimal like 4.5
    totalRatings?: number;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
}

export function StarRating({ rating, totalRatings = 0, size = 'md', showCount = true }: StarRatingProps) {
    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const textSizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    const renderStars = () => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <Star
                    key={`full-${i}`}
                    className={`${sizeClasses[size]} text-yellow-500 fill-yellow-500`}
                />
            );
        }

        // Half star
        if (hasHalfStar && fullStars < 5) {
            stars.push(
                <div key="half" className="relative">
                    <Star className={`${sizeClasses[size]} text-gray-300 fill-gray-300`} />
                    <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                        <Star className={`${sizeClasses[size]} text-yellow-500 fill-yellow-500`} />
                    </div>
                </div>
            );
        }

        // Empty stars
        const remainingStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < remainingStars; i++) {
            stars.push(
                <Star
                    key={`empty-${i}`}
                    className={`${sizeClasses[size]} text-gray-300 fill-gray-300`}
                />
            );
        }

        return stars;
    };

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
                {renderStars()}
            </div>

            {showCount && (
                <span className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
                    {rating.toFixed(1)}
                    {totalRatings > 0 && (
                        <span className="text-gray-400 font-normal"> ({totalRatings})</span>
                    )}
                </span>
            )}
        </div>
    );
}
