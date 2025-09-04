import React from 'react';
import { SelectedItem, Image } from '../types';

interface RightPanelProps {
    selectedItem: SelectedItem;
}

const InfoRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-700">
        <dt className="text-sm font-medium text-gray-400">{label}</dt>
        <dd className="text-sm text-gray-200 text-right truncate">{String(value)}</dd>
    </div>
);

const RightPanel: React.FC<RightPanelProps> = ({ selectedItem }) => {
    const formatBytes = (bytes?: number, decimals = 2) => {
        if (bytes === undefined || bytes === null || bytes === 0) return 'N/A';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    const renderImageDetails = (image: Image) => {
        const { exif } = image;

        let dateTaken: string | null = null;
        let timeTaken: string | null = null;

        if (exif?.DateTimeOriginal && typeof exif.DateTimeOriginal === 'string') {
            const parts = exif.DateTimeOriginal.split(' ');
            if (parts[0]) {
                dateTaken = parts[0].replace(/:/g, '-');
            }
            if (parts[1]) {
                timeTaken = parts[1];
            }
        }
        
        const exifToDisplay = exif ? { ...exif } : null;
        if (exifToDisplay) {
            delete exifToDisplay.DateTimeOriginal;
        }


        return (
            <div className="p-4">
                <dl>
                    <InfoRow label="Name" value={image.name} />
                    <InfoRow label="Folder Path" value={image.fullPath.substring(0, image.fullPath.lastIndexOf('/')) || '/'} />
                    <InfoRow label="Dimensions" value={(image.width && image.height) ? `${image.width} x ${image.height}` : 'N/A'} />
                    <InfoRow label="Format" value={image.format ?? 'N/A'} />
                    <InfoRow label="File Size" value={formatBytes(image.fileSize)} />
                    {dateTaken && <InfoRow label="Date" value={dateTaken} />}
                    {timeTaken && <InfoRow label="Time" value={timeTaken} />}
                </dl>
                <div className="mt-4">
                    <h3 className="text-md font-semibold text-gray-300 mb-2">Description</h3>
                    <p className="text-sm text-gray-400 bg-gray-700 p-3 rounded-md">
                        {image.description || 'No description available.'}
                    </p>
                </div>
                 {exifToDisplay && Object.keys(exifToDisplay).length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-md font-semibold text-gray-300 mb-2">EXIF Data</h3>
                        <div className="bg-gray-700 p-3 rounded-md max-h-96 overflow-y-auto">
                            <dl>
                                {Object.entries(exifToDisplay).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => (
                                    <div key={key} className="flex justify-between py-1 text-xs border-b border-gray-600 last:border-b-0">
                                        <dt className="font-medium text-gray-400 truncate pr-2">{key}</dt>
                                        <dd className="text-gray-200 text-right break-all">{String(value)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    const renderFolderDetails = (folder: {path: string, images: Image[]}) => (
        <div className="p-4">
            <dl>
                <InfoRow label="Folder Path" value={folder.path} />
                <InfoRow label="Image Count" value={folder.images.length} />
            </dl>
        </div>
    );

    return (
        <aside className="row-start-2 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <h2 className="text-lg font-bold p-4 text-gray-lighter border-b border-gray-700 sticky top-0 bg-gray-800">
                {selectedItem?.type === 'folder' ? 'Folder Details' : 'Image Details'}
            </h2>
            {!selectedItem && (
                <div className="p-4 text-center text-gray-500 mt-10">
                    <p>Select an item to see its details.</p>
                </div>
            )}
            {selectedItem?.type === 'image' && renderImageDetails(selectedItem.data)}
            {selectedItem?.type === 'folder' && renderFolderDetails(selectedItem.data)}
        </aside>
    );
};

export default RightPanel;