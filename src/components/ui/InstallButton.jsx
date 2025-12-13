import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useTheme } from '../../context/ThemeContext';

export const InstallButton = () => {
    const { isInstallable, install } = usePWAInstall();
    const { isAmoled } = useTheme();

    if (!isInstallable) return null; // Hide if already installed or not supported

    return (
        <button 
            onClick={install}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                ${isAmoled 
                    ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'}
            `}
        >
            <div className={`p-2 rounded-lg ${isAmoled ? 'bg-black' : 'bg-white dark:bg-blue-900/30'}`}>
                <Download className="w-4 h-4" />
            </div>
            <div className="text-left">
                <p className="text-sm font-bold">Install App</p>
                <p className="text-[10px] opacity-70">Get the native experience</p>
            </div>
        </button>
    );
};