import React from 'react';
import { Flame } from 'lucide-react'; 
import { formatDate } from '../../lib/utils'; 

export const TrackerItem = ({ tracker, isActive, theme, isAmoled, onClick }) => { 
  
    // Display Value Logic (Last / Average)
    const displayValue = tracker.listDisplayValue || 'none';
    let valueToDisplay = null;
    let valueLabel = null;

    if (displayValue === 'last' && tracker.lastValue !== undefined && tracker.lastValue !== null) {
        valueToDisplay = tracker.lastValue;
        valueLabel = 'Last';
    } else if (displayValue === 'average' && tracker.averageValue !== undefined && tracker.averageValue !== null) {
        valueToDisplay = tracker.averageValue;
        valueLabel = 'Avg';
    }

    // Streak Logic
    const isStreakActive = tracker.enableStreak && tracker.streak > 0;
    const streakColorClass = isStreakActive 
        ? "text-orange-500 dark:text-orange-400" 
        : "text-zinc-400 dark:text-zinc-600";

    // Styling Logic
    let containerClasses = "";
    let textClasses = "";
    let badgeClasses = "";
    
    if (isActive && theme) {
        // ACTIVE STATE
        if (isAmoled) {
            containerClasses = `bg-black ${theme.border} shadow-lg shadow-zinc-900/40 border`; 
            textClasses = theme.activeNavText;
            badgeClasses = "bg-zinc-900 border border-zinc-800 text-zinc-300";
        } else {
            // HIGH CONTRAST UPDATE: Explicit border
            containerClasses = `${theme.activeNav} border border-transparent shadow-sm`;
            textClasses = theme.activeNavText;
            badgeClasses = "bg-white/50 dark:bg-black/20 text-current";
        }
    } else {
        // INACTIVE STATE
        if (isAmoled) {
            containerClasses = "bg-black border border-zinc-800 hover:border-zinc-700";
            textClasses = "text-zinc-300";
            badgeClasses = "bg-zinc-900 border border-zinc-800 text-zinc-400";
        } else {
            // HIGH CONTRAST UPDATE: Darker border (300), darker text (900), darker hover shadow
            containerClasses = "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-sm hover:shadow-md";
            textClasses = "text-zinc-900 dark:text-zinc-300";
            // HIGH CONTRAST UPDATE: Darker badge background (200)
            badgeClasses = "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300";
        }
    }

    return (
        <div 
            onClick={onClick}
            className={`p-3 rounded-xl relative flex justify-between items-center transition-all duration-200 cursor-pointer select-none ${containerClasses}`}
        >
            {/* Left: Name & Tags */}
            <div className="flex-1 min-w-0 mr-4">
                <h3 className={`font-bold truncate text-sm ${textClasses}`}>
                    {tracker.name}
                </h3>
                
                <div className="flex flex-wrap gap-2 mt-1">
                    {tracker.showTypeInList !== false && (
                        <span className="text-[10px] text-zinc-500 capitalize">
                            {tracker.type}
                        </span>
                    )}
                    {tracker.tags && tracker.tags.map((tag, idx) => (
                        <span key={idx} className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border opacity-80 ${tag.colorClass}`}>
                            {tag.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Right: Values & Streak */}
            <div className="flex flex-col items-end gap-1">
                
                {/* 1. List Display Value */}
                {valueToDisplay !== null && (
                    <div className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium ${badgeClasses}`}>
                        <span className="opacity-70 mr-1">{valueLabel}:</span>
                        {typeof valueToDisplay === 'number' ? valueToDisplay.toFixed(1) : valueToDisplay}
                    </div>
                )}

                {/* 2. Simplified Streak Display */}
                {(tracker.enableStreak && tracker.lastDate) && (
                    <div className={`flex items-center text-[10px] font-medium transition-colors duration-300 ${streakColorClass}`}>
                        <Flame className={`w-3 h-3 mr-1 ${isStreakActive ? 'fill-current' : 'fill-none'}`} />
                        <span>{tracker.streak || 0}</span>
                    </div>
                )}
            </div>
        </div>
    );
};