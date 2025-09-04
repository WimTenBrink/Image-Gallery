import React from 'react';
import { LogoIcon, TosIcon, AboutIcon, ConsoleIcon } from './Icons';
import { ModalType } from '../types';

interface HeaderProps {
    onModalOpen: (type: ModalType) => void;
}

const Header: React.FC<HeaderProps> = ({ onModalOpen }) => {
    return (
        <header className="col-span-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-3">
                <LogoIcon className="w-8 h-8 text-brand-secondary" />
                <h1 className="text-2xl font-bold text-white tracking-wider">Image Gallery</h1>
            </div>
            <nav className="flex items-center space-x-2">
                <button onClick={() => onModalOpen('TOS')} className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-light hover:bg-gray-700 hover:text-white transition-colors">
                    <TosIcon className="w-5 h-5" />
                    <span>TOS</span>
                </button>
                <button onClick={() => onModalOpen('ABOUT')} className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-light hover:bg-gray-700 hover:text-white transition-colors">
                    <AboutIcon className="w-5 h-5" />
                    <span>About</span>
                </button>
                <button onClick={() => onModalOpen('CONSOLE')} className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-light hover:bg-gray-700 hover:text-white transition-colors">
                    <ConsoleIcon className="w-5 h-5" />
                    <span>Console</span>
                </button>
            </nav>
        </header>
    );
};

export default Header;