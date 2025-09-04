import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="col-span-3 bg-gray-800 border-t border-gray-700 text-center py-2">
            <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Image Gallery. All rights reserved.</p>
        </footer>
    );
};

export default Footer;