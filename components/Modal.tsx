
import React, { ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-lighter">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-light hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
            aria-label="Close modal"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Modal;
