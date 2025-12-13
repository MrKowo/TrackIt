import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({ value, onChange, options, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const selectedOption = options.find(o => o.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event) => { 
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false); 
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => { onChange({ target: { value: val } }); setIsOpen(false); };

    return (
        <div className={`relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between transition-all">
                <span className="text-sm font-medium dark:text-white truncate">{selectedOption?.label}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto bg-white dark:bg-zinc-800">
                    <div className="p-1.5 space-y-0.5">
                        {options.map((option) => (
                            <button key={option.value} onClick={() => handleSelect(option.value)} className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-colors ${option.value === value ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
                                {option.label}
                                {option.value === value && <Check className="w-3.5 h-3.5 opacity-70" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};