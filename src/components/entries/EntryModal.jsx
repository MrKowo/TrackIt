import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useEntries } from '../../hooks/useEntries';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { formatIsoDate } from '../../lib/utils';
import { Plus, Save, Trash2, Star, StickyNote, AlertCircle, CheckCircle2 } from 'lucide-react';

// --- MAIN COMPONENT ---
export const EntryModal = ({ isOpen, onClose, tracker, initialDate }) => {
    const { user } = useAuth();
    const { entries } = useEntries(tracker?.id);
    const { theme, isAmoled, themeMode } = useTheme();

    const [entryDate, setEntryDate] = useState(initialDate || formatIsoDate(new Date()));
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setEntryDate(initialDate || formatIsoDate(new Date()));
            setEditingId(null);
        }
    }, [isOpen, initialDate]);

    const dailyEntries = useMemo(() => {
        return entries.filter(e => formatIsoDate(e.date) === entryDate).sort((a,b) => b.timestamp - a.timestamp);
    }, [entries, entryDate]);

    const triggerUpdate = async () => {
        await updateDoc(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', tracker.id), { updatedAt: serverTimestamp() });
    };

    const handleSave = async (data) => {
        const payload = { value: data.value, note: data.note, date: entryDate };
        try {
            const ref = collection(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', tracker.id, 'entries');
            if (data.id && data.id !== 'new') await updateDoc(doc(ref, data.id), payload);
            else await addDoc(ref, { ...payload, timestamp: serverTimestamp() });
            
            await triggerUpdate();
            setEditingId(null);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (id !== 'new') {
            await deleteDoc(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', tracker.id, 'entries', id));
            await triggerUpdate();
        }
        setEditingId(null);
    };

    if (!isOpen || !tracker) return null;

    const btnClass = `w-full py-3 rounded-xl font-medium shadow-lg text-white hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 ${theme.primary}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Entries for ${tracker.name}`} isAmoled={isAmoled}>
            <div className="mb-6" style={{ colorScheme: isAmoled ? 'dark' : (themeMode === 'dark' ? 'dark' : 'light') }}>
                <CustomDatePicker value={entryDate} onChange={setEntryDate} theme={theme} isAmoled={isAmoled} className={isAmoled ? 'bg-zinc-900 border-zinc-800 text-white' : undefined} />
            </div>

            <div className="space-y-4">
                {dailyEntries.length === 0 && editingId !== 'new' && (
                    <div className="text-center py-8">
                        <div className={`inline-flex p-4 rounded-full mb-4 ${isAmoled ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                            <AlertCircle className="w-8 h-8 text-zinc-400" />
                        </div>
                        <p className="text-zinc-500 mb-6">No entries for this day.</p>
                        <button onClick={() => setEditingId('new')} className={btnClass}><Plus className="w-5 h-5" /> Log Entry</button>
                    </div>
                )}

                {editingId === 'new' && (
                    <EntryFormRow tracker={tracker} onSave={handleSave} onCancel={() => setEditingId(null)} theme={theme} isAmoled={isAmoled} />
                )}

                {dailyEntries.map(entry => (
                    editingId === entry.id ? (
                        <EntryFormRow key={entry.id} entry={entry} tracker={tracker} onSave={handleSave} onDelete={() => handleDelete(entry.id)} onCancel={() => setEditingId(null)} theme={theme} isAmoled={isAmoled} />
                    ) : (
                        <EntryListItem key={entry.id} entry={entry} tracker={tracker} onClick={() => setEditingId(entry.id)} theme={theme} isAmoled={isAmoled} />
                    )
                ))}

                {dailyEntries.length > 0 && editingId !== 'new' && (
                    <button onClick={() => setEditingId('new')} className={btnClass}><Plus className="w-5 h-5" /> Add Another</button>
                )}
            </div>
        </Modal>
    );
};

// --- SUB-COMPONENT: READ-ONLY LIST ITEM ---
const EntryListItem = ({ entry, tracker, onClick, theme, isAmoled }) => (
    <div onClick={onClick} className={`
        p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-all group
        ${isAmoled ? 'border-zinc-800 bg-black hover:bg-zinc-900' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 shadow-sm hover:shadow-md'}
    `}>
        <div className="flex items-center gap-3 overflow-hidden mr-4">
            {entry.note && <StickyNote className="w-4 h-4 text-zinc-400 shrink-0" />}
            <span className={`truncate text-sm ${entry.note ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 italic'}`}>{entry.note || 'No note'}</span>
        </div>
        <div className={`font-mono font-bold text-lg ${theme.text}`}>
            {tracker.type === 'boolean' ? (entry.value ? 'Completed' : 'Skipped') : entry.value}
            {(tracker.type === 'numeric' || tracker.type === 'percentage') && <span className="text-xs ml-1 text-zinc-400 font-normal">{tracker.unit}</span>}
        </div>
    </div>
);

// --- SUB-COMPONENT: FORM ROW ---
const EntryFormRow = ({ entry = {}, tracker, onSave, onDelete, onCancel, theme, isAmoled }) => {
    const initialVal = entry.value !== undefined ? String(entry.value) : (tracker.type === 'percentage' ? '50' : '');
    const [value, setValue] = useState(initialVal);
    const [note, setNote] = useState(entry.note || '');

    const handleSubmit = () => {
        if (!value && value !== 0 && value !== '0') return;
        let finalValue = parseFloat(value);
        if (tracker.type === 'boolean') finalValue = (value === 'true');
        onSave({ id: entry.id || 'new', value: finalValue, note });
    };

    const inputProps = { value, setValue, theme, isAmoled, tracker };

    // REMOVED ALL SHADOW LOGIC for a flat, clean look
    const containerClasses = isAmoled 
        ? 'bg-black border-zinc-800' 
        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';

    return (
        <div className={`p-5 rounded-xl border animate-in fade-in zoom-in-95 duration-200 ${containerClasses}`}>
            <div className="space-y-4">
                <div>
                    {tracker.type !== 'boolean' && tracker.type !== 'percentage' && (
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-1.5 block">Value</label>
                    )}
                    
                    {/* INPUT STRATEGIES */}
                    {tracker.type === 'percentage' && <PercentageInput {...inputProps} />}
                    {tracker.type === 'numeric' && <NumericInput {...inputProps} />}
                    {tracker.type === 'boolean' && <BooleanInput {...inputProps} />}
                    {tracker.type === 'rating' && <RatingInput {...inputProps} />}
                </div>

                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase mb-1.5"><StickyNote className="w-3 h-3" /> Note</label>
                    <textarea 
                        value={note} 
                        onChange={e => setNote(e.target.value)} 
                        className={`w-full rounded-xl border px-4 py-3 min-h-[80px] resize-none text-sm focus:outline-none focus:ring-2 ${isAmoled ? 'bg-zinc-900 border-zinc-800 placeholder-zinc-600' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 placeholder-zinc-400'} ${theme.ring}`} 
                        placeholder="Add a comment..." 
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    {onDelete && <button onClick={onDelete} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>}
                    <button onClick={onCancel} className="px-5 py-3 text-zinc-500 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={!value && value !== 0 && value !== '0'} className={`px-6 py-3 text-white font-medium rounded-xl shadow-lg active:scale-95 disabled:opacity-50 flex items-center ${theme.primary}`}><Save className="w-4 h-4 mr-2" /> Save</button>
                </div>
            </div>
        </div>
    );
};

// --- SPECIFIC INPUT COMPONENTS ---

const PercentageInput = ({ value, setValue, isAmoled }) => {
    const percentage = parseInt(value) || 0;
    
    // Smooth Gradient from Red (0%) -> Yellow (50%) -> Green (100%)
    const gradient = `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`;

    return (
        <div className="py-2">
            {/* Centered Large Percentage Text */}
            <div className="flex flex-col items-center justify-center mb-6">
                 <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Progress</span>
                 <div className={`text-5xl font-black tracking-tighter tabular-nums ${isAmoled ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                    {percentage}<span className="text-2xl text-zinc-400 ml-0.5">%</span>
                </div>
            </div>

            {/* Custom Range Slider Container */}
            <div className="relative h-10 w-full flex items-center px-2">
                {/* Track */}
                <div className="absolute left-0 right-0 h-4 rounded-full overflow-hidden" style={{ background: gradient }}>
                    <div className="absolute inset-0 shadow-inner bg-black/5"></div>
                </div>

                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={value} 
                    onChange={e => setValue(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                />
                
                {/* Visual Thumb (The Knob) */}
                <div 
                    className="absolute h-9 w-9 bg-white rounded-full shadow-lg border-[3px] border-zinc-100 dark:border-zinc-300 pointer-events-none transition-all duration-75 ease-out z-10"
                    style={{ 
                        left: `calc(${percentage}% + (${8 - percentage * 0.16}px) - 20px)` 
                    }} 
                />
            </div>
        </div>
    );
};

const NumericInput = ({ value, setValue, theme, isAmoled, tracker }) => (
    <div className="relative">
        <input 
            type="number" 
            value={value} 
            onChange={e => setValue(e.target.value)} 
            className={`w-full px-4 py-3 text-lg font-mono font-medium rounded-xl border focus:outline-none focus:ring-2 dark:text-white ${isAmoled ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'} ${theme.ring}`} 
            autoFocus 
            placeholder="0" 
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400 pointer-events-none">{tracker.unit}</span>
    </div>
);

const BooleanInput = ({ value, setValue, isAmoled }) => {
    const isChecked = value === 'true';
    
    // Theme-safe classes for unchecked state
    const uncheckedClasses = isAmoled 
        ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 bg-transparent' 
        : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-transparent';
    
    const checkedClasses = 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400';

    return (
        <button 
            onClick={() => setValue('true')} 
            className={`
                w-full py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all
                ${isChecked ? checkedClasses : uncheckedClasses}
            `}
        >
            <div className={`
                w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all
                ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-current'}
            `}>
                {isChecked && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <span className="text-lg font-bold">
                {isChecked ? 'Completed' : 'Mark as Complete'}
            </span>
        </button>
    );
};

const RatingInput = ({ value, setValue }) => (
    <div className="flex justify-between px-2 py-2">
        {[1,2,3,4,5].map(r => (
            <button key={r} onClick={() => setValue(String(r))} className={`p-1.5 rounded-full transition-all active:scale-90 ${parseInt(value) >= r ? 'scale-110 drop-shadow-md' : 'opacity-30 hover:opacity-100'}`}>
                <Star className={`w-8 h-8 ${parseInt(value) >= r ? 'fill-amber-400 text-amber-400' : 'text-zinc-400 dark:text-zinc-600'}`} />
            </button>
        ))}
    </div>
);