import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Image, LogLevel, SelectedItem, Story, TreeNode } from '../types';
import * as api from '../services/api';
import { useLogger } from '../hooks/useLogger';
import { ChevronRightIcon, ChevronDownIcon, RefreshIcon } from './Icons';
import ReactDOM from 'react-dom';

const blobCache = new Map<string, string>();

const sanitizeId = (id: string) => `left-panel-item-${id.replace(/[\/\s.]/g, '-')}`;

const ImageTooltip: React.FC<{ image: Image; top: number; left: number }> = ({ image, top, left }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(blobCache.get(image.id) || null);
    const [error, setError] = useState(false);
    const { addLog } = useLogger();

    useEffect(() => {
        if (imageUrl) return;

        let isActive = true;
        api.getImageData(image.fullPath, addLog)
            .then(blob => {
                if (isActive) {
                    const url = URL.createObjectURL(blob);
                    blobCache.set(image.id, url);
                    setImageUrl(url);
                }
            })
            .catch(() => {
                if (isActive) setError(true);
            });
        
        return () => { isActive = false; };
    }, [image, addLog, imageUrl]);

    const style: React.CSSProperties = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateY(-50%)',
        zIndex: 1000,
    };

    return ReactDOM.createPortal(
        <div style={style} className="p-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl">
            {error && <div className="w-32 h-32 flex items-center justify-center text-red-500 text-xs">Error</div>}
            {!imageUrl && !error && <div className="w-32 h-32 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-secondary"></div></div>}
            {imageUrl && <img src={imageUrl} alt={image.name} className="w-32 h-32 object-cover rounded" />}
        </div>,
        document.body
    );
};

interface LeftPanelProps {
    onSelectItem: (item: SelectedItem) => void;
    selectedItemId: string | null;
    imagesByFolder: { [key: string]: Image[] };
    loadImagesForFolder: (path: string) => void;
    selectedItem: SelectedItem;
    folderTree: TreeNode | null;
    storyTree: TreeNode | null;
    loading: { folders: boolean; stories: boolean; };
    onRefreshFolders: () => void;
    onRefreshStories: () => void;
}

interface NodeProps {
    node: TreeNode;
    level: number;
    expandedPaths: Set<string>;
    togglePath: (path: string) => void;
    activePath: string | null;
    loadImagesForFolder: (path: string) => void;
    imagesByFolder: { [key: string]: Image[] };
    onSelectItem: (item: SelectedItem) => void;
    selectedItemId: string | null;
    type: 'folder' | 'story';
    handleSelectStory?: (story: Story) => void;
    setTooltip: (tooltip: { image: Image; top: number; left: number; } | null) => void;
    imageRefs: React.MutableRefObject<Map<string, HTMLLIElement | null>>;
    expandedImageLists: Set<string>;
    toggleImageList: (path: string) => void;
}

const Node: React.FC<NodeProps> = ({ 
    node, level, expandedPaths, togglePath, activePath,
    loadImagesForFolder, imagesByFolder, onSelectItem, selectedItemId, type,
    handleSelectStory, setTooltip, imageRefs,
    expandedImageLists, toggleImageList
}) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = Object.keys(node.children).length > 0;
    const isSelectable = node.isSelectable;
    const tooltipTimer = useRef<number | null>(null);

    const isActive = activePath === node.path;
    const isSelectableFolder = isSelectable && type === 'folder';
    const isImageListExpanded = expandedImageLists.has(node.path);
    
    const images = imagesByFolder?.[node.path];
    const hasLoadedImages = images !== undefined;
    const hasImages = hasLoadedImages && images.length > 0;

    const handleSelectNode = () => {
        if (isActive && hasChildren) {
            togglePath(node.path);
            return;
        }

        if (isSelectable) {
            if (type === 'folder') {
                onSelectItem({ type: 'folder', data: { path: node.path, images: images || [] } });
                if (!isExpanded) {
                    togglePath(node.path);
                }
            } else if (type === 'story' && handleSelectStory) {
                const story: Story = { path: node.path, name: node.name };
                handleSelectStory(story);
            }
        } else if (hasChildren) {
            togglePath(node.path);
        }
    };
    
    const handleImageMouseEnter = (e: React.MouseEvent, image: Image) => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        const target = e.currentTarget;
        tooltipTimer.current = window.setTimeout(() => {
            const rect = target.getBoundingClientRect();
            setTooltip({ image, top: rect.top + rect.height / 2, left: rect.right + 10 });
        }, 300);
    };

    const handleImageMouseLeave = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        setTooltip(null);
    };

    const handleToggleImageList = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasLoadedImages) {
            loadImagesForFolder(node.path);
        }
        toggleImageList(node.path);
    };

    return (
        <li
            id={sanitizeId(node.path)}
            className="rounded-md"
        >
            <div
                style={{ paddingLeft: `${level * 1.25}rem` }}
                className={`flex items-center justify-between p-2 rounded-md transition-colors ${isActive ? 'bg-brand-secondary text-white cursor-default' : 'hover:bg-gray-700 cursor-pointer'}`}
                onClick={handleSelectNode}
            >
                <span className="font-semibold text-gray-200 truncate">{node.name}</span>
                <div className="flex items-center space-x-1">
                    {isSelectableFolder && (
                        <button
                            onClick={handleToggleImageList}
                            className="p-1 rounded-full hover:bg-gray-600"
                            aria-label={isImageListExpanded ? "Collapse images" : "Expand images"}
                        >
                            {isImageListExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                    )}
                    {hasChildren && (
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePath(node.path); }}
                            className="p-1 rounded-full hover:bg-gray-600"
                             aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
                        >
                            {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
            {isExpanded && hasChildren && (
                <ul>
                    {Object.values(node.children).sort((a,b) => a.name.localeCompare(b.name)).map(childNode => (
                        <Node 
                            key={childNode.path} 
                            node={childNode} 
                            level={level + 1}
                            {...{ 
                                expandedPaths, togglePath, activePath, loadImagesForFolder, imagesByFolder, 
                                onSelectItem, selectedItemId, type, handleSelectStory, setTooltip, imageRefs, 
                                expandedImageLists, toggleImageList
                            }}
                        />
                    ))}
                </ul>
            )}
            {isImageListExpanded && isSelectableFolder && (
                 !hasLoadedImages ? (
                    <p className="p-2 pl-6 text-sm text-gray-500" style={{ paddingLeft: `${(level + 2) * 1.25}rem` }}>Loading images...</p>
                 ) : hasImages ? (
                    <ul className="bg-gray-900">
                        {images.map(image => {
                            return (
                                <li
                                    key={image.id}
                                    id={sanitizeId(image.id)}
                                    ref={(el) => { imageRefs.current.set(image.id, el); }}
                                    onClick={() => onSelectItem({ type: 'image', data: image })}
                                    onMouseEnter={(e) => handleImageMouseEnter(e, image)}
                                    onMouseLeave={handleImageMouseLeave}
                                    className={`p-2 pl-6 text-sm truncate transition-colors rounded-md ${ selectedItemId === image.id ? 'bg-brand-primary text-white cursor-default' : 'text-gray-300 hover:bg-brand-secondary hover:text-white cursor-pointer' }`}
                                    style={{ paddingLeft: `${(level + 2) * 1.25}rem` }}
                                >
                                    {image.name}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-2 pl-6 text-sm text-gray-500" style={{ paddingLeft: `${(level + 2) * 1.25}rem` }}>No images found.</p>
                )
             )}
        </li>
    );
};

const LeftPanel: React.FC<LeftPanelProps> = ({ 
    onSelectItem, selectedItemId, imagesByFolder, loadImagesForFolder, selectedItem,
    folderTree, storyTree, loading, onRefreshFolders, onRefreshStories
}) => {
    const [activeTab, setActiveTab] = useState<'folders' | 'stories'>('folders');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
    const [expandedImageLists, setExpandedImageLists] = useState<Set<string>>(new Set());
    const [activeStoryPath, setActiveStoryPath] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{image: Image, top: number, left: number} | null>(null);

    const imageRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());
    const { addLog } = useLogger();
    
    const activeFolderPath = selectedItem?.type === 'folder'
        ? selectedItem.data.path
        : selectedItem?.type === 'image'
            ? selectedItem.data.fullPath.substring(0, selectedItem.data.fullPath.lastIndexOf('/'))
            : null;

    useEffect(() => {
        if (selectedItem?.type === 'image') {
            const folderPath = selectedItem.data.fullPath.substring(0, selectedItem.data.fullPath.lastIndexOf('/'));
            const newExpanded = new Set<string>();
            const parts = folderPath.split('/');
            let currentPath = '';
            for (const part of parts) {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                newExpanded.add(currentPath);
            }
            setExpandedFolders(newExpanded);
            setExpandedImageLists(prev => new Set(prev).add(folderPath));
            
        } else if (selectedItem?.type === 'folder') {
            const folderPath = selectedItem.data.path;
            if (!expandedImageLists.has(folderPath)) {
                if (!imagesByFolder[folderPath]) {
                    loadImagesForFolder(folderPath);
                }
                setExpandedImageLists(prev => new Set(prev).add(folderPath));
            }
        }
    }, [selectedItem, imagesByFolder, loadImagesForFolder]);
    
    const toggleFolder = useCallback((path: string) => {
        setExpandedFolders(prev => {
            const isCurrentlyExpanded = prev.has(path);
            const newSet = new Set<string>();
            const parts = path.split('/');
            let currentPath = '';

            if (isCurrentlyExpanded) {
                // Collapse: new set is just the ancestors.
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
                    newSet.add(currentPath);
                }
            } else {
                // Expand: new set is ancestors + path itself.
                for (const part of parts) {
                    currentPath = currentPath ? `${currentPath}/${part}` : part;
                    newSet.add(currentPath);
                }
            }
            return newSet;
        });
    }, []);
    
    const toggleStory = useCallback((path: string) => {
        setExpandedStories(prev => {
            const newSet = new Set(prev);
            newSet.has(path) ? newSet.delete(path) : newSet.add(path);
            return newSet;
        });
    }, []);

    const toggleImageList = useCallback((path: string) => {
        setExpandedImageLists(prev => {
            const newSet = new Set(prev);
            newSet.has(path) ? newSet.delete(path) : newSet.add(path);
            return newSet;
        });
    }, []);
    
    const handleSelectStory = useCallback(async (story: Story) => {
        setActiveStoryPath(story.path);
        addLog(LogLevel.INFO, `Fetching story to open in new tab: ${story.path}`, {});
        try {
            const htmlContent = await api.getStory(story.path, addLog);
            const newWindow = window.open('', 'Story');
            if (newWindow) {
                newWindow.document.open();
                newWindow.document.write(htmlContent);
                newWindow.document.close();
            } else {
                addLog(LogLevel.WARN, 'Failed to open new window. It might be blocked by a popup blocker.', { path: story.path });
                alert('Could not open new window. Please disable your popup blocker for this site.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            addLog(LogLevel.ERROR, `Failed to fetch story content for path: ${story.path}`, { error: message });
        }
    }, [addLog]);

    const renderTree = (tree: TreeNode | null, type: 'folder' | 'story') => {
        if (!tree) return null;
        const props = type === 'folder' ? {
            expandedPaths: expandedFolders,
            togglePath: toggleFolder,
            activePath: activeFolderPath,
            loadImagesForFolder: loadImagesForFolder,
            imagesByFolder: imagesByFolder,
            expandedImageLists: expandedImageLists,
            toggleImageList: toggleImageList,
        } : {
            expandedPaths: expandedStories,
            togglePath: toggleStory,
            activePath: activeStoryPath,
            handleSelectStory: handleSelectStory,
            expandedImageLists: new Set<string>(),
            toggleImageList: () => {},
            loadImagesForFolder: () => {},
            imagesByFolder: {},
        };
        return (
            <ul>
                {Object.values(tree.children).sort((a,b) => a.name.localeCompare(b.name)).map(node => (
                    <Node
                        key={node.path}
                        node={node}
                        level={0}
                        onSelectItem={onSelectItem}
                        selectedItemId={selectedItemId}
                        type={type}
                        setTooltip={setTooltip}
                        imageRefs={imageRefs}
                        {...props}
                    />
                ))}
            </ul>
        );
    }

    return (
        <aside 
            className="row-start-2 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto"
        >
            <div className="flex-shrink-0 border-b border-gray-700">
                <div className="m-2 p-1 bg-gray-900 rounded-lg flex items-center">
                    <nav className="flex-grow flex space-x-1">
                        <button onClick={() => setActiveTab('folders')} className={`w-1/2 p-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'folders' ? 'bg-brand-secondary text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Folders</button>
                        <button onClick={() => setActiveTab('stories')} className={`w-1/2 p-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'stories' ? 'bg-brand-secondary text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Stories</button>
                    </nav>
                    <div className="ml-1 flex-shrink-0">
                        {activeTab === 'folders' && (
                            <button onClick={onRefreshFolders} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title="Refresh folders" disabled={loading.folders}>
                                <RefreshIcon className={`w-5 h-5 text-gray-400 ${loading.folders ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                        {activeTab === 'stories' && (
                            <button onClick={onRefreshStories} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title="Refresh stories" disabled={loading.stories}>
                                <RefreshIcon className={`w-5 h-5 text-gray-400 ${loading.stories ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-2">
                {activeTab === 'folders' && ((loading.folders && !folderTree) ? <p className="p-2 text-gray-400">Loading folders...</p> : renderTree(folderTree, 'folder'))}
                {activeTab === 'stories' && ((loading.stories && !storyTree) ? <p className="p-2 text-gray-400">Loading stories...</p> : renderTree(storyTree, 'story'))}
            </div>
            {tooltip && <ImageTooltip image={tooltip.image} top={tooltip.top} left={tooltip.left} />}
        </aside>
    );
};

export default LeftPanel;