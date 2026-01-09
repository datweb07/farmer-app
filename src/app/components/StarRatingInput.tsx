import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
    value: number; // 1-5
    onChange: (rating: number) => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function StarRatingInput({ value, onChange, disabled = false, size = 'lg' }: StarRatingInputProps) {
    const [hoverRating, setHoverRating] = useState<number>(0);

    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10',
    };

    const displayRating = hoverRating || value;

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onChange(star)}
                    onMouseEnter={() => !disabled && setHoverRating(star)}
                    onMouseLeave={() => !disabled && setHoverRating(0)}
                    className={`transition-all ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
                        }`}
                >
                    <Star
                        className={`${sizeClasses[size]} transition-colors ${star <= displayRating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 fill-gray-300'
                            }`}
                    />
                </button>
            ))}

            {value > 0 && (
                <span className="ml-2 text-sm text-gray-600 font-medium">
                    {value} sao
                </span>
            )}
        </div>
    );
}
