import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import { getNextColor } from '../../lib/utils';
import { ChevronRight, Trash2, Check, BarChart2, Calendar, Eye, Flame, RefreshCw, Trophy, TrendingUp } from 'lucide-react';

export const TrackerModal = ({ isOpen, onClose, editTracker = null, nextOrder = 0 }) => {
  const { user } = useAuth();
  const { tags, updateTags, theme, isAmoled } = useTheme(); 
  
  const [name, setName] = useState('');
  const [type, setType] = useState('numeric'); 
  const [unit, setUnit] = useState('');
  const [ratingSystem, setRatingSystem] = useState('stars'); 
  const [goalDir, setGoalDir] = useState('increase'); 
  const [targetValue, setTargetValue] = useState('');
  const [goalPeriod, setGoalPeriod] = useState('daily'); // 'daily' or 'longTerm'
  
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [listDisplayValue, setListDisplayValue] = useState('none');
  const [showTypeInList, setShowTypeInList] = useState(false);
  const [showTrendForecast, setShowTrendForecast] = useState(false); // NEW STATE
  const [aggregation, setAggregation] = useState('average');
  const [tolerance, setTolerance] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [enableStreak, setEnableStreak] = useState(true);
  const [preferredView, setPreferredView] = useState('graph');
  const [inlineNewTag, setInlineNewTag] = useState('');
  
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const timeoutRef = useRef(null);
  
  const updateTrackerField = async (field, value) => {
    if (!user || !editTracker) return; 
    try {
        const trackerRef = doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', editTracker.id);
        await updateDoc(trackerRef, { [field]: value, updatedAt: serverTimestamp() });
    } catch (error) {
        console.error(`Error updating field ${field}:`, error);
    }
  };

  useEffect(() => {
    if (isOpen) {
        if (editTracker) {
            setName(editTracker.name); 
            setType(editTracker.type); 
            setUnit(editTracker.unit || ''); 
            setRatingSystem(editTracker.ratingSystem || 'stars'); 
            setGoalDir(editTracker.goalDirection || 'none'); 
            setTargetValue(editTracker.targetValue || '');
            setGoalPeriod(editTracker.goalPeriod || 'daily');

            setListDisplayValue(editTracker.listDisplayValue || 'none'); 
            setShowTypeInList(editTracker.showTypeInList !== undefined ? editTracker.showTypeInList : false);
            setShowTrendForecast(editTracker.showTrendForecast || false); // LOAD FORECAST SETTING
            setAggregation(editTracker.aggregation || 'average'); 
            setTolerance(editTracker.tolerance || '');
            setSelectedTags(editTracker.tags || []); 
            setEnableStreak(editTracker.enableStreak !== undefined ? editTracker.enableStreak : true); 
            setPreferredView(editTracker.preferredView || 'graph'); 
            // setAdvancedOpen(false); // Optional: keep open state independent
        } else {
            setName(''); 
            setType('numeric'); 
            setUnit(''); 
            setRatingSystem('stars'); 
            setGoalDir('increase'); 
            setTargetValue(''); 
            setGoalPeriod('daily');

            setListDisplayValue('none'); 
            setShowTypeInList(false); 
            setShowTrendForecast(false);
            setAggregation('average'); 
            setTolerance(''); 
            setSelectedTags([]); 
            setEnableStreak(true); 
            setPreferredView('graph'); 
            setAdvancedOpen(false);
        }
        setIsAwaitingConfirmation(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [isOpen, editTracker?.id]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const toggleTag = (tag) => {
      if (selectedTags.some(t => t.id === tag.id)) setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
      else setSelectedTags([...selectedTags, tag]);
  };
  
  const handleInlineAddTag = () => {
      if (!inlineNewTag.trim()) return;
      const newTagObject = { id: Date.now(), name: inlineNewTag, colorClass: getNextColor(tags).class };
      updateTags([...tags, newTagObject]);
      setSelectedTags([...selectedTags, newTagObject]);
      setInlineNewTag('');
  };

  // If type becomes 'percentage', force defaults
  useEffect(() => {
    if (type === 'percentage') {
        setUnit('%');
        setGoalDir('target');
        setTargetValue(100);
    }
  }, [type]);
  
  const handleSave = async () => {
    if (!name.trim()) return;
    const trackerData = { 
        name, type, 
        unit: type === 'numeric' ? unit : (type === 'percentage' ? '%' : null), 
        ratingSystem: type === 'rating' ? ratingSystem : null, 
        goalDirection: goalDir, 
        targetValue: goalDir === 'target' && targetValue ? parseFloat(targetValue) : null, 
        goalPeriod, 
        tolerance: tolerance ? parseFloat(tolerance) : 0, 
        tags: selectedTags, 
        listDisplayValue, showTypeInList, aggregation, enableStreak, preferredView, showTrendForecast, 
        updatedAt: serverTimestamp() 
    };

    try {
        if (editTracker) {
            await updateDoc(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', editTracker.id), trackerData);
        } else {
            await addDoc(collection(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers'), { 
                ...trackerData, order: 0, createdAt: serverTimestamp() 
            });
        }
        onClose();
    } catch (error) { console.error("Error saving tracker:", error); }
  };

  const executeDelete = async () => { 
      if(!editTracker) return; 
      try { 
          await deleteDoc(doc(db, 'artifacts', 'default-app-id', 'users', user.uid, 'trackers', editTracker.id)); 
          onClose(); 
      } catch (e) { console.error("Error deleting tracker", e); }
  };

  const handleDeletionAttempt = () => {
      if (!editTracker) return;
      if (isAwaitingConfirmation) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          executeDelete();
      } else {
          setIsAwaitingConfirmation(true);
          timeoutRef.current = setTimeout(() => { setIsAwaitingConfirmation(false); }, 3000);
      }
  };

  const inputClass = `w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isAmoled ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'} ${theme.ring}`;
  const deleteBtnBase = `rounded-xl font-medium transition-all duration-200 flex items-center justify-center border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 ${isAmoled ? 'bg-black hover:bg-zinc-900 hover:shadow-lg hover:shadow-red-900/20' : 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 hover:shadow-md hover:shadow-red-500/10'}`;

  const ToggleRow = ({ label, icon: Icon, value, onChange }) => (
      <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isAmoled ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-700'}`}>
                  <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
          </div>
          <button 
              onClick={() => onChange(!value)} 
              className={`w-12 h-6 rounded-full transition-colors relative ${value ? theme.primary.split(' ')[0] : 'bg-zinc-300 dark:bg-zinc-600'}`}
          >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${value ? 'left-7' : 'left-1'}`} />
          </button>
      </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editTracker ? 'Edit Tracker' : 'New Tracker'} isAmoled={isAmoled}>
          <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label><input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="e.g. Water Intake" /></div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Default View</label>
            <div className="flex gap-4">
                {[{ id: 'graph', label: 'Graph', icon: BarChart2 }, { id: 'calendar', label: 'Calendar', icon: Calendar }].map((option) => {
                    const isActive = preferredView === option.id;
                    let cardClass = isActive 
                        ? (isAmoled ? `border-zinc-500 bg-zinc-900 text-white shadow-md shadow-zinc-900/50` : `border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-400 dark:ring-zinc-500`)
                        : (isAmoled ? `bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300` : `bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800`);
                    
                    return (
                        <button key={option.id} onClick={() => { setPreferredView(option.id); updateTrackerField('preferredView', option.id); }} className={`flex-1 py-4 px-2 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-200 ${cardClass}`}>
                            <option.icon className={`w-8 h-8 ${isActive ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} /><span className="text-sm font-medium">{option.label}</span>
                        </button>
                    )
                })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                 <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                 <CustomSelect value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'numeric', label: 'Numeric' }, { value: 'boolean', label: 'Yes / No' }, { value: 'percentage', label: 'Percentage' }, { value: 'rating', label: 'Rating' }]} theme={theme} isAmoled={isAmoled} disabled={!!editTracker} />
             </div>
             {(type === 'numeric' || type === 'percentage') && (<div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Units</label><input value={unit} onChange={e => setUnit(e.target.value)} className={inputClass} placeholder="e.g. ml" disabled={type === 'percentage'} /></div>)}
             {type === 'rating' && (<div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">System</label><CustomSelect value={ratingSystem} onChange={(e) => setRatingSystem(e.target.value)} options={[{ value: 'stars', label: '5 Stars' }, { value: 'colors', label: 'Traffic Lights' }]} theme={theme} isAmoled={isAmoled} /></div>)}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Goal Direction</label><CustomSelect value={goalDir} onChange={(e) => setGoalDir(e.target.value)} options={[{ value: 'increase', label: 'Increase' }, { value: 'decrease', label: 'Decrease' }, { value: 'target', label: 'Target Value' }, { value: 'none', label: 'None' }]} theme={theme} isAmoled={isAmoled} /></div>
              {goalDir === 'target' && type !== 'boolean' && (<div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Target Value</label><input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} className={inputClass} placeholder="2000" /></div>)}
          </div>

          {/* --- ANIMATED ADVANCED SETTINGS --- */}
          <div className={`border rounded-xl overflow-hidden ${isAmoled ? 'border-zinc-800' : 'border-zinc-200 dark:border-zinc-700'}`}>
             <button onClick={() => setAdvancedOpen(!advancedOpen)} className={`w-full flex justify-between items-center p-4 font-medium transition-colors ${isAmoled ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                Advanced Settings <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${advancedOpen ? 'rotate-90' : ''}`} />
             </button>
             
             <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${advancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className={`p-4 space-y-6 ${isAmoled ? 'bg-black' : 'bg-white dark:bg-zinc-800'}`}>
                        
                        {/* 1. Goal Cadence */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Goal Cadence</label>
                            <div className={`flex rounded-lg p-1 ${isAmoled ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-700'}`}>
                                <button onClick={() => { setGoalPeriod('daily'); updateTrackerField('goalPeriod', 'daily'); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${goalPeriod === 'daily' ? 'bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    <RefreshCw className="w-3.5 h-3.5" /> Daily Reset
                                </button>
                                <button onClick={() => { setGoalPeriod('longTerm'); updateTrackerField('goalPeriod', 'longTerm'); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${goalPeriod === 'longTerm' ? 'bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                    <Trophy className="w-3.5 h-3.5" /> Long Term
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1.5 px-1">
                                {goalPeriod === 'daily' ? 'Goal resets every day. Progress is the sum of daily entries.' : 'Goal is continuous. Progress is compared to the latest entry.'}
                            </p>
                        </div>

                        <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Daily Aggregation</label><div className={`flex rounded-lg p-1 ${isAmoled ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-700'}`}><button onClick={() => { setAggregation('average'); updateTrackerField('aggregation', 'average'); }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${aggregation === 'average' ? 'bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Average</button><button onClick={() => { setAggregation('sum'); updateTrackerField('aggregation', 'sum'); }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${aggregation === 'sum' ? 'bg-white dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Total (Sum)</button></div></div>
                        
                        {type === 'numeric' && goalDir === 'target' && (<div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Goal Tolerance (+/-)</label><input type="number" value={tolerance} onChange={e => setTolerance(e.target.value)} className={inputClass} placeholder="0" /></div>)}
                        
                        <div><div className="flex justify-between items-end mb-3"><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Assign Tags</label></div><div className="flex gap-2 mb-3"><input value={inlineNewTag} onChange={(e) => setInlineNewTag(e.target.value)} placeholder="Create new tag..." className={`flex-1 px-3 py-1.5 text-sm rounded-lg border dark:text-white ${isAmoled ? 'bg-zinc-900 border-zinc-800' : 'dark:bg-zinc-900 dark:border-zinc-700'}`} onKeyDown={(e) => e.key === 'Enter' && handleInlineAddTag()} /><button onClick={handleInlineAddTag} disabled={!inlineNewTag.trim()} className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors dark:text-white ${isAmoled ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200'}`}>Add</button></div><div className="flex flex-wrap gap-2">{tags.map(tag => { const isSelected = selectedTags.some(t => t.id === tag.id); return (<button key={tag.id} onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-sm border transition-all ${tag.colorClass} ${isSelected ? 'opacity-100 font-semibold shadow-sm scale-105' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}>{tag.name}</button>) })}</div></div>
                        
                        <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">List Display Value</label><CustomSelect value={listDisplayValue} onChange={(e) => { setListDisplayValue(e.target.value); updateTrackerField('listDisplayValue', e.target.value); }} options={[{ value: 'none', label: 'None (Hidden)' }, { value: 'last', label: 'Last Inputted Value' }, { value: 'average', label: 'Average of All Entries' }]} theme={theme} isAmoled={isAmoled} /></div>
                        
                        {/* New Toggles Section */}
                        <div className={`p-3 rounded-xl border ${isAmoled ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'}`}>
                            <ToggleRow label="Show Type in Sidebar" icon={Eye} value={showTypeInList} onChange={(val) => { setShowTypeInList(val); updateTrackerField('showTypeInList', val); }} />
                            <div className={`h-px my-1 ${isAmoled ? 'bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                            <ToggleRow label="Track Streak" icon={Flame} value={enableStreak} onChange={(val) => { setEnableStreak(val); updateTrackerField('enableStreak', val); }} />
                            
                            {/* FORECAST TOGGLE (Only if goal exists) */}
                            {goalDir !== 'none' && (
                                <>
                                    <div className={`h-px my-1 ${isAmoled ? 'bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                                    <ToggleRow label="Show Trend Forecast" icon={TrendingUp} value={showTrendForecast} onChange={(val) => { setShowTrendForecast(val); updateTrackerField('showTrendForecast', val); }} />
                                </>
                            )}
                        </div>

                    </div>
                </div>
             </div>
          </div>

          <div className="flex gap-3 pt-4">
             {editTracker && (
                <button onClick={handleDeletionAttempt} className={`px-4 py-3 ${deleteBtnBase} ${isAwaitingConfirmation ? `transform scale-105 active:scale-100 ${isAmoled ? 'shadow-red-900/40' : 'shadow-red-500/20'}` : ''}`} style={{ minWidth: isAwaitingConfirmation ? '140px' : '48px' }}>
                    {isAwaitingConfirmation ? <><Check className="w-5 h-5 mr-2" /><span className="text-sm font-medium">Confirm?</span></> : <Trash2 className="w-5 h-5" />}
                </button>
              )}
            <button onClick={handleSave} disabled={!name.trim()} className={`flex-1 py-3 rounded-xl font-medium shadow-lg text-white transition-all active:scale-95 disabled:opacity-50 ${theme.primary}`}>{editTracker ? 'Save Changes' : 'Create Tracker'}</button>
          </div>
    </Modal>
  );
};