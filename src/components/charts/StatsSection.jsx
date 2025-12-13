import React, { useMemo } from 'react';
import { BarChart2, Target, Flame, Activity } from 'lucide-react';
import { calculateStreakData, formatIsoDate, checkGoalStatus, calculateAggregate, calculateTrendProjection } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export const StatsSection = ({ entries, tracker }) => {
    const { isAmoled } = useTheme();
    
    // 1. Calculate General Stats (Total logs & Unique Active Days)
    const stats = useMemo(() => {
        const totalLogs = entries.length;
        const uniqueDays = new Set(entries.map(e => formatIsoDate(e.date))).size;
        return { totalLogs, uniqueDays };
    }, [entries]);

    const latestEntry = entries.length > 0 ? entries[0] : null;
    
    // 2. Calculate "Current Status Value" based on Goal Period (Daily vs Long Term)
    const currentStatusValue = useMemo(() => {
        if (!entries || entries.length === 0) return null;

        // A. Long Term: Just take the absolute latest value (e.g. Weight)
        if (tracker.goalPeriod === 'longTerm') {
            return entries[0].value;
        }

        // B. Daily Reset: We need to aggregate TODAY'S entries only (e.g. Water)
        const today = formatIsoDate(new Date());
        const todaysEntries = entries.filter(e => formatIsoDate(e.date) === today);
        
        if (todaysEntries.length === 0) return 0; // Reset to 0 if no entries today

        // Use the tracker's aggregation method (Sum vs Average)
        return calculateAggregate(todaysEntries.map(e => e.value), tracker.aggregation || 'average');

    }, [entries, tracker]);

    // 3. Calculate Trend Forecast (if enabled)
    const trendData = useMemo(() => {
        if (!tracker.showTrendForecast) return null;
        return calculateTrendProjection(entries, tracker);
    }, [entries, tracker]);

    const { streak } = useMemo(() => {
        const dates = entries.map(e => formatIsoDate(e.date));
        return calculateStreakData(dates, tracker.enableStreak);
    }, [entries, tracker.enableStreak]);
    
    // 4. Check Goal Status using the Correct Value
    const goalStatus = useMemo(() => {
        if (currentStatusValue === null) return { label: 'No Data', isHit: null };
        return checkGoalStatus(currentStatusValue, tracker, null);
    }, [currentStatusValue, tracker]);

    // Determine Colors
    let goalColorClass = "text-zinc-400"; 
    if (goalStatus.isHit === true) goalColorClass = "text-green-500";
    else if (goalStatus.isHit === false) goalColorClass = "text-red-500";
    else if (tracker.goalDirection !== 'none') goalColorClass = "text-blue-500";

    const cardClass = isAmoled 
        ? "p-4 rounded-xl border border-zinc-800 bg-black" 
        : "p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800";

    const Card = ({ label, value, subtext, icon: Icon, colorClass }) => (
        <div className={cardClass}>
            <p className="text-sm text-zinc-500 mb-1 flex items-center gap-1 font-medium uppercase text-[10px] tracking-wide">
                {Icon && <Icon className={`w-3.5 h-3.5 ${colorClass}`} />}
                {label}
            </p>
            <p className="text-2xl font-bold dark:text-white truncate">{value}</p>
            {subtext && <p className="text-xs text-zinc-400 mt-1">{subtext}</p>}
        </div>
    );

    // Helper to determine Goal Card Subtext
    const getGoalSubtext = () => {
        if (trendData) {
            return `Est. ${trendData.daysLeft} days left (${formatIsoDate(trendData.date)})`;
        }
        if (tracker.goalDirection === 'target') return `Target: ${tracker.targetValue}`;
        return 'Direction';
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-2 duration-500">
            <Card 
                label="Active Days" 
                value={stats.uniqueDays} 
                subtext={`Total entries: ${stats.totalLogs}`}
                icon={BarChart2} 
                colorClass="text-blue-500" 
            />
            
            <Card 
                label={tracker.goalPeriod === 'longTerm' ? "Latest" : "Today"} 
                value={currentStatusValue !== null ? Number(currentStatusValue).toFixed(tracker.type === 'numeric' || tracker.type === 'percentage' ? 1 : 0) : '-'} 
                subtext={tracker.unit ? tracker.unit : 'No unit'} 
                icon={Activity}
                colorClass="text-purple-500"
            />
            
            <Card 
                label="Goal" 
                value={goalStatus.isHit !== null ? goalStatus.label : (tracker.goalDirection === 'none' ? 'No Goal' : tracker.goalDirection)} 
                subtext={getGoalSubtext()} 
                icon={Target} 
                colorClass={goalColorClass} 
            />
            
            <Card 
                label="Streak" 
                value={tracker.enableStreak ? `${streak} Day${streak === 1 ? '' : 's'}` : 'Disabled'} 
                icon={Flame} 
                colorClass="text-amber-500" 
            />
        </div>
    );
};