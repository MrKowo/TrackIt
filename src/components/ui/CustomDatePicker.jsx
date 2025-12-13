import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatIsoDate, getMonthData } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext'; // Import Theme Context

export const CustomDatePicker = ({ value, onChange }) => {
    const { theme, isAmoled } = useTheme(); // Get theme values
    
    // Initialize with the passed value or today
    const [currentMonth, setCurrentMonth] = useState(() => {
        return value ? new Date(value) : new Date();
    });

    // Update internal state if the prop changes externally
    useEffect(() => {
        if(value) setCurrentMonth(new Date(value));
    }, [value]);

    const { daysInMonth, startDay } = useMemo(() => 
        getMonthData(currentMonth.getFullYear(), currentMonth.getMonth()), 
    [currentMonth]);
    
    const changeMonth = (delta, e) => {
        e.preventDefault();
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentMonth(newDate);
    };

    const days = [];
    // Empty slots
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-8 md:h-9" />);
    }

    // Actual Days
    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = formatIsoDate(d);
        const isSelected = dateString === value;
        
        days.push(
            <button 
                key={day} 
                onClick={(e) => { e.preventDefault(); onChange(dateString); }} 
                className={`
                    h-8 md:h-9 w-full rounded-lg text-sm font-medium transition-all active:scale-95 
                    ${isSelected 
                        ? `${theme.primary} shadow-md text-white` // Selected: Use Theme Primary
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }
                `}
            >
                {day}
            </button>
        );
    }

    return (
        <div className={`border rounded-xl p-4 transition-colors ${isAmoled ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50'}`}>
            <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-zinc-800 dark:text-white">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex space-x-1">
                    <button onClick={(e) => changeMonth(-1, e)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-500"><ChevronLeft className="w-4 h-4"/></button>
                    <button onClick={(e) => changeMonth(1, e)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-500"><ChevronRight className="w-4 h-4"/></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-zinc-400 mb-1">{d}</div>
                ))}
                {days}
            </div>
        </div>
    );
};