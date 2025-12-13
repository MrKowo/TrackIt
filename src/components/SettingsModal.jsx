import React, { useState, useEffect } from 'react';
import { updateProfile, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Modal } from './ui/Modal';
import { DataMigration } from './DataMigration';
import { ACCENT_THEMES, TAG_COLORS } from '../lib/constants';
import { getNextColor } from '../lib/utils';
import { Check, X, Edit2, User, Palette, Moon, LogOut, Link2, Trash2, Camera, Loader2, Image as ImageIcon } from 'lucide-react';

export const SettingsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    // Removed 'setTheme' as it doesn't exist in context; we use updateSettings instead
    const { themeMode, tags, theme, isAmoled, updateSettings, updateTags, setThemeMode } = useTheme();
    
    // UI State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(user?.displayName || '');
    const [showAvatarInput, setShowAvatarInput] = useState(false);
    
    // Tag State
    const [newTag, setNewTag] = useState('');
    const [editingTagId, setEditingTagId] = useState(null);
    const [editTagText, setEditTagText] = useState('');

    // Avatar Logic
    const [tempAvatarUrl, setTempAvatarUrl] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null); 
    const [isSavingAvatar, setIsSavingAvatar] = useState(false);
    
    useEffect(() => {
        if (user) {
            setEditedName(user.displayName || '');
            setAvatarUrl(user.photoURL || null);
        }
    }, [user, isOpen]);

    const handleUpdateName = async () => {
        if (!editedName.trim() || editedName.trim() === user?.displayName) {
            setEditedName(user?.displayName || '');
            setIsEditingName(false);
            return;
        }
        try { 
            await updateProfile(auth.currentUser, { displayName: editedName }); 
            await auth.currentUser.reload();
            setIsEditingName(false); 
        } catch (e) { console.error(e); }
    };

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } 
        else if (e.key === 'Escape') { setEditedName(user?.displayName || ''); setIsEditingName(false); }
    };

    const saveAvatarUrl = async () => { 
        if(!tempAvatarUrl.trim()) return;
        setIsSavingAvatar(true);
        try {
            if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: tempAvatarUrl });
            updateSettings('avatar', tempAvatarUrl);
            setAvatarUrl(tempAvatarUrl);
            setTempAvatarUrl('');
            setShowAvatarInput(false);
        } catch (err) { console.error(err); } finally { setIsSavingAvatar(false); }
    };

    const removeAvatar = async () => {
        try {
            if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: "" });
            updateSettings('avatar', null);
            setAvatarUrl(null);
            setShowAvatarInput(false);
        } catch (err) { console.error(err); }
    };

    const addTag = () => {
        if (!newTag.trim()) return;
        const newTagObject = { id: Date.now(), name: newTag, colorClass: getNextColor(tags).class };
        updateTags([...tags, newTagObject]);
        setNewTag('');
    };

    const removeTag = (id) => updateTags(tags.filter(t => t.id !== id));
    const startEditTag = (tag) => { setEditingTagId(tag.id); setEditTagText(tag.name); };
    const saveEditTag = () => { if (!editTagText.trim()) return; updateTags(tags.map(t => t.id === editingTagId ? { ...t, name: editTagText } : t)); setEditingTagId(null); };
    
    const cycleTagColor = (tagId) => {
        const tag = tags.find(t => t.id === tagId);
        if (!tag) return;
        const currentIndex = TAG_COLORS.findIndex(c => c.class === tag.colorClass);
        const nextIndex = (currentIndex + 1) % TAG_COLORS.length;
        updateTags(tags.map(t => t.id === tagId ? { ...t, colorClass: TAG_COLORS[nextIndex].class } : t));
    };

    // Shared Styles
    const inputBase = `text-sm rounded-lg border outline-none dark:text-white transition-all`;
    const inputTheme = isAmoled 
        ? 'bg-zinc-900 border-zinc-800 focus:border-zinc-700 placeholder-zinc-600' 
        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 placeholder-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-500';
    
    const inputClass = `${inputBase} ${inputTheme} px-3 py-2 w-full`;
    
    const sectionClass = `p-5 rounded-2xl border ${isAmoled ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20'}`;
    const dividerClass = `my-6 border-t ${isAmoled ? 'border-zinc-800' : 'border-zinc-200 dark:border-zinc-700'}`;

    const signOutBtnClass = `
        w-full py-3 mt-4 rounded-xl font-medium transition-all duration-200
        border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400
        ${isAmoled 
            ? 'bg-black hover:bg-zinc-900 hover:shadow-lg hover:shadow-red-900/20' 
            : 'bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-900/10 hover:shadow-md hover:shadow-red-500/10'}
        flex items-center justify-center gap-2
    `;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            
            {/* --- HEADER: PROFILE & AVATAR --- */}
            <div className="flex items-center gap-5 mb-8">
                <div className="relative group">
                    <button 
                        onClick={() => setShowAvatarInput(!showAvatarInput)} 
                        className={`
                            w-20 h-20 rounded-full flex items-center justify-center text-3xl shrink-0 overflow-hidden 
                            transition-all ring-4 ring-offset-2 ring-transparent
                            ${showAvatarInput ? `ring-${theme.primary.split(' ')[0]} ring-offset-zinc-50 dark:ring-offset-zinc-900` : ''}
                            ${isAmoled ? 'bg-zinc-900 ring-offset-black' : 'bg-zinc-100 dark:bg-zinc-700'} 
                        `}
                    >
                         {avatarUrl ? (
                             <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                         ) : (
                             <User className="w-10 h-10 text-zinc-400 group-hover:opacity-50 transition-opacity" />
                         )}
                         
                         {/* Hover Overlay */}
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Camera className="w-6 h-6 text-zinc-700 dark:text-white drop-shadow-md" />
                         </div>
                    </button>
                    
                    {/* Active Indicator */}
                    {showAvatarInput && (
                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-t border-l ${isAmoled ? 'bg-zinc-900 border-zinc-800' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'} z-10`}></div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"> 
                        {isEditingName ? (
                            <input 
                                value={editedName} 
                                onChange={(e) => setEditedName(e.target.value)} 
                                onBlur={handleUpdateName} 
                                onKeyDown={handleNameKeyDown} 
                                className={`bg-transparent text-xl font-bold outline-none border-b-2 w-full p-0 transition-colors ${isAmoled ? 'text-white border-zinc-700 focus:border-zinc-500' : 'text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-700 focus:border-zinc-400'}`} 
                                autoFocus 
                            />
                        ) : (
                            <>
                                <h3 className="font-bold text-xl dark:text-white truncate" title={user?.displayName}>{user?.displayName || 'User'}</h3>
                                <button onClick={() => setIsEditingName(true)} className="p-1.5 rounded-md text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-zinc-500 truncate">{user?.email}</p>
                </div>
            </div>

            {/* --- AVATAR EDIT PANEL --- */}
            {showAvatarInput && (
                <div className={`mb-8 -mt-2 animate-in slide-in-from-top-4 fade-in duration-300 ${sectionClass} shadow-lg`}>
                    <div className="flex items-center gap-2 mb-3 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                        <ImageIcon className="w-4 h-4 text-zinc-400"/>
                        Update Profile Picture
                    </div>
                    
                    <div className="flex gap-0 shadow-sm rounded-xl overflow-hidden">
                        <div className={`pl-3 pr-2 flex items-center border-y border-l rounded-l-xl ${isAmoled ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'}`}>
                            <Link2 className="w-4 h-4 text-zinc-400" />
                        </div>
                        <input 
                            value={tempAvatarUrl} 
                            onChange={(e) => setTempAvatarUrl(e.target.value)} 
                            placeholder="Paste image URL here..." 
                            className={`flex-1 px-3 py-2.5 text-sm outline-none border-y dark:text-white ${isAmoled ? 'bg-zinc-900 border-zinc-800 placeholder-zinc-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 placeholder-zinc-400'}`} 
                            autoFocus
                        />
                        <button 
                            onClick={saveAvatarUrl} 
                            disabled={!tempAvatarUrl.trim() || isSavingAvatar} 
                            className={`px-5 py-2 text-sm font-medium text-white border-y border-r rounded-r-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${theme.primary} border-transparent`}
                        >
                            {isSavingAvatar ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save'}
                        </button>
                    </div>

                    <div className="mt-3 flex justify-between items-center">
                        <p className="text-xs text-zinc-500">Supports JPG, PNG, GIF URLs.</p>
                        {avatarUrl && (
                            <button 
                                onClick={removeAvatar} 
                                className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" /> Remove Picture
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                
                {/* --- APPEARANCE SECTION --- */}
                <div className={sectionClass}>
                    <div>
                         <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Moon className="w-4 h-4 text-zinc-400"/> Theme Mode</h3>
                         <div className={`flex rounded-xl p-1.5 ${isAmoled ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700'}`}>
                             {['light', 'dark', 'amoled'].map(mode => (
                                 <button 
                                    key={mode} 
                                    onClick={() => setThemeMode(mode)} 
                                    className={`
                                        flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                                        ${themeMode === mode 
                                            ? (isAmoled ? 'bg-zinc-800 text-white shadow-md border border-zinc-700' : 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-white') 
                                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}
                                    `}
                                 >
                                     {mode === 'amoled' ? 'True Dark' : mode}
                                 </button>
                             ))}
                         </div>
                    </div>
                    
                    <div className={dividerClass}></div>
                    
                    <div>
                        <h3 className="font-bold mb-4 dark:text-white flex items-center gap-2"><Palette className="w-4 h-4 text-zinc-400"/> Accent Color</h3>
                        <div className="grid grid-cols-6 gap-3">
                            {Object.entries(ACCENT_THEMES).map(([key, thm]) => {
                                const colorClass = thm.primary.split(' ')[0]; 
                                const isSelected = theme.label === thm.label;
                                return (
                                    <button 
                                        key={key} 
                                        onClick={() => updateSettings('theme', key)} 
                                        className={`
                                            h-10 w-10 mx-auto rounded-full ${colorClass} 
                                            transition-all flex items-center justify-center shadow-sm 
                                            ${isSelected ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-800 scale-110' : 'hover:scale-110 hover:shadow-md'}
                                        `} 
                                        title={thm.label}
                                    >
                                        {isSelected && <Check className="w-5 h-5 text-white drop-shadow-sm" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --- TAGS SECTION --- */}
                <div className={sectionClass}>
                    <h3 className="font-bold mb-4 dark:text-white">Manage Tags</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            value={newTag} 
                            onChange={(e) => setNewTag(e.target.value)} 
                            placeholder="New Tag Name" 
                            className={inputClass} 
                            onKeyDown={(e) => e.key === 'Enter' && addTag()} 
                        />
                        <button 
                            onClick={addTag} 
                            disabled={!newTag.trim()} 
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors text-white shadow-md disabled:opacity-50 disabled:shadow-none ${theme.primary}`}
                        >
                            Add
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            editingTagId === tag.id ? (
                                <div key={tag.id} className={`flex items-center gap-1 border rounded-lg p-1 pr-2 animate-in fade-in zoom-in-95 duration-200 ${isAmoled ? 'border-zinc-800 bg-black' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm'}`}>
                                    <input 
                                        value={editTagText} 
                                        onChange={e => setEditTagText(e.target.value)} 
                                        className="w-24 text-sm px-2 outline-none bg-transparent dark:text-white" 
                                        autoFocus 
                                    />
                                    <button onClick={() => cycleTagColor(tag.id)} className={`p-1.5 rounded-full transition-colors ${isAmoled ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}>
                                        <div className={`w-3 h-3 rounded-full ${TAG_COLORS.find(c => c.class === tag.colorClass)?.dot || 'bg-zinc-400'}`} />
                                    </button>
                                    <button onClick={saveEditTag} className="p-1 text-green-500 hover:text-green-600"><Check className="w-3.5 h-3.5"/></button>
                                </div>
                            ) : (
                                <span 
                                    key={tag.id} 
                                    className={`${tag.colorClass} pl-3 pr-2 py-1.5 rounded-full text-xs font-bold flex items-center border cursor-pointer hover:shadow-sm hover:scale-105 transition-all select-none`} 
                                    onClick={() => startEditTag(tag)}
                                >
                                    {tag.name}
                                    <button 
                                        className="ml-2 p-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors" 
                                        onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )
                        ))}
                    </div>
                </div>

                <DataMigration />

                <div className={`pt-4 border-t ${isAmoled ? 'border-zinc-800' : 'border-zinc-200 dark:border-zinc-700'}`}>
                    <button onClick={() => { signOut(auth); onClose(); }} className={signOutBtnClass}>
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </button>
                </div>
            </div>
        </Modal>
    );
};