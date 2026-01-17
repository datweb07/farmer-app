import { useState } from "react";
import { ChevronLeft, ChevronRight, PlayCircle, Volume2, VolumeX } from "lucide-react";

export interface MediaItem {
    type: 'image' | 'video';
    url: string;
    thumbnail_url?: string; // For videos
    display_order?: number;
}

interface MediaCarouselProps {
    media: MediaItem[];
    className?: string;
    objectFit?: 'cover' | 'contain'; // New prop for controlling image/video fit
}

export function MediaCarousel({ media, className = "", objectFit = 'cover' }: MediaCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);

    if (media.length === 0) return null;

    const currentItem = media[currentIndex];

    if (media.length === 1) {
        return (
            <div className={`w-full ${className}`}>
                {currentItem.type === 'image' ? (
                    <img
                        src={currentItem.url}
                        alt="Post media"
                        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                    />
                ) : (
                    <video
                        src={currentItem.url}
                        controls
                        muted={isMuted}
                        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                        poster={currentItem.thumbnail_url}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={`relative group ${className}`}>
            {/* Current Media */}
            {currentItem.type === 'image' ? (
                <img
                    src={currentItem.url}
                    alt={`Media ${currentIndex + 1}`}
                    className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                />
            ) : (
                <div className="relative w-full h-full">
                    <video
                        key={currentItem.url} // Force re-render when changing videos
                        src={currentItem.url}
                        controls
                        muted={isMuted}
                        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                        poster={currentItem.thumbnail_url}
                    />

                    {/* Mute/Unmute Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                        }}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                    >
                        {isMuted ? (
                            <VolumeX className="w-4 h-4" />
                        ) : (
                            <Volume2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
            )}

            {/* Navigation Buttons */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) =>
                        prev === 0 ? media.length - 1 : prev - 1
                    );
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((prev) =>
                        prev === media.length - 1 ? 0 : prev + 1
                    );
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots Indicator with Video Icon */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {media.map((item, index) => (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(index);
                        }}
                        className={`relative transition-all ${index === currentIndex
                            ? "bg-white w-6 h-2"
                            : "bg-white/50 w-2 h-2"
                            } rounded-full flex items-center justify-center`}
                        title={item.type === 'video' ? 'Video' : 'Image'}
                    >
                        {/* Video indicator */}
                        {item.type === 'video' && index === currentIndex && (
                            <PlayCircle className="w-3 h-3 text-blue-600 absolute" />
                        )}
                    </button>
                ))}
            </div>

            {/* Media Type Badge */}
            {currentItem.type === 'video' && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" />
                    Video
                </div>
            )}
        </div>
    );
}
