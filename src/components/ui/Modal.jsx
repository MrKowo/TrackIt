import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const Modal = ({ isOpen, onClose, title, children }) => {
  const { isAmoled, theme } = useTheme();

  if (!isOpen) return null;

  // 1. Overlay
  const overlayClass = isAmoled 
    ? 'bg-black/90' 
    : 'bg-zinc-900/60 backdrop-blur-sm';

  // 2. Base Modal Styles
  const modalClass = isAmoled
    ? 'bg-black border border-zinc-800' // Shadow is handled via inline style below
    : 'bg-white dark:bg-zinc-800 shadow-2xl border border-transparent dark:border-zinc-700';

  // 3. Header
  const headerClass = isAmoled
    ? 'border-zinc-800'
    : 'border-zinc-200 dark:border-zinc-700';

  // 4. Dynamic Halo Logic (The Fix)
  // We use the 'chartLine' color from your theme constant because it's a valid Hex Code (e.g. #2563EB)
  const haloStyle = isAmoled 
    ? { boxShadow: `0 0 50px -10px ${theme.chartLine}40` } // 40 = 25% opacity
    : {};

  return (
    <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClass}`} 
        onClick={onClose}
    >
      <div 
        className={`
            w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] rounded-2xl
            animate-in fade-in zoom-in-95 duration-200
            ${modalClass}
        `} 
        style={haloStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 flex justify-between items-center border-b ${headerClass}`}>
          <h2 className="text-xl font-bold dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};