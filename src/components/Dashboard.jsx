import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useTrackers } from '../hooks/useTrackers';
import { useTheme } from '../context/ThemeContext';
import { TrackerItem } from './trackers/TrackerItem';
import { TrackerDetailView } from './trackers/TrackerDetailView';
import { TrackerModal } from './trackers/TrackerModal';
import { SettingsModal } from './SettingsModal';
import { InstallButton } from './ui/InstallButton'; // <--- NEW IMPORT
import { Plus, Activity, User, Menu, X, Settings, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const { trackers, loading, reorderTrackers } = useTrackers();
  const { theme, isAmoled, themeMode, setThemeMode } = useTheme(); 
  
  const [selectedTrackerId, setSelectedTrackerId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!selectedTrackerId && trackers.length > 0) {
        setSelectedTrackerId(trackers[0].id);
    }
  }, [trackers, selectedTrackerId]);

  const selectedTracker = trackers.find(t => t.id === selectedTrackerId);

  const onDragEnd = (result) => {
      if (!result.destination) return;
      reorderTrackers(result.source.index, result.destination.index);
  };

  const handleSelectTracker = (id) => {
      setSelectedTrackerId(id);
      setIsMobileOpen(false);
  };

  const handleThemeToggle = () => {
      if (themeMode === 'light') {
          const lastDark = localStorage.getItem('lastDarkMode') || 'dark';
          setThemeMode(lastDark);
      } else {
          localStorage.setItem('lastDarkMode', themeMode);
          setThemeMode('light');
      }
  };

  if (loading) return <div className={`h-screen flex items-center justify-center ${isAmoled ? 'bg-black' : 'bg-zinc-50 dark:bg-zinc-900'}`}><div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme.text}`}></div></div>;

  const mainBg = isAmoled 
    ? 'bg-black text-white' 
    : 'bg-zinc-200 dark:bg-zinc-900 text-zinc-900 dark:text-white';
  
  const sidebarBg = isAmoled ? 'bg-black border-zinc-800' : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-800';
  const headerBg = isAmoled ? 'bg-black/80 border-zinc-800' : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-800';

  return (
    <div className={`flex h-screen w-full overflow-hidden relative ${mainBg}`}>
      
      {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
          fixed md:relative top-0 left-0 h-full z-30 w-80 flex flex-col border-r
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarBg}
      `}>
        
        <div className={`p-6 border-b flex items-center justify-between ${isAmoled ? 'border-zinc-800' : 'border-zinc-300 dark:border-zinc-800'}`}>
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${theme.primary}`}>
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold">TrackIt</h1>
            </div>
            <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-zinc-500">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="p-4">
            <button 
                onClick={() => { setIsCreateModalOpen(true); setIsMobileOpen(false); }}
                className={`w-full py-3 text-white rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2 ${theme.primary}`}
            >
                <Plus className="w-5 h-5" /> New Tracker
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
            {trackers.length === 0 ? (
                <div className="text-center py-10 text-zinc-400">
                    <p className="text-sm">No trackers yet.</p>
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="tracker-list">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps} 
                                ref={provided.innerRef}
                                className="space-y-2 pb-2"
                            >
                                {trackers.map((tracker, index) => (
                                    <Draggable key={tracker.id} draggableId={tracker.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                style={{ ...provided.draggableProps.style }}
                                                className="outline-none border-none" 
                                            >
                                                <div 
                                                    {...provided.dragHandleProps} 
                                                    className={`
                                                        group relative rounded-xl transition-all duration-200 ease-out
                                                        ${snapshot.isDragging 
                                                            ? (isAmoled ? 'bg-black shadow-zinc-800' : 'bg-white dark:bg-zinc-800') 
                                                            : 'bg-transparent'} 
                                                        ${snapshot.isDragging ? 'shadow-2xl z-50 scale-[1.02]' : 'shadow-none'}
                                                    `}
                                                >
                                                    <div className="transition-all duration-200">
                                                        <TrackerItem 
                                                            tracker={tracker} 
                                                            onClick={() => handleSelectTracker(tracker.id)} 
                                                            isActive={selectedTrackerId === tracker.id}
                                                            theme={theme}
                                                            isAmoled={isAmoled}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}
        </div>

        {/* --- INSTALL APP BUTTON (Only visible if installable) --- */}
        <div className="px-4 pb-2">
            <InstallButton />
        </div>

        {/* User Settings & Theme Toggle */}
        <div className={`p-4 border-t flex items-center gap-2 ${isAmoled ? 'border-zinc-800' : 'border-zinc-300 dark:border-zinc-600'}`}> 
            
            <button 
                onClick={() => { setIsSettingsOpen(true); setIsMobileOpen(false); }}
                className={`flex-1 flex items-center space-x-3 px-3 py-3 rounded-xl transition-colors text-left group ${isAmoled ? 'hover:bg-zinc-900' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${isAmoled ? 'bg-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-4 h-4 text-zinc-500" />
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isAmoled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{user.displayName || 'User'}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-500">Settings</p>
                </div>

                <Settings className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
            </button>

            <button 
                onClick={handleThemeToggle}
                className={`p-3 rounded-xl transition-colors ${isAmoled ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            >
                {themeMode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
         <div className={`md:hidden p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md border-b ${headerBg}`}>
            <div className="flex items-center gap-2">
                <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 rounded-lg text-zinc-600 dark:text-zinc-300">
                    <Menu className="w-6 h-6" />
                </button>
                <span className="font-bold text-lg">TrackIt</span>
            </div>
         </div>

         <TrackerDetailView 
            tracker={selectedTracker} 
            onEdit={() => setIsEditModalOpen(true)}
         />
      </main>

      <TrackerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} nextOrder={trackers.length} />
      <TrackerModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editTracker={selectedTracker} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};