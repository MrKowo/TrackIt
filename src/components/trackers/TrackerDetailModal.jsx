import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useEntries } from '../../hooks/useEntries';
import { TrackerChart } from '../charts/TrackerChart';
import { TrackerCalendar } from '../charts/TrackerCalendar';
import { EntryModal } from '../entries/EntryModal';
import { BarChart2, Calendar as CalendarIcon, Plus } from 'lucide-react';

export const TrackerDetailModal = ({ isOpen, onClose, tracker }) => {
    // 1. Fetch data for this specific tracker
    const { entries, loading } = useEntries(tracker?.id);
    const [view, setView] = useState('graph'); // Toggle between Graph and Calendar
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    if (!isOpen || !tracker) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={tracker.name}>
            
            {/* View Toggle (Graph vs Calendar) */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('graph')} 
                        className={`p-2 rounded-md transition-all ${view === 'graph' ? 'bg-white dark:bg-zinc-700 shadow text-blue-600' : 'text-zinc-400'}`}
                    >
                        <BarChart2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setView('calendar')} 
                        className={`p-2 rounded-md transition-all ${view === 'calendar' ? 'bg-white dark:bg-zinc-700 shadow text-blue-600' : 'text-zinc-400'}`}
                    >
                        <CalendarIcon className="w-5 h-5" />
                    </button>
                </div>

                <button 
                    onClick={() => setIsEntryModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
                >
                    <Plus className="w-4 h-4" /> Add Entry
                </button>
            </div>

            {/* The Visualization Area */}
            <div className="min-h-[300px] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-900/50">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-zinc-400">Loading history...</div>
                ) : (
                    view === 'graph' 
                        ? <TrackerChart entries={entries} tracker={tracker} />
                        : <TrackerCalendar entries={entries} tracker={tracker} />
                )}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Total Entries</p>
                    <p className="text-2xl font-bold dark:text-white">{entries.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <p className="text-zinc-500 text-xs uppercase font-bold">Latest Value</p>
                    <p className="text-2xl font-bold dark:text-white">
                        {entries.length > 0 ? entries[0].value : '-'}
                    </p>
                </div>
            </div>

            {/* Hidden Entry Modal - Opens on top of this one */}
            <EntryModal 
                isOpen={isEntryModalOpen} 
                tracker={tracker} 
                onClose={() => setIsEntryModalOpen(false)} 
            />
        </Modal>
    );
};