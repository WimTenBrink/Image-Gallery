
import React, { useState, useEffect, useRef } from 'react';
import { Image, LogLevel } from '../types';
import * as api from '../services/api';
import { useLogger } from '../hooks/useLogger';

// Intersection Observer hook
const useOnScreen = (ref: React.RefObject<HTMLElement>, rootMargin = '200px'): boolean => {
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIntersecting(true);
                    // Use ref.current in the callback to ensure it's the latest
                    if (ref.current) {
                        observer.unobserve(ref.current);
                    }
                }
            },
            { rootMargin }
        );

        const currentElement = ref.current;
        if (currentElement) {
            observer.observe(currentElement);
        }

        return () => {
            if (currentElement) {
                observer.unobserve(currentElement);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array means this runs once on mount

    return isIntersecting;
};

interface ThumbnailProps {
    image: Image;
    onClick: (image: Image) => void;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ image, onClick }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addLog } = useLogger();

    const ref = useRef<HTMLDivElement>(null);
    const isVisible = useOnScreen(ref);

    useEffect(() => {
        let isActive = true;
        const fetchThumbnail = async () => {
            setLoading(true);
            try {
                const blob = await api.getImageData(image.fullPath, addLog);
                if (isActive) {
                    const url = URL.createObjectURL(blob);
                    setImageUrl(url);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load thumbnail';
                if (isActive) setError(message);
                addLog(LogLevel.WARN, `Failed to fetch thumbnail for ${image.fullPath}`, { error: message });
            } finally {
                if (isActive) setLoading(false);
            }
        };

        if (isVisible && !imageUrl && !error) {
            fetchThumbnail();
        }

        return () => {
            isActive = false;
        };
    }, [isVisible, imageUrl, error, image.fullPath, addLog]);

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [imageUrl]);

    return (
        <div
            ref={ref}
            onClick={() => onClick(image)}
            className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-200 shadow-lg group relative flex items-center justify-center"
            title={image.name}
        >
            {loading && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-secondary"></div>
            )}
            {error && (
                <div className="text-red-400 text-xs text-center p-2">
                    <p>Error loading</p>
                </div>
            )}
            {imageUrl && !error && (
                <img
                    src={imageUrl}
                    alt={image.name}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
            )}
            {!loading && !imageUrl && !error && (
                 <div className="w-full h-full bg-gray-700 opacity-50"></div>
            )}
             <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {image.name}
            </div>
        </div>
    );
};

export default Thumbnail;
