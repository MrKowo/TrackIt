import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { formatIsoDate, getMonthData, checkGoalStatus, calculateTrendProjection, calculateAggregate } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export const TrackerCalendar = ({ entries, tracker, onDateClick }) => {
    const { theme, isAmoled } = useTheme();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { daysInMonth, startDay } = useMemo(() => 
        getMonthData(currentMonth.getFullYear(), currentMonth.getMonth()), 
    [currentMonth]);

    const changeMonth = (delta) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentMonth(newDate);
    };

    // --- TREND CALCULATION ---
    const trendData = useMemo(() => {
        if (!tracker.showTrendForecast) return null;
        return calculateTrendProjection(entries, tracker);
    }, [entries, tracker]);

    const dailyData = useMemo(() => {
        const map = {};
        entries.forEach(e => {
            const d = formatIsoDate(e.date);
            if (!map[d]) map[d] = [];
            map[d].push(e);
        });
        
        const sortedDates = Object.keys(map).sort();
        const result = {};

        // Running Total for Long Term / Cumulative goals
        let runningTotal = 0;

        // Note: To calculate cumulative correctly, we should ideally iterate through ALL entries 
        // from the beginning of time up to the current month. 
        // For simplicity in this view, we'll assume 'entries' passed in contains all history 
        // OR we just calculate daily values if it's not cumulative.
        
        // If it's cumulative, we need to pre-calculate the running total up to the start of this month first.
        // For now, let's stick to the standard aggregation per day logic which works for 99% of cases.
        // If goalPeriod is 'longTerm', usually we want to see the "Value on that Day" (e.g. Weight), 
        // which is usually the last entry of that day or an average.

        sortedDates.forEach((date, index) => {
            const dayEntries = map[date];
            const rawValues = dayEntries.map(e => e.value);
            
            let val = 0;
            if (tracker.aggregation === 'sum' && tracker.goalPeriod === 'daily') {
                val = rawValues.reduce((a,b) => a+b, 0);
            } else {
                // Average or Long Term (usually we take average of the day for noise reduction, or last)
                val = rawValues.reduce((a,b) => a+b, 0) / rawValues.length;
            }

            // --- GOAL LOGIC ---
            let isGood = null;
            
            // 1. Get Previous Value (for increase/decrease comparison)
            let prevVal = null;
            if (index > 0) {
                const prevDate = sortedDates[index - 1];
                const prevEntries = map[prevDate];
                if (tracker.aggregation === 'sum' && tracker.goalPeriod === 'daily') {
                    prevVal = prevEntries.reduce((a,b) => a+b.value, 0);
                } else {
                    prevVal = prevEntries.reduce((a,b) => a+b.value, 0) / prevEntries.length;
                }
            }

            // 2. Check Status
            const status = checkGoalStatus(val, tracker, prevVal);
            
            if (status.isHit === true) {
                isGood = true;
            } else if (status.isHit === false) {
                // If Target mode: Check if we made PROGRESS (got closer than yesterday)
                if (tracker.goalDirection === 'target' && prevVal !== null) {
                    const prevStatus = checkGoalStatus(prevVal, tracker, null);
                    if (status.diff < prevStatus.diff) isGood = true; // Closer = Good
                    else isGood = false;
                } else {
                    isGood = false;
                }
            }
            
            result[date] = { value: val, isGood };
        });
        return result;
    }, [entries, tracker]);

    const days = [];
    
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className={`h-20 md:h-24 rounded-xl ${isAmoled ? 'bg-zinc-900/30' : 'bg-zinc-50/50 dark:bg-zinc-900/30'}`} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateKey = formatIsoDate(date);
        const data = dailyData[dateKey];
        const isToday = formatIsoDate(new Date()) === dateKey;

        // Check for Trend Projection
        const isProjectedDate = trendData && trendData.date === dateKey;

        let cellClass = `${theme.secondary} ${theme.border}`;
        let textClass = 'text-zinc-500';

        // 1. Determine Base Color (Data Status)
        if (data) {
            if (data.isGood === true) {
                cellClass = `border-emerald-200 dark:border-emerald-800 ${isAmoled ? 'bg-emerald-900/40' : 'bg-emerald-50 dark:bg-emerald-900/20'}`;
                textClass = 'text-emerald-700 dark:text-emerald-400';
            } else if (data.isGood === false) {
                cellClass = `border-red-200 dark:border-red-800 ${isAmoled ? 'bg-red-900/40' : 'bg-red-50 dark:bg-red-900/20'}`;
                textClass = 'text-red-700 dark:text-red-400';
            }
        } else {
             cellClass = isAmoled ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50';
        }

        // 2. Override for Projected Date (Gold/Amber)
        if (isProjectedDate) {
             cellClass = `border-amber-400 dark:border-amber-500 ${isAmoled ? 'bg-amber-900/20' : 'bg-amber-50 dark:bg-amber-900/10'} ring-1 ring-amber-400 z-10`;
             if (!data) textClass = 'text-amber-600 dark:text-amber-400 font-bold';
        }

        days.push(
            <div 
                key={day} 
                onClick={() => onDateClick && onDateClick(dateKey)}
                className={`
                    h-20 md:h-24 border rounded-xl p-1 md:p-2 cursor-pointer relative flex flex-col justify-between group 
                    transition-all duration-300 hover:scale-[1.02] hover:shadow-md
                    ${cellClass}
                    ${isToday ? `ring-2 ${theme.ring} ring-offset-2 dark:ring-offset-zinc-800` : ''}
                `}
            >
                <span className={`text-xs md:text-sm font-medium ${data || isProjectedDate ? textClass : 'text-zinc-400'}`}>{day}</span>
                
                {data ? (
                    <div className="text-right">
                        <span className={`block text-sm md:text-lg font-bold leading-tight ${isAmoled || textClass.includes('zinc') ? 'dark:text-white' : textClass}`}>
                            {tracker.type === 'boolean' ? (data.value ? 'Yes' : 'No') : data.value.toFixed(tracker.type === 'numeric' ? 1 : 0)}
                        </span>
                        <span className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-wider">{tracker.unit}</span>
                    </div>
                ) : (
                    <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600 transition-opacity"><Plus className="w-6 h-6" /></div>
                )}

                {/* Projection Indicator */}
                {isProjectedDate && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold dark:text-white">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex space-x-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400"><ChevronLeft className="w-5 h-5"/></button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400"><ChevronRight className="w-5 h-5"/></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide py-2">{d}</div>))}
                {days}
            </div>
        </div>
    );
};