import React, { useState } from 'react';
import { useEntries } from '../../hooks/useEntries';
import { useTheme } from '../../context/ThemeContext';
import { TrackerChart } from '../charts/TrackerChart';
import { TrackerCalendar } from '../charts/TrackerCalendar';
import { StatsSection } from '../charts/StatsSection';
import { EntryModal } from '../entries/EntryModal';
import { BarChart2, Calendar as CalendarIcon, Plus, Edit2, Activity } from 'lucide-react';

export const TrackerDetailView = ({ tracker, onEdit }) => {
    const { entries, loading } = useEntries(tracker?.id);
    const { theme, isAmoled } = useTheme();
    
    const [view, setView] = useState(tracker?.preferredView || 'graph');
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    const handleDateClick = (date) => { setSelectedDate(date); setIsEntryModalOpen(true); };
    const handleAddEntry = () => { setSelectedDate(null); setIsEntryModalOpen(true); };

    if (!tracker) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center h-full">
                <Activity className="w-16 h-16 mb-4 opacity-20" />
                <p className="mb-4">Select a tracker from the list to view details.</p>
            </div>
        );
    }

    // HIGH CONTRAST UPDATE: Header border
    const headerBg = isAmoled 
        ? 'bg-black/80 border-zinc-800' 
        : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-800';
    
    // HIGH CONTRAST UPDATE: Main Card Style
    const cardBg = isAmoled 
        ? 'bg-black border border-zinc-800 shadow-xl shadow-zinc-900/20' 
        : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-md'; 

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            <header className={`p-6 flex justify-between items-center z-10 sticky top-0 backdrop-blur-md border-b ${headerBg}`}>
                <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">{tracker.name}</h2>
                    <button onClick={onEdit} className={`p-1.5 rounded-lg text-zinc-400 transition-colors ${isAmoled ? 'hover:bg-zinc-900 text-zinc-500' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600'}`}><Edit2 className="w-4 h-4" /></button>
                    {tracker.goalDirection === 'target' && tracker.targetValue && (
                        <span className={`hidden sm:inline-block text-xs font-medium text-zinc-600 dark:text-zinc-500 px-2 py-1 rounded-md border ${isAmoled ? 'bg-black border-zinc-800' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-transparent'}`}>Target: {tracker.targetValue} {tracker.unit}</span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <div className={`flex rounded-lg p-1 border ${isAmoled ? 'bg-black border-zinc-800' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent'}`}>
                        <button onClick={() => setView('graph')} className={`p-2 rounded-md transition-all ${view === 'graph' ? `${isAmoled ? 'bg-zinc-900 text-white' : 'bg-white dark:bg-zinc-700 shadow'} ${theme.text}` : 'text-zinc-500'}`}><BarChart2 className="w-5 h-5" /></button>
                        <button onClick={() => setView('calendar')} className={`p-2 rounded-md transition-all ${view === 'calendar' ? `${isAmoled ? 'bg-zinc-900 text-white' : 'bg-white dark:bg-zinc-700 shadow'} ${theme.text}` : 'text-zinc-500'}`}><CalendarIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                <button 
                    onClick={handleAddEntry} 
                    className={`w-full py-3 rounded-xl font-medium shadow-lg text-white transition-transform hover:scale-[1.005] active:scale-[0.99] flex items-center justify-center space-x-2 ${theme.primary}`}
                >
                    <Plus className="w-5 h-5" /><span>Add New Entry</span>
                </button>

                {/* VISUALIZATION CARD */}
                <div className={`p-6 rounded-2xl shadow-lg border min-h-[400px] ${cardBg}`}>
                    <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold dark:text-white">Activity Overview</h3></div>
                    {loading ? <div className="h-80 flex items-center justify-center text-zinc-400">Loading history...</div> : (view === 'graph' ? <TrackerChart entries={entries} tracker={tracker} onDateClick={handleDateClick} /> : <TrackerCalendar entries={entries} tracker={tracker} onDateClick={handleDateClick} />)}
                </div>

                {entries.length > 0 && <StatsSection entries={entries} tracker={tracker} />}
            </div>

            <EntryModal isOpen={isEntryModalOpen} tracker={tracker} initialDate={selectedDate} onClose={() => setIsEntryModalOpen(false)} />
        </div>
    );
};