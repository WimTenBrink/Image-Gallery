import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SelectedItem, LogLevel, Image } from '../types';
import * as api from '../services/api';
import { useLogger } from '../hooks/useLogger';
import { DownloadIcon, LogoIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from './Icons';
import Thumbnail from './Thumbnail';

// Self-contained EXIF-js logic adapted for this project.
const EXIF_TAGS: { [key: number]: string } = {
    0x0100: "ImageWidth", 0x0101: "ImageHeight", 0x0102: "BitsPerSample", 0x0103: "Compression", 0x0106: "PhotometricInterpretation", 0x010E: "ImageDescription",
    0x010F: "Make", 0x0110: "Model", 0x0112: "Orientation", 0x0115: "SamplesPerPixel", 0x011A: "XResolution", 0x011B: "YResolution",
    0x011C: "PlanarConfiguration", 0x0128: "ResolutionUnit", 0x0132: "DateTime", 0x013B: "Artist", 0x8298: "Copyright", 0x8769: "ExifIFDPointer", 0x8825: "GPSInfoIFDPointer",
    0x9000: "ExifVersion", 0x9003: "DateTimeOriginal", 0x9004: "DateTimeDigitized", 0x9201: "ShutterSpeedValue", 0x9202: "ApertureValue", 0x9204: "ExposureTime",
    0x9205: "FNumber", 0x9209: "Flash", 0x920A: "FocalLength", 0x927C: "MakerNote", 0x9286: "UserComment", 0x8827: "ISOSpeedRatings", 0xA001: "ColorSpace",
    0xA002: "PixelXDimension", 0xA003: "PixelYDimension", 0xA402: "ExposureMode", 0xA403: "WhiteBalance", 0xA406: "SceneCaptureType",
};

const GPS_TAGS: { [key: number]: string } = {
    0x0001: "GPSLatitudeRef", 0x0002: "GPSLatitude", 0x0003: "GPSLongitudeRef", 0x0004: "GPSLongitude",
};

function readRational(file: DataView, offset: number, bigEnd: boolean): number {
    const numerator = file.getUint32(offset, !bigEnd);
    const denominator = file.getUint32(offset + 4, !bigEnd);
    if (denominator === 0) return 0;
    return numerator / denominator;
}

function readTags(file: DataView, tiffStart: number, dirStart: number, tags: { [key: number]: string }, bigEnd: boolean): { [key: string]: any } {
    const entries = file.getUint16(dirStart, !bigEnd);
    const result: { [key: string]: any } = {};

    for (let i = 0; i < entries; i++) {
        const entryOffset = dirStart + i * 12 + 2;
        const tagId = file.getUint16(entryOffset, !bigEnd);
        const tagName = tags[tagId];
        if (!tagName) continue;
        
        const format = file.getUint16(entryOffset + 2, !bigEnd);
        const components = file.getUint32(entryOffset + 4, !bigEnd);
        const dataOffset = entryOffset + 8;
        const typeSize = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][format];

        if (!typeSize) continue;

        let value: any;
        const totalSize = components * typeSize;
        const valuePointer = file.getUint32(dataOffset, !bigEnd);
        const valueAddress = totalSize > 4 ? tiffStart + valuePointer : dataOffset;

        if (format === 2) { // ASCII
            let str = "";
            for (let n = 0; n < Math.min(components -1, 100); n++) { // Limit string length
                str += String.fromCharCode(file.getUint8(valueAddress + n));
            }
            value = str.trim();
        } else if (format === 5) { // RATIONAL
            if (components > 1) {
                value = [];
                for (let j = 0; j < components; j++) {
                    value.push(readRational(file, valueAddress + j * 8, bigEnd));
                }
            } else {
                value = readRational(file, valueAddress, bigEnd);
            }
        } else if (components === 1 && totalSize <= 4) { // Other simple types
             if (format === 3) value = file.getUint16(dataOffset, !bigEnd); // short
             if (format === 4) value = file.getUint32(dataOffset, !bigEnd); // long
        } else {
             value = valuePointer; // store pointer for complex types we don't parse
        }
        
        if (value !== undefined) {
           result[tagName] = value;
        }
    }
    return result;
}

function getExifData(arrayBuffer: ArrayBuffer): { [key: string]: any } | null {
    const dataView = new DataView(arrayBuffer);
    if (dataView.getUint8(0) !== 0xFF || dataView.getUint8(1) !== 0xD8) {
        return null; // Not a valid JPEG
    }
    let offset = 2;
    while (offset < dataView.byteLength) {
        if (offset + 4 > dataView.byteLength) break;
        if (dataView.getUint8(offset) !== 0xFF) return null;
        const marker = dataView.getUint8(offset + 1);
        if (marker === 0xE1) { // APP1 marker
            const tiffHeaderOffset = offset + 10;
            if (dataView.getUint32(offset + 4, false) !== 0x45786966) return null; // "Exif"
            
            const bigEnd = dataView.getUint16(tiffHeaderOffset) === 0x4D4D; // II or MM
            const ifdOffset = dataView.getUint32(tiffHeaderOffset + 4, !bigEnd);
            const tags = readTags(dataView, tiffHeaderOffset, tiffHeaderOffset + ifdOffset, EXIF_TAGS, bigEnd);
            
            if (tags.ExifIFDPointer) {
                 const exifTags = readTags(dataView, tiffHeaderOffset, tiffHeaderOffset + tags.ExifIFDPointer, EXIF_TAGS, bigEnd);
                 for (const tag in exifTags) {
                     tags[tag] = exifTags[tag];
                 }
            }
            if (tags.GPSInfoIFDPointer) {
                const gpsTags = readTags(dataView, tiffHeaderOffset, tiffHeaderOffset + tags.GPSInfoIFDPointer, GPS_TAGS, bigEnd);
                 for (const tag in gpsTags) {
                     tags[tag] = gpsTags[tag];
                 }
            }
            
            // Convert GPS to decimal if data is valid
            if (tags.GPSLatitude && tags.GPSLongitude && tags.GPSLatitudeRef && tags.GPSLongitudeRef) {
                try {
                    const lat = tags.GPSLatitude;
                    const lon = tags.GPSLongitude;
                    
                    if (!Array.isArray(lat) || lat.length !== 3 || !Array.isArray(lon) || lon.length !== 3) {
                        throw new Error("GPS data is not in the expected format of [D, M, S]");
                    }
                    if (lat.some(v => typeof v !== 'number') || lon.some(v => typeof v !== 'number')) {
                        throw new Error("GPS coordinate components are not numbers");
                    }

                    const latitude = lat[0] + lat[1] / 60 + lat[2] / 3600;
                    const longitude = lon[0] + lon[1] / 60 + lon[2] / 3600;

                    tags.GPSLatitude = (tags.GPSLatitudeRef.trim() === 'N' ? 1 : -1) * latitude;
                    tags.GPSLongitude = (tags.GPSLongitudeRef.trim() === 'E' ? 1 : -1) * longitude;
                } catch (e) {
                    // Could fail if GPS data is malformed
                    delete tags.GPSLatitude;
                    delete tags.GPSLongitude;
                } finally {
                    delete tags.GPSLatitudeRef;
                    delete tags.GPSLongitudeRef;
                }
            }

            // Clean up and format tags
            delete tags.ExifIFDPointer;
            delete tags.GPSInfoIFDPointer;

            for(const tag in tags) {
                if (typeof tags[tag] === 'number') {
                    tags[tag] = Math.round(tags[tag] * 10000) / 10000;
                }
            }
            
            return Object.keys(tags).length > 0 ? tags : null;
        }
        offset += 2 + dataView.getUint16(offset + 2);
    }
    return null;
}

interface MainPanelProps {
    selectedItem: SelectedItem;
    onSelectItem: (item: SelectedItem) => void;
    onUpdateImageDetails: (imageId: string, details: Partial<Image>) => void;
    imagesByFolder: { [key: string]: Image[] };
    setIsAppBusy: (isBusy: boolean) => void;
}

const MainPanel: React.FC<MainPanelProps> = ({ selectedItem, onSelectItem, onUpdateImageDetails, imagesByFolder, setIsAppBusy }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addLog } = useLogger();
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedItem?.type === 'folder' && mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
    }, [selectedItem]);


    useEffect(() => {
        let isActive = true;
        
        if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
            setImageUrl(null);
        }
        setError(null);

        if (!selectedItem || selectedItem.type !== 'image') {
            setLoading(false);
            return;
        }

        const fetchImage = async (image: Image) => {
            setLoading(true);
            setIsAppBusy(true);
            try {
                addLog(LogLevel.INFO, `Fetching image data for ${image.fullPath}`, {});
                const blob = await api.getImageData(image.fullPath, addLog);
                if (!isActive) return;

                const url = URL.createObjectURL(blob);
                setImageUrl(url);

                const detailsAreKnown = !!(image.width && image.height && image.fileSize && ('exif' in image || (image.format !== 'jpeg' && image.format !== 'jpg')));

                if (!detailsAreKnown) {
                    const detailsToUpdate: Partial<Image> = {};
                    
                    const imageLoadPromise = new Promise<void>(resolve => {
                         if (!image.width || !image.height || !image.fileSize) {
                             const img = document.createElement('img');
                             const tempUrl = URL.createObjectURL(blob);
                             img.onload = () => {
                                 detailsToUpdate.width = img.naturalWidth;
                                 detailsToUpdate.height = img.naturalHeight;
                                 detailsToUpdate.fileSize = blob.size;
                                 URL.revokeObjectURL(tempUrl);
                                 resolve();
                             };
                             img.onerror = () => { URL.revokeObjectURL(tempUrl); resolve(); };
                             img.src = tempUrl;
                         } else {
                             resolve();
                         }
                    });

                    const exifPromise = new Promise<void>(async resolve => {
                        if ((image.format === 'jpeg' || image.format === 'jpg') && !('exif' in image)) {
                            try {
                                const arrayBuffer = await blob.arrayBuffer();
                                const exifData = getExifData(arrayBuffer);
                                detailsToUpdate.exif = exifData ?? undefined; // Store undefined if not found
                            } catch (exifError) {
                                addLog(LogLevel.WARN, 'Could not parse EXIF data', { image: image.fullPath, error: exifError });
                                detailsToUpdate.exif = undefined;
                            }
                        }
                        resolve();
                    });

                    await Promise.all([imageLoadPromise, exifPromise]);
                    
                    if(Object.keys(detailsToUpdate).length > 0) {
                        onUpdateImageDetails(image.id, detailsToUpdate);
                    }
                }

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load image';
                if (isActive) setError(message);
                addLog(LogLevel.ERROR, `Failed to fetch image data for ${image.fullPath}`, { error: message });
            } finally {
                if (isActive) {
                    setLoading(false);
                    setIsAppBusy(false);
                }
            }
        };
        
        fetchImage(selectedItem.data);

        return () => {
            isActive = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItem, addLog, onUpdateImageDetails, setIsAppBusy]);

    const handleThumbnailClick = (image: Image) => {
        onSelectItem({ type: 'image', data: image });
    }

    const handleCloseImageView = useCallback(() => {
        if (selectedItem?.type === 'image') {
            const folderPath = selectedItem.data.fullPath.substring(0, selectedItem.data.fullPath.lastIndexOf('/'));
            const images = imagesByFolder[folderPath];
            if (images) {
                onSelectItem({ type: 'folder', data: { path: folderPath, images } });
            }
        }
    }, [selectedItem, imagesByFolder, onSelectItem]);

    const { imageList, currentIndex } = React.useMemo(() => {
        if (selectedItem?.type !== 'image') {
            return { imageList: null, currentIndex: -1 };
        }
        const folderPath = selectedItem.data.fullPath.substring(0, selectedItem.data.fullPath.lastIndexOf('/'));
        const list = imagesByFolder[folderPath];
        if (!list) return { imageList: null, currentIndex: -1 };
        
        const index = list.findIndex(img => img.id === selectedItem.data.id);
        return { imageList: list, currentIndex: index };
    }, [selectedItem, imagesByFolder]);


    const navigateImage = useCallback((direction: 'next' | 'prev') => {
        if (!imageList || currentIndex === -1) return;

        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % imageList.length;
        } else {
            newIndex = (currentIndex - 1 + imageList.length) % imageList.length;
        }
        
        onSelectItem({ type: 'image', data: imageList[newIndex] });
    }, [imageList, currentIndex, onSelectItem]);

    // Keyboard navigation
    useEffect(() => {
        if (selectedItem?.type !== 'image') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateImage('next');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateImage('prev');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCloseImageView();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedItem, navigateImage, handleCloseImageView]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full text-center text-gray-400">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-secondary"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center text-red-400 p-4 bg-red-900 bg-opacity-30 rounded-lg">
                    <h3 className="font-bold">Error Loading Content</h3>
                    <p className="text-sm">{error}</p>
                </div>
            );
        }

        if (selectedItem?.type === 'folder') {
            const folderPath = selectedItem.data.path;
            const images = imagesByFolder[folderPath];

            if (images === undefined) {
                return (
                    <div className="flex items-center justify-center h-full text-center text-gray-400">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-secondary"></div>
                    </div>
                );
            }

            if (images.length === 0) {
                 return (
                    <div className="text-center text-gray-600">
                        <h2 className="text-2xl font-semibold">Empty Folder</h2>
                        <p>No images found in this folder.</p>
                    </div>
                );
            }
            
            return (
                <div ref={mainContentRef} className="w-full h-full p-4 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {images.map(image => (
                            <Thumbnail
                                key={image.id}
                                image={image}
                                onClick={handleThumbnailClick}
                            />
                        ))}
                    </div>
                </div>
            )
        }

        if (selectedItem?.type === 'image' && imageUrl) {
            const { exif } = selectedItem.data;
            const hasGps = exif && typeof exif.GPSLatitude === 'number' && typeof exif.GPSLongitude === 'number' && (exif.GPSLatitude !== 0 || exif.GPSLongitude !== 0);

            return (
                <div 
                    className="w-full h-full flex flex-col items-center justify-center relative group"
                >
                    {/* Navigation Arrows */}
                    {imageList && imageList.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigateImage('prev'); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-50 text-white p-3 rounded-full hover:bg-brand-secondary transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                title="Previous image (Left arrow)"
                                aria-label="Previous image"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigateImage('next'); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-800 bg-opacity-50 text-white p-3 rounded-full hover:bg-brand-secondary transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                                title="Next image (Right arrow)"
                                aria-label="Next image"
                            >
                                <ChevronRightIcon className="w-6 h-6" />
                            </button>
                        </>
                    )}
                     {hasGps && (
                         <a
                            href={`https://www.google.com/maps?q=${exif.GPSLatitude},${exif.GPSLongitude}`}
                            target="Maps"
                            rel="noopener noreferrer"
                            className="absolute top-4 left-4 bg-gray-800 bg-opacity-70 text-white p-2 rounded-full hover:bg-brand-secondary transition-all opacity-0 group-hover:opacity-100 z-10"
                            title="View location on map"
                            onClick={(e) => e.stopPropagation()}
                         >
                            <MapPinIcon className="w-6 h-6" />
                         </a>
                    )}
                    <img
                        src={imageUrl}
                        alt={selectedItem.data.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                    <p className="mt-4 text-gray-400 text-center">{selectedItem.data.name}</p>
                     <div
                        className="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                        <a
                            href={imageUrl}
                            download={selectedItem.data.name}
                            className="bg-gray-800 bg-opacity-70 text-white p-2 rounded-full hover:bg-brand-secondary transition-all"
                            title="Download image"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DownloadIcon className="w-6 h-6" />
                        </a>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCloseImageView(); }}
                            className="bg-gray-800 bg-opacity-70 text-white p-2 rounded-full hover:bg-red-600 transition-all"
                            title="Close image view (Esc)"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="text-center text-gray-600">
                <LogoIcon className="w-24 h-24 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold">Select an Item</h2>
                <p>Choose a folder or an image from the left panel to display it here.</p>
            </div>
        );
    };

    return (
        <main className={`bg-gray-900 flex items-center justify-center p-4 overflow-hidden h-full`}>
            {renderContent()}
        </main>
    );
};

export default MainPanel;