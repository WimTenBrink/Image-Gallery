import React, { useState, useEffect, useCallback } from 'react';
import { Image, LogLevel, ModalType, SelectedItem, TreeNode } from './types';
import { LoggerProvider, useLogger } from './hooks/useLogger';
import * as api from './services/api';
import Header from './components/Header';
import Footer from './components/Footer';
import LeftPanel from './components/LeftPanel';
import MainPanel from './components/MainPanel';
import RightPanel from './components/RightPanel';
import Modal from './components/Modal';
import Console from './components/Console';
import MarkdownRenderer from './components/MarkdownRenderer';

const buildTree = (paths: string[]): TreeNode => {
    const root: TreeNode = { name: 'root', path: '', isSelectable: false, children: {} };
    const pathSet = new Set(paths);

    paths.forEach(path => {
        if (!path) return;
        const parts = path.split('/');
        let currentNode = root;
        let currentPath = '';

        parts.forEach(part => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!currentNode.children[part]) {
                currentNode.children[part] = {
                    name: part,
                    path: currentPath,
                    isSelectable: false,
                    children: {},
                };
            }
            currentNode = currentNode.children[part];
            if (pathSet.has(currentPath)) {
                currentNode.isSelectable = true;
            }
        });
    });

    return root;
};

const AppContent: React.FC = () => {
    const [isSplashVisible, setIsSplashVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [modalContent, setModalContent] = useState<string>('');
    const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
    const { addLog } = useLogger();
    const [imagesByFolder, setImagesByFolder] = useState<{ [key: string]: Image[] }>({});
    const [isAppBusy, setIsAppBusy] = useState(false);

    const [folderTree, setFolderTree] = useState<TreeNode | null>(null);
    const [storyTree, setStoryTree] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState({ folders: false, stories: false });

    useEffect(() => {
        const fadeTimer = setTimeout(() => {
            setIsFadingOut(true);
        }, 3000);

        const removeTimer = setTimeout(() => {
            setIsSplashVisible(false);
        }, 3500); // 3000ms visible + 500ms fade duration

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, []);

    // Load state from localStorage on initial mount
    useEffect(() => {
        try {
            const savedSelectionJSON = localStorage.getItem('imageGallerySelection');
            if (savedSelectionJSON) {
                const savedSelection = JSON.parse(savedSelectionJSON);
                if (savedSelection && savedSelection.type && savedSelection.path) {
                    addLog(LogLevel.INFO, 'Restoring selection from localStorage', savedSelection);
                    if (savedSelection.type === 'image') {
                        const image: Image = {
                            id: savedSelection.path,
                            name: savedSelection.path.split('/').pop() || savedSelection.path,
                            fullPath: savedSelection.path,
                        };
                        setSelectedItem({ type: 'image', data: image });
                    } else if (savedSelection.type === 'folder') {
                        setSelectedItem({ type: 'folder', data: { path: savedSelection.path, images: [] } });
                    }
                }
            }
        } catch (error) {
            addLog(LogLevel.ERROR, 'Failed to restore selection from localStorage', { error });
            localStorage.removeItem('imageGallerySelection');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save state to localStorage when selection changes
    useEffect(() => {
        if (selectedItem) {
            try {
                const type = selectedItem.type;
                const path = type === 'image' ? selectedItem.data.fullPath : selectedItem.data.path;
                const selectionToSave = { type, path };
                localStorage.setItem('imageGallerySelection', JSON.stringify(selectionToSave));
            } catch (error) {
                addLog(LogLevel.ERROR, 'Failed to save selection to localStorage', { error });
            }
        }
    }, [selectedItem, addLog]);

    const fetchFolderTree = useCallback(async () => {
        setLoading(prev => ({ ...prev, folders: true }));
        try {
            addLog(LogLevel.INFO, 'Fetching folder list...', {});
            const paths = await api.getFolders(addLog);
            setFolderTree(buildTree(paths));
            addLog(LogLevel.INFO, 'Folder list updated.', {});
        } catch (err) {
            addLog(LogLevel.ERROR, 'Failed to fetch folders', { error: err });
        } finally {
            setLoading(prev => ({ ...prev, folders: false }));
        }
    }, [addLog]);

    const fetchStoryTree = useCallback(async () => {
        setLoading(prev => ({ ...prev, stories: true }));
        try {
            addLog(LogLevel.INFO, 'Fetching story list...', {});
            const paths = await api.getStories(addLog);
            setStoryTree(buildTree(paths));
            addLog(LogLevel.INFO, 'Story list updated.', {});
        } catch (err) {
            addLog(LogLevel.ERROR, 'Failed to fetch stories', { error: err });
        } finally {
            setLoading(prev => ({ ...prev, stories: false }));
        }
    }, [addLog]);

    useEffect(() => {
        fetchFolderTree();
        fetchStoryTree();
    }, [fetchFolderTree, fetchStoryTree]);

    const handleRefreshFolders = useCallback(() => {
        setImagesByFolder({});
        setSelectedItem(null);
        localStorage.removeItem('imageGallerySelection');
        fetchFolderTree();
    }, [fetchFolderTree]);

    const handleRefreshStories = useCallback(() => {
        fetchStoryTree();
    }, [fetchStoryTree]);

    useEffect(() => {
        const fetchMarkdown = async (file: string) => {
            setIsModalLoading(true);
            try {
                addLog(LogLevel.INFO, `Fetching markdown: ${file}`, {});
                const response = await fetch(file);
                if (!response.ok) throw new Error(`Failed to load ${file}`);
                const text = await response.text();
                setModalContent(text);
                addLog(LogLevel.INFO, `Successfully fetched ${file}`, {});
            } catch (error) {
                const message = error instanceof Error ? error.message : `Unknown error fetching ${file}`;
                setModalContent(`Error: ${message}`);
                addLog(LogLevel.ERROR, `Failed to fetch ${file}`, { error: message });
            } finally {
                setIsModalLoading(false);
            }
        };

        if (modalType === 'TOS') {
            fetchMarkdown('/TOS.md');
        } else if (modalType === 'ABOUT') {
            fetchMarkdown('/About.md');
        }
    }, [modalType, addLog]);
    
    const loadImagesForFolder = useCallback(async (folderPath: string) => {
        if (imagesByFolder[folderPath]) {
            return;
        }
        setIsAppBusy(true);
        try {
            addLog(LogLevel.INFO, `Fetching images for sidebar view: ${folderPath}`, {});
            const imagePaths = await api.getImages(folderPath, addLog);
            const images: Image[] = imagePaths.map(fullPath => ({
                id: fullPath,
                name: fullPath.split('/').pop() || fullPath,
                fullPath,
                format: fullPath.split('.').pop()?.toLowerCase() || 'unknown',
            }));
            setImagesByFolder(prev => ({ ...prev, [folderPath]: images }));
        } catch (err) {
            addLog(LogLevel.ERROR, `Failed to fetch images for ${folderPath}`, { error: err });
            setImagesByFolder(prev => ({ ...prev, [folderPath]: [] })); // Set empty on error to stop re-fetching
        } finally {
            setIsAppBusy(false);
        }
    }, [imagesByFolder, addLog]);

    const handleSelectItem = useCallback((item: SelectedItem) => {
        setSelectedItem(item);
    }, []);

    // Effect to load data for the selected item
    useEffect(() => {
        if (selectedItem?.type === 'folder' && !imagesByFolder[selectedItem.data.path]) {
            loadImagesForFolder(selectedItem.data.path);
        }
        if (selectedItem) {
            const itemName = selectedItem.type === 'image' ? selectedItem.data.name : selectedItem.data.path;
            addLog(LogLevel.INFO, `Selected ${selectedItem.type}: ${itemName}`, { item: selectedItem });
        }
    }, [selectedItem, imagesByFolder, loadImagesForFolder, addLog]);

    const findFirstSelectablePath = useCallback((node: TreeNode): string | null => {
        if (node.isSelectable) {
            return node.path;
        }
        // Ensure consistent ordering for default selection
        const sortedChildren = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));
        for (const child of sortedChildren) {
            const foundPath = findFirstSelectablePath(child);
            if (foundPath) return foundPath;
        }
        return null;
    }, []);

    // Default selection logic
    useEffect(() => {
        const wasStateRestored = !!localStorage.getItem('imageGallerySelection');

        if (!wasStateRestored && !selectedItem && folderTree) {
            addLog(LogLevel.INFO, 'No saved state, selecting first folder by default.', {});
            const firstPath = findFirstSelectablePath(folderTree);
            if (firstPath) {
                handleSelectItem({ type: 'folder', data: { path: firstPath, images: [] } });
            }
        }
    }, [folderTree, selectedItem, findFirstSelectablePath, handleSelectItem, addLog]);

    const handleUpdateImageDetails = useCallback((imageId: string, details: Partial<Image>) => {
        const folderPath = imageId.substring(0, imageId.lastIndexOf('/'));
        setImagesByFolder(prev => {
            const folderImages = prev[folderPath];
            if (!folderImages) return prev;

            const newImages = folderImages.map(img => 
                img.id === imageId ? { ...img, ...details } : img
            );
            return { ...prev, [folderPath]: newImages };
        });

        // Also update the selected item if it's the one being detailed
        setSelectedItem(prev => {
            if (prev?.type === 'image' && prev.data.id === imageId) {
                return { ...prev, data: { ...prev.data, ...details } };
            }
            return prev;
        });
    }, []);


    const renderModalContent = () => {
        if (isModalLoading) return <div className="text-white">Loading...</div>;

        switch (modalType) {
            case 'TOS':
            case 'ABOUT':
                return <MarkdownRenderer content={modalContent} />;
            case 'CONSOLE':
                return <Console />;
            default:
                return null;
        }
    };
    
    const getModalTitle = () => {
        switch(modalType) {
            case 'TOS': return 'Terms of Service';
            case 'ABOUT': return 'About Image Gallery';
            case 'CONSOLE': return 'Application Console';
            default: return '';
        }
    }
    
    const selectedItemId = selectedItem
      ? selectedItem.type === 'image'
        ? selectedItem.data.id
        : selectedItem.data.path
      : null;

    if (isSplashVisible) {
        return (
            <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-dark transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
                <img src="https://barefootmoments.org/splash.jpg" alt="Image Gallery" className="max-w-full max-h-full object-contain" />
            </div>
        );
    }

    return (
        <div className={`grid grid-rows-[auto_1fr_auto] grid-cols-[350px_1fr_350px] h-screen bg-gray-900 text-white font-sans ${isAppBusy ? 'cursor-wait' : ''}`}>
            <Header onModalOpen={setModalType} />
            <LeftPanel 
                onSelectItem={handleSelectItem} 
                selectedItemId={selectedItemId}
                imagesByFolder={imagesByFolder}
                loadImagesForFolder={loadImagesForFolder}
                selectedItem={selectedItem}
                folderTree={folderTree}
                storyTree={storyTree}
                loading={loading}
                onRefreshFolders={handleRefreshFolders}
                onRefreshStories={handleRefreshStories}
            />
            
            <div className="row-start-2 col-start-2 h-full overflow-hidden">
                <MainPanel 
                    selectedItem={selectedItem} 
                    onSelectItem={handleSelectItem}
                    onUpdateImageDetails={handleUpdateImageDetails} 
                    imagesByFolder={imagesByFolder}
                    setIsAppBusy={setIsAppBusy}
                />
            </div>

            <RightPanel selectedItem={selectedItem} />
            
            <Footer />
            
            {modalType && (
                <Modal title={getModalTitle()} onClose={() => setModalType(null)}>
                    {renderModalContent()}
                </Modal>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <LoggerProvider>
            <AppContent />
        </LoggerProvider>
    );
};

export default App;